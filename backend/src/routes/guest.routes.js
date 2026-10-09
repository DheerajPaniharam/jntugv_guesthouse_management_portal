
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenAI } = require("@google/genai");
const { protect, admin, privileged } = require('../../middleware/auth');
const { sequelize } = require('../../db');
const { Op } = require('sequelize');
const { broadcast } = require('../utils/sse');
const { sendBookingDecisionEmail } = require('../utils/mailer');
const storageUtils = require('../utils/storage');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /api/guests/uploads/:filename - Protected file download/serving
router.get('/uploads/:filename', protect, async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const fileInfo = storageUtils.getFile(safeFilename);

    if (!fileInfo.exists) {
      return res.status(404).json({ message: 'Requested document asset not found.' });
    }

    // Authorization: Admin and Staff can view all documents; general users can only view their own
    if (req.user.role !== 'Admin' && req.user.role !== 'Staff') {
      const relativePath = `/api/guests/uploads/${safeFilename}`;
      const legacyPath = `/uploads/${safeFilename}`;
      const ownsEntry = await sequelize.models.GuestEntry.findOne({
        where: {
          submittedBy: req.user.id,
          [Op.or]: [
            { idProof: relativePath },
            { idProof: legacyPath },
            { requestLetter: relativePath },
            { requestLetter: legacyPath }
          ]
        }
      });
      const ownsUser = await sequelize.models.User.findOne({
        where: {
          id: req.user.id,
          [Op.or]: [{ idProof: relativePath }, { idProof: legacyPath }]
        }
      });

      if (!ownsEntry && !ownsUser) {
        return res.status(403).json({ message: 'Unauthorized: Clearance required to view this institutional document.' });
      }
    }

    res.sendFile(fileInfo.filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all entries
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = (page - 1) * limit;

    const where = req.user.role === 'Admin' || req.user.role === 'Staff' ? {} : { submittedBy: req.user.id };
    const entries = await sequelize.models.GuestEntry.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all feedback (Admin only)
router.get('/feedback', protect, privileged, async (req, res) => {
  try {
    const feedbacks = await sequelize.models.Feedback.findAll({ order: [['createdAt', 'DESC']] });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST feedback
router.post('/feedback', protect, async (req, res) => {
  try {
    const fb = await sequelize.models.Feedback.create(req.body);
    res.status(201).json(fb);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET single entry by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const entry = await sequelize.models.GuestEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Stay record not found' });

    // Authorization check: User must be owner OR Admin/Staff
    const isOwner = entry.submittedBy === req.user.id;
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Staff';
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Unauthorized access to guest record' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new entry with DB Collision Lock & Real-Time Sync
router.post('/', protect, upload.fields([
  { name: 'idProof', maxCount: 1 },
  { name: 'requestLetter', maxCount: 1 }
]), async (req, res) => {
  try {
    const entryData = { ...req.body };

    // Validate dates
    if (!entryData.arrivalDateTime || !entryData.departureDateTime) {
      return res.status(400).json({ message: 'Arrival and departure date/time are required.' });
    }
    const newArrival = new Date(entryData.arrivalDateTime);
    const newDeparture = new Date(entryData.departureDateTime);

    if (isNaN(newArrival.getTime()) || isNaN(newDeparture.getTime()) || newDeparture <= newArrival) {
      return res.status(400).json({ message: 'Invalid stay dates. Departure must be strictly after arrival.' });
    }

    if (!entryData.roomNo) {
      return res.status(400).json({ message: 'Room selection is mandatory.' });
    }

    // Database-level room collision check (Active bookings: Pending or Approved)
    const conflictingEntry = await sequelize.models.GuestEntry.findOne({
      where: {
        roomNo: String(entryData.roomNo),
        status: { [Op.in]: ['Pending', 'Approved'] },
        arrivalDateTime: { [Op.lt]: newDeparture },
        departureDateTime: { [Op.gt]: newArrival }
      }
    });

    if (conflictingEntry) {
      const conflictStart = new Date(conflictingEntry.arrivalDateTime).toLocaleDateString();
      const conflictEnd = new Date(conflictingEntry.departureDateTime).toLocaleDateString();
      return res.status(409).json({
        message: `Room ${entryData.roomNo} is already booked from ${conflictStart} to ${conflictEnd} (${conflictingEntry.status}). Please choose another room or date.`
      });
    }

    // Extract and persist file uploads safely
    let idProofPath = null;
    let requestLetterPath = null;
    if (req.files && req.files['idProof'] && req.files['idProof'][0]) {
      const savedId = await storageUtils.saveFile({
        buffer: req.files['idProof'][0].buffer,
        originalname: req.files['idProof'][0].originalname,
        mimetype: req.files['idProof'][0].mimetype
      });
      idProofPath = savedId.url;
    }
    if (req.files && req.files['requestLetter'] && req.files['requestLetter'][0]) {
      const savedLetter = await storageUtils.saveFile({
        buffer: req.files['requestLetter'][0].buffer,
        originalname: req.files['requestLetter'][0].originalname,
        mimetype: req.files['requestLetter'][0].mimetype
      });
      requestLetterPath = savedLetter.url;
    }

    const count = await sequelize.models.GuestEntry.count();
    const slNo = `G-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

    const entry = await sequelize.models.GuestEntry.create({
      ...entryData,
      slNo,
      idProof: idProofPath || entryData.idProof || null,
      requestLetter: requestLetterPath || entryData.requestLetter || null,
      remarks: entryData.remarks,
      submittedBy: req.user.id,
      status: 'Pending'
    });

    // Broadcast SSE live update
    broadcast('BOOKING_CREATED', {
      id: entry.id,
      slNo: entry.slNo,
      roomNo: entry.roomNo,
      guestName: entry.guestName,
      status: entry.status,
      arrivalDateTime: entry.arrivalDateTime,
      departureDateTime: entry.departureDateTime
    });

    // Run AI in background with non-blocking error boundary
    if (entryData.purposeOfVisit) {
      setTimeout(async () => {
        try {
          const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
          if (!apiKey) return;

          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following guest house visit purpose for a university: "${entryData.purposeOfVisit}". 
            Is this official, personal, or emergency? Provide a 1-sentence summary for the registrar.`,
          });

          if (response && response.text) {
            entry.remarks = `[AI SUGGESTION]: ${response.text.trim()}\n\n${entryData.remarks || ''}`.trim();
            await entry.save();
          }
        } catch (aiErr) {
          console.warn('AI_ANALYSIS_BACKGROUND_INFO:', aiErr.message || 'Skipped Gemini analysis');
        }
      }, 50);
    }

    try {
      const privilegedUsers = await sequelize.models.User.findAll({
        where: { role: ['Admin', 'Staff'] }
      });
      const notifications = privilegedUsers.map(u => ({
        userId: u.id,
        message: `New registration request submitted for ${entryData.guestName} in Room ${entryData.roomNo}`,
        type: 'INFO',
        relatedGuestEntryId: entry.id
      }));
      await sequelize.models.Notification.bulkCreate(notifications);
    } catch (notifErr) {
      console.error('NOTIFICATION_ERROR:', notifErr.message);
    }

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update entry / status (Approval, Rejection, Modification)
router.put('/:id', protect, async (req, res) => {
  try {
    const entry = await sequelize.models.GuestEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const isOwner = entry.submittedBy === req.user.id;
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Staff';
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Clearance required to modify entry.' });
    }

    const {
      status, receiptNo, receiptDate, remarks, roomNo, arrivalDateTime, departureDateTime,
      guestName, address, phoneNumber, nationality, purposeOfVisit, category,
      paymentType, departmentName, budgetHead, sanctionOrderNo, approvingAuthority,
      totalAmount, numDays, numMale, numFemale, numChildren, bookingFor,
      idProof, requestLetter, signature
    } = req.body;

    // Check collision if room or dates are updated
    if (roomNo || arrivalDateTime || departureDateTime) {
      const checkRoom = roomNo || entry.roomNo;
      const checkArrival = arrivalDateTime ? new Date(arrivalDateTime) : new Date(entry.arrivalDateTime);
      const checkDeparture = departureDateTime ? new Date(departureDateTime) : new Date(entry.departureDateTime);

      if (checkDeparture <= checkArrival) {
        return res.status(400).json({ message: 'Departure date must be after arrival date.' });
      }

      const conflicting = await sequelize.models.GuestEntry.findOne({
        where: {
          id: { [Op.ne]: entry.id },
          roomNo: String(checkRoom),
          status: { [Op.in]: ['Pending', 'Approved'] },
          arrivalDateTime: { [Op.lt]: checkDeparture },
          departureDateTime: { [Op.gt]: checkArrival }
        }
      });

      if (conflicting) {
        return res.status(409).json({
          message: `Room ${checkRoom} is already reserved for overlapping dates (${conflicting.status}).`
        });
      }

      if (roomNo) entry.roomNo = String(checkRoom);
      if (arrivalDateTime) entry.arrivalDateTime = checkArrival;
      if (departureDateTime) entry.departureDateTime = checkDeparture;
    }

    if (guestName !== undefined) entry.guestName = guestName;
    if (phoneNumber !== undefined) entry.phoneNumber = phoneNumber;
    if (address !== undefined) entry.address = address;
    if (nationality !== undefined) entry.nationality = nationality;
    if (purposeOfVisit !== undefined) entry.purposeOfVisit = purposeOfVisit;
    if (category !== undefined) entry.category = category;
    if (paymentType !== undefined) entry.paymentType = paymentType;
    if (departmentName !== undefined) entry.departmentName = departmentName;
    if (budgetHead !== undefined) entry.budgetHead = budgetHead;
    if (sanctionOrderNo !== undefined) entry.sanctionOrderNo = sanctionOrderNo;
    if (approvingAuthority !== undefined) entry.approvingAuthority = approvingAuthority;
    if (totalAmount !== undefined) entry.totalAmount = parseFloat(totalAmount) || 0;
    if (numDays !== undefined) entry.numDays = parseInt(numDays, 10) || 0;
    if (numMale !== undefined) entry.numMale = parseInt(numMale, 10) || 0;
    if (numFemale !== undefined) entry.numFemale = parseInt(numFemale, 10) || 0;
    if (numChildren !== undefined) entry.numChildren = parseInt(numChildren, 10) || 0;
    if (bookingFor !== undefined) entry.bookingFor = bookingFor;
    if (idProof !== undefined) entry.idProof = idProof;
    if (requestLetter !== undefined) entry.requestLetter = requestLetter;
    if (signature !== undefined) entry.signature = signature;

    // Privileged fields (status, receipt)
    if (isPrivileged) {
      if (status) entry.status = status;
      if (receiptNo !== undefined) entry.receiptNo = receiptNo;
      if (receiptDate !== undefined) entry.receiptDate = receiptDate;
      if (remarks !== undefined) entry.remarks = remarks;
    }

    await entry.save();

    // Broadcast SSE live update
    broadcast('BOOKING_UPDATED', {
      id: entry.id,
      slNo: entry.slNo,
      roomNo: entry.roomNo,
      guestName: entry.guestName,
      status: entry.status,
      receiptNo: entry.receiptNo,
      arrivalDateTime: entry.arrivalDateTime,
      departureDateTime: entry.departureDateTime
    });

    if (status && status !== 'Pending' && isPrivileged) {
      // In-app notification
      try {
        await sequelize.models.Notification.create({
          userId: entry.submittedBy,
          message: `Your registration for ${entry.guestName} in Room ${entry.roomNo} was ${status}`,
          type: status === 'Approved' ? 'SUCCESS' : 'ERROR',
          relatedGuestEntryId: entry.id
        });
      } catch (notifErr) {
        console.error('NOTIFICATION_ERROR:', notifErr.message);
      }

      // Automated decision email dispatch
      (async () => {
        try {
          const submitter = await sequelize.models.User.findByPk(entry.submittedBy);
          const toEmail = submitter?.email;
          if (toEmail) {
            await sendBookingDecisionEmail({
              to: toEmail,
              guestName: entry.guestName,
              slNo: entry.slNo,
              roomNo: entry.roomNo,
              arrivalDateTime: entry.arrivalDateTime,
              departureDateTime: entry.departureDateTime,
              status: entry.status,
              totalAmount: entry.totalAmount,
              receiptNo: entry.receiptNo,
              remarks: entry.remarks,
              universityName: 'University'
            });
          }
        } catch (mailErr) {
          console.warn('DECISION_EMAIL_DISPATCH_INFO:', mailErr.message);
        }
      })();
    }

    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
