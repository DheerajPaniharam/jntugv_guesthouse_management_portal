
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('../../db');
const { protect } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { sendResetEmail, sendOtpEmail } = require('../utils/mailer');
const storageUtils = require('../utils/storage');

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return 'local-development-only-secret';
  }
  throw new Error('JWT_SECRET environment variable is required in production.');
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const isProduction = () => process.env.NODE_ENV === 'production';

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = await sequelize.models.User.findOne({
      where: {
        [Op.or]: [{ email: login }, { name: login }]
      }
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const jwtSecret = getJwtSecret();
      const token = jwt.sign({ id: user.id, role: user.role, isVerified: user.isVerified }, jwtSecret, { expiresIn: '8h' });
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          contactNumber: user.contactNumber,
          isVerified: user.isVerified
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid institutional credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot Password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await sequelize.models.User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'No account associated with this email node.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetToken = hashedToken;
    user.resetTokenExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    try {
      await sendResetEmail(user.email, resetToken, 'University');
      res.json({ message: 'Recovery link dispatched to your email node.' });
    } catch (mailErr) {
      user.resetToken = null;
      user.resetTokenExpires = null;
      await user.save();
      res.status(500).json({ message: 'Mailing subsystem error. Contact admin.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset Password
router.post('/reset-password/:token', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await sequelize.models.User.findOne({
      where: {
        resetToken: hashedToken,
        resetTokenExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Recovery token is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ message: 'Access key reset successful. You may now sign in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Password Update
router.put('/password/:userId', protect, authLimiter, async (req, res) => {
  try {
    const { currentPass, newPass } = req.body;
    const user = await sequelize.models.User.findByPk(req.params.userId);

    if (user && (await bcrypt.compare(currentPass, user.password))) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPass, salt);
      await user.save();
      res.json({ success: true });
    } else {
      res.status(400).json({ message: 'Current password verification failed.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registration
router.post('/register', authLimiter, upload.single('idProof'), async (req, res) => {
  try {
    const { name, email, password, role, contactNumber } = req.body;
    const userExists = await sequelize.models.User.findOne({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'Email node already registered.' });

    let idProofPath = null;
    if (req.file) {
      const saved = await storageUtils.saveFile({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype
      });
      idProofPath = saved.url;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role || 'Student';
    const isVerified = userRole !== 'Staff'; // Staff requires manual clearance

    const user = await sequelize.models.User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole,
      contactNumber,
      idProof: idProofPath,
      isVerified
    });

    const jwtSecret = getJwtSecret();
    const token = jwt.sign({ id: user.id, role: user.role, isVerified: user.isVerified }, jwtSecret, { expiresIn: '8h' });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactNumber: user.contactNumber,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET Pending Staff for Verification (Admin / Staff Clearance)
router.get('/pending-staff', protect, async (req, res) => {
  try {
    const pendingStaff = await sequelize.models.User.findAll({
      where: { role: 'Staff', isVerified: false },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(pendingStaff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT Verify / Approve Staff Status
router.put('/verify/:userId', protect, async (req, res) => {
  try {
    const user = await sequelize.models.User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User identity not found.' });

    user.isVerified = req.body.isVerified !== undefined ? req.body.isVerified : true;
    await user.save();
    res.json({ success: true, user: { id: user.id, isVerified: user.isVerified } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE User (e.g. Reject Clearance)
router.delete('/user/:userId', protect, async (req, res) => {
  try {
    const user = await sequelize.models.User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User identity not found.' });

    await user.destroy();
    res.json({ success: true, message: 'Identity node removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST Verify Admin Credentials (System Diagnostic)
router.post('/verify-admin', async (req, res) => {
  try {
    const { adminId, password } = req.body;
    const user = await sequelize.models.User.findOne({
      where: {
        role: 'Admin',
        [Op.or]: [{ name: adminId }, { email: adminId }]
      }
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      return res.json({ isValid: true });
    }

    // Fallback check for initial admin identifier
    if (adminId === 'ADM-001' && password === (process.env.INITIAL_ADMIN_PASSWORD || 'admin123')) {
      return res.json({ isValid: true });
    }

    res.json({ isValid: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST Send OTP (Email or Phone)
router.post('/send-otp', async (req, res) => {
  try {
    const { target, type } = req.body;
    if (!target || !target.trim()) {
      return res.status(400).json({ message: 'Target email or phone number is required.' });
    }

    const cleanTarget = target.trim().toLowerCase();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous unverified OTPs for this target
    await sequelize.models.OtpRecord.update(
      { isUsed: true },
      { where: { target: cleanTarget, isUsed: false } }
    );

    // Create persistent OTP ledger record
    await sequelize.models.OtpRecord.create({
      target: cleanTarget,
      otp,
      type: type || 'email',
      expiresAt,
      attempts: 0,
      isUsed: false
    });

    if (type === 'email') {
      try {
        await sendOtpEmail(cleanTarget, otp, 'JNTU-GV');
      } catch (err) {
        console.error('OTP email error:', err.message);
      }
    } else {
      console.log(`📱 [SMS OTP] Verification code (${otp}) sent to mobile number: ${cleanTarget}`);
    }

    const response = {
      success: true,
      message: `Verification code sent to ${type === 'email' ? 'email' : 'phone number'}.`
    };

    if (!isProduction()) {
      response.mockOtp = otp;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { target, otp } = req.body;
    if (!target || !otp) {
      return res.status(400).json({ message: 'Target and verification code are required.' });
    }

    const cleanTarget = target.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const record = await sequelize.models.OtpRecord.findOne({
      where: {
        target: cleanTarget,
        isUsed: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'No active verification request found for this address.' });
    }

    // Check attempts threshold (max 5)
    if (record.attempts >= 5) {
      record.isUsed = true;
      await record.save();
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please request a new verification code.' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      record.isUsed = true;
      await record.save();
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Please try again.' });
    }

    record.isUsed = true;
    await record.save();
    res.json({ success: true, message: 'Verification successful.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
