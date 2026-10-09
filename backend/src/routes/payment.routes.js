
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { protect } = require('../../middleware/auth');
const { sequelize } = require('../../db');
const { broadcast } = require('../utils/sse');
const https = require('https');

// Helper to check if live Razorpay credentials are present
const isLiveRazorpayConfigured = () => {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.PAYMENT_MODE !== 'sandbox'
  );
};

// GET /api/payments/config - Public gateway configuration
router.get('/config', (req, res) => {
  const isLive = isLiveRazorpayConfigured();
  res.json({
    keyId: isLive ? process.env.RAZORPAY_KEY_ID : 'rzp_test_jntugv_sandbox',
    isSandbox: !isLive,
    currency: 'INR',
    merchantName: 'JNTU-GV Guest House Estate Desk',
    supportedMethods: ['UPI', 'CARDS', 'NETBANKING', 'QR']
  });
});

// POST /api/payments/create-order - Create gateway order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { bookingId, amount, currency = 'INR', guestName, email, phone } = req.body;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'A valid settlement amount greater than 0 is required.' });
    }

    let booking = null;
    if (bookingId) {
      booking = await sequelize.models.GuestEntry.findByPk(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Referenced guest stay record was not found.' });
      }
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const isLive = isLiveRazorpayConfigured();

    // If live Razorpay is configured, we can create order via Razorpay REST API
    if (isLive) {
      try {
        const authHeader = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const orderData = JSON.stringify({
          amount: Math.round(numericAmount * 100), // amount in paise
          currency: currency,
          receipt: booking?.slNo || `REC-${Date.now().toString().slice(-4)}`,
          notes: {
            bookingId: bookingId || 'direct',
            guestName: guestName || booking?.guestName || 'Guest'
          }
        });

        const rzpResponse = await new Promise((resolve, reject) => {
          const rzpReq = https.request({
            hostname: 'api.razorpay.com',
            port: 443,
            path: '/v1/orders',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': orderData.length,
              'Authorization': `Basic ${authHeader}`
            }
          }, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          });
          rzpReq.on('error', reject);
          rzpReq.write(orderData);
          rzpReq.end();
        });

        if (rzpResponse && rzpResponse.id) {
          // Record payment transaction
          await sequelize.models.Payment.create({
            bookingId: booking?.id || null,
            slNo: booking?.slNo || null,
            orderId: rzpResponse.id,
            amount: numericAmount,
            currency,
            status: 'Pending',
            payerName: guestName || req.user.name,
            payerEmail: email || req.user.email,
            payerPhone: phone || req.user.contactNumber,
            gateway: 'RAZORPAY',
            rawResponse: JSON.stringify(rzpResponse)
          });

          return res.status(201).json({
            orderId: rzpResponse.id,
            amount: numericAmount,
            currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            isSandbox: false
          });
        }
      } catch (rzpErr) {
        console.warn('⚠️ Razorpay Live API Error. Falling back to internal sandbox order:', rzpErr.message);
      }
    }

    // Default Sandbox / Simulation Mode Order Creation
    await sequelize.models.Payment.create({
      bookingId: booking?.id || null,
      slNo: booking?.slNo || null,
      orderId,
      amount: numericAmount,
      currency,
      status: 'Pending',
      payerName: guestName || req.user.name,
      payerEmail: email || req.user.email,
      payerPhone: phone || req.user.contactNumber,
      gateway: 'SIMULATED_GATEWAY',
      rawResponse: JSON.stringify({ mode: 'sandbox', created_at: new Date().toISOString() })
    });

    res.status(201).json({
      orderId,
      amount: numericAmount,
      currency,
      keyId: 'rzp_test_jntugv_sandbox',
      isSandbox: true
    });

  } catch (error) {
    console.error('CREATE_ORDER_ERROR:', error);
    res.status(500).json({ message: error.message || 'Failed to initialize payment gateway order.' });
  }
});

// POST /api/payments/verify - Verify signature and finalize payment
router.post('/verify', protect, async (req, res) => {
  try {
    const {
      bookingId,
      orderId,
      paymentId,
      signature,
      paymentMethod = 'UPI',
      payerName,
      payerEmail,
      payerPhone
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order reference ID is required.' });
    }

    const generatedPaymentId = paymentId || `pay_jntugv_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    const isLive = isLiveRazorpayConfigured();

    // Verify live Razorpay signature if live credentials exist
    if (isLive && signature) {
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(`${orderId}|${generatedPaymentId}`);
      const digest = hmac.digest('hex');
      if (digest !== signature) {
        return res.status(400).json({ message: 'Payment gateway signature verification failed.' });
      }
    }

    // Update payment record in database
    const payment = await sequelize.models.Payment.findOne({ where: { orderId } });
    if (payment) {
      payment.paymentId = generatedPaymentId;
      payment.status = 'Paid';
      payment.paymentMethod = paymentMethod;
      payment.signature = signature || 'verified_mock_sig';
      await payment.save();
    }

    let updatedBooking = null;
    const officialReceiptNo = `REC-${Date.now().toString().slice(-4)}`;
    const officialReceiptDate = new Date().toISOString().split('T')[0];

    // If attached to a GuestEntry booking, update status and settle payment
    if (bookingId) {
      const entry = await sequelize.models.GuestEntry.findByPk(bookingId);
      if (entry) {
        entry.paymentStatus = 'Paid';
        entry.paymentMethod = paymentMethod;
        entry.transactionId = generatedPaymentId;
        entry.paymentOrderId = orderId;
        entry.paidAt = new Date();
        if (!entry.receiptNo) {
          entry.receiptNo = officialReceiptNo;
          entry.receiptDate = officialReceiptDate;
        }
        await entry.save();
        updatedBooking = entry;

        // Audit Log Action
        try {
          await sequelize.models.AuditLog.create({
            id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            action: 'PAYMENT_PROCESSED',
            actorId: req.user.id,
            actorName: req.user.name || req.user.email || 'System User',
            actorRole: req.user.role || 'Guest',
            targetId: entry.id,
            targetType: 'GuestEntry',
            summary: `Online payment of ₹${entry.totalAmount} settled for voucher ${entry.slNo} via ${paymentMethod} (${generatedPaymentId})`,
            details: {
              orderId,
              paymentId: generatedPaymentId,
              paymentMethod,
              amount: entry.totalAmount,
              receiptNo: entry.receiptNo,
              paymentStatus: 'Paid'
            },
            timestamp: new Date().toISOString()
          });
        } catch (auditErr) {
          console.warn('AUDIT_LOG_ERROR:', auditErr.message);
        }

        // Broadcast Real-Time SSE
        broadcast('BOOKING_UPDATED', {
          id: entry.id,
          slNo: entry.slNo,
          roomNo: entry.roomNo,
          guestName: entry.guestName,
          status: entry.status,
          paymentStatus: entry.paymentStatus,
          paymentMethod: entry.paymentMethod,
          receiptNo: entry.receiptNo,
          transactionId: entry.transactionId
        });

        // Add In-App Notification
        try {
          await sequelize.models.Notification.create({
            userId: entry.submittedBy,
            message: `Payment of ₹${entry.totalAmount} completed for ${entry.guestName} (${entry.slNo}). Official Receipt: ${entry.receiptNo}`,
            type: 'SUCCESS',
            relatedGuestEntryId: entry.id
          });
        } catch (notifErr) {
          console.warn('NOTIFICATION_ERROR:', notifErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment verified and stay voucher settlement confirmed.',
      paymentId: generatedPaymentId,
      orderId,
      receiptNo: (updatedBooking && updatedBooking.receiptNo) || officialReceiptNo,
      receiptDate: (updatedBooking && updatedBooking.receiptDate) || officialReceiptDate,
      paymentStatus: 'Paid',
      paymentMethod,
      transactionId: generatedPaymentId,
      paidAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('VERIFY_PAYMENT_ERROR:', error);
    res.status(500).json({ message: error.message || 'Payment verification failed.' });
  }
});

// GET /api/payments/history - Payment history
router.get('/history', protect, async (req, res) => {
  try {
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Staff';
    const where = isPrivileged ? {} : { payerEmail: req.user.email };
    const payments = await sequelize.models.Payment.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments/webhook - Server-to-server Razorpay webhook listener
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // Verify HMAC signature if secret is configured
    if (webhookSecret && signature) {
      const payload = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
      const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

      if (expectedSignature !== signature) {
        console.warn('⚠️ Webhook signature verification failed.');
        return res.status(400).json({ message: 'Invalid webhook signature.' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload || {};
    const paymentEntity = payload.payment?.entity;
    const orderEntity = payload.order?.entity;

    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;
    const bookingId = paymentEntity?.notes?.bookingId || orderEntity?.notes?.bookingId;
    const method = (paymentEntity?.method || 'UPI').toUpperCase();

    if (event === 'payment.captured' || event === 'order.paid') {
      // Find and update Payment
      if (orderId) {
        const payment = await sequelize.models.Payment.findOne({ where: { orderId } });
        if (payment) {
          payment.paymentId = paymentId || payment.paymentId;
          payment.status = 'Paid';
          payment.paymentMethod = method;
          payment.rawResponse = JSON.stringify(req.body);
          await payment.save();
        }
      }

      // Find and update GuestEntry
      let entry = null;
      if (bookingId) {
        entry = await sequelize.models.GuestEntry.findByPk(bookingId);
      } else if (orderId) {
        entry = await sequelize.models.GuestEntry.findOne({ where: { paymentOrderId: orderId } });
      }

      if (entry && entry.paymentStatus !== 'Paid') {
        const officialReceiptNo = entry.receiptNo || `REC-${Date.now().toString().slice(-4)}`;
        const officialReceiptDate = entry.receiptDate || new Date().toISOString().split('T')[0];

        entry.paymentStatus = 'Paid';
        entry.paymentMethod = method;
        entry.transactionId = paymentId || entry.transactionId;
        entry.paidAt = new Date();
        entry.receiptNo = officialReceiptNo;
        entry.receiptDate = officialReceiptDate;
        await entry.save();

        // Audit Log
        try {
          await sequelize.models.AuditLog.create({
            id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            action: 'PAYMENT_PROCESSED',
            actorId: 'RAZORPAY_WEBHOOK',
            actorName: 'Razorpay Gateway Service',
            actorRole: 'System',
            targetId: entry.id,
            targetType: 'GuestEntry',
            summary: `Webhook: Online payment settled for voucher ${entry.slNo} via ${method} (${paymentId})`,
            details: { orderId, paymentId, method, amount: entry.totalAmount, event },
            timestamp: new Date().toISOString()
          });
        } catch (auditErr) {
          console.warn('AUDIT_LOG_ERROR:', auditErr.message);
        }

        // Broadcast SSE
        broadcast('BOOKING_UPDATED', {
          id: entry.id,
          slNo: entry.slNo,
          roomNo: entry.roomNo,
          guestName: entry.guestName,
          status: entry.status,
          paymentStatus: entry.paymentStatus,
          paymentMethod: entry.paymentMethod,
          receiptNo: entry.receiptNo,
          transactionId: entry.transactionId
        });

        // Notification
        try {
          await sequelize.models.Notification.create({
            userId: entry.submittedBy,
            message: `Payment received for ${entry.guestName} (${entry.slNo}). Receipt: ${entry.receiptNo}`,
            type: 'SUCCESS',
            relatedGuestEntryId: entry.id
          });
        } catch (notifErr) {}
      }
    } else if (event === 'payment.failed') {
      if (orderId) {
        const payment = await sequelize.models.Payment.findOne({ where: { orderId } });
        if (payment && payment.status !== 'Paid') {
          payment.status = 'Failed';
          payment.rawResponse = JSON.stringify(req.body);
          await payment.save();
        }
      }
    }

    return res.status(200).json({ status: 'ok', received: true });
  } catch (error) {
    console.error('WEBHOOK_PROCESSING_ERROR:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
