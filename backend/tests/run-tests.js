
/**
 * Automated Institutional Integration & Unit Test Suite
 * University Guest House Portal
 */

const assert = require('assert');
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-suite-key-2026';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret-key-2026';

const { sequelize, connectDB } = require('../db');
const { addClient } = require('../src/utils/sse');
const storageUtils = require('../src/utils/storage');
const crypto = require('crypto');
const authRoutes = require('../src/routes/auth.routes');
const guestRoutes = require('../src/routes/guest.routes');
const roomRoutes = require('../src/routes/room.routes');
const notificationRoutes = require('../src/routes/notification.routes');
const auditRoutes = require('../src/routes/audit.routes');
const paymentRoutes = require('../src/routes/payment.routes');

const app = express();
app.use(cors());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

app.get('/api/events', (req, res) => addClient(req, res));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/payments', paymentRoutes);

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
let adminToken = '';
let staffToken = '';
let studentToken = '';

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
};

const runAllTests = async () => {
  console.log('\n======================================================');
  console.log('🏛️  RUNNING INSTITUTIONAL TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  };

  try {
    // 1. Initialize DB & Server
    await connectDB();
    server = app.listen(TEST_PORT);
    await new Promise(resolve => setTimeout(resolve, 500));

    // TEST GROUP 1: Room Dynamic Model & Seeding
    console.log('\n📦 [SUITE 1: Database Room Inventory]');
    await test('Rooms table is populated with default rooms (101-106)', async () => {
      const res = await request('/rooms');
      assert.strictEqual(res.status, 200, 'Rooms endpoint returned non-200');
      assert.ok(Array.isArray(res.data), 'Rooms data is not an array');
      assert.ok(res.data.length >= 6, `Expected at least 6 rooms, got ${res.data.length}`);
      const roomNumbers = res.data.map(r => String(r.roomNumber));
      assert.ok(roomNumbers.includes('101'), 'Room 101 missing');
      assert.ok(roomNumbers.includes('106'), 'Room 106 missing');
    });

    // TEST GROUP 2: Authentication & Token Generation
    console.log('\n🔐 [SUITE 2: Authentication & Security Access]');
    await test('Root Admin can sign in and obtain valid JWT token', async () => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { login: 'admin@university.edu', password: 'admin123' }
      });
      assert.strictEqual(res.status, 200, 'Admin login failed');
      assert.ok(res.data.token, 'Token was not returned');
      assert.strictEqual(res.data.user.role, 'Admin', 'User role should be Admin');
      adminToken = res.data.token;
    });

    await test('Unauthenticated access to protected routes is rejected (401 Unauthorized)', async () => {
      const res = await request('/guests');
      assert.strictEqual(res.status, 401, 'Should reject with 401');
    });

    await test('Create Staff and Student user identities for authorization testing', async () => {
      const staffEmail = `staff_${Date.now()}@university.edu`;
      const staffRes = await request('/auth/register', {
        method: 'POST',
        body: {
          name: 'Prof. Test Faculty',
          email: staffEmail,
          password: 'Password123!',
          role: 'Staff',
          contactNumber: '+91 9988776655'
        }
      });
      assert.strictEqual(staffRes.status, 201, 'Staff registration failed');
      staffToken = staffRes.data.token;

      const studentEmail = `student_${Date.now()}@university.edu`;
      const studentRes = await request('/auth/register', {
        method: 'POST',
        body: {
          name: 'Student User',
          email: studentEmail,
          password: 'Password123!',
          role: 'Student',
          contactNumber: '+91 9988776644'
        }
      });
      assert.strictEqual(studentRes.status, 201, 'Student registration failed');
      studentToken = studentRes.data.token;
    });

    // TEST GROUP 3: Database-Level Room Overlap & Collision Lock
    console.log('\n🔒 [SUITE 3: DB-Level Room Overlap & Collision Lock]');
    let initialBookingId = '';
    await test('First reservation on Room 101 succeeds (201 Created)', async () => {
      const res = await request('/guests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: {
          guestName: 'Dr. First Visitor',
          address: 'IIT Madras, Chennai',
          nationality: 'Indian',
          purposeOfVisit: 'Departmental Guest Lecture',
          category: 'Institute Guests (Official Work)',
          roomNo: '101',
          arrivalDateTime: '2026-12-10T10:00:00.000Z',
          departureDateTime: '2026-12-14T12:00:00.000Z',
          numDays: 4,
          totalAmount: 0,
          paymentType: 'Departmental'
        }
      });
      assert.strictEqual(res.status, 201, `Failed to create initial booking: ${JSON.stringify(res.data)}`);
      assert.strictEqual(res.data.roomNo, '101');
      assert.strictEqual(res.data.status, 'Pending');
      initialBookingId = res.data.id;
    });

    await test('Overlapping reservation on Room 101 is REJECTED with 409 Conflict', async () => {
      // Overlaps Dec 10-14 (Dec 12-16)
      const res = await request('/guests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          guestName: 'Parent of Student',
          address: 'Hyderabad, Telangana',
          nationality: 'Indian',
          purposeOfVisit: 'Attending Convocation',
          category: 'Outsiders / Parents etc',
          roomNo: '101',
          arrivalDateTime: '2026-12-12T10:00:00.000Z',
          departureDateTime: '2026-12-16T12:00:00.000Z',
          numDays: 4,
          totalAmount: 2000,
          paymentType: 'Personal'
        }
      });
      assert.strictEqual(res.status, 409, `Expected 409 Conflict for overlapping booking, got ${res.status}`);
      assert.ok(res.data.message.includes('already booked') || res.data.message.includes('already reserved'), 'Conflict message should explain room occupancy');
    });

    await test('Non-overlapping reservation on Room 101 succeeds (201 Created)', async () => {
      // Clean dates after Dec 14 (Dec 16-18)
      const res = await request('/guests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          guestName: 'Parent of Student',
          address: 'Hyderabad, Telangana',
          nationality: 'Indian',
          purposeOfVisit: 'Attending Convocation',
          category: 'Outsiders / Parents etc',
          roomNo: '101',
          arrivalDateTime: '2026-12-16T10:00:00.000Z',
          departureDateTime: '2026-12-18T12:00:00.000Z',
          numDays: 2,
          totalAmount: 1000,
          paymentType: 'Personal'
        }
      });
      assert.strictEqual(res.status, 201, `Non-overlapping booking failed: ${JSON.stringify(res.data)}`);
    });

    await test('Invalid timeline (Departure before Arrival) is rejected with 400 Bad Request', async () => {
      const res = await request('/guests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          guestName: 'Invalid Date User',
          address: 'Testing Address',
          roomNo: '102',
          arrivalDateTime: '2026-12-20T10:00:00.000Z',
          departureDateTime: '2026-12-18T10:00:00.000Z'
        }
      });
      assert.strictEqual(res.status, 400, 'Expected 400 for invalid timeline');
    });

    // TEST GROUP 4: Document Privacy & Protected Uploads
    console.log('\n🛡️  [SUITE 4: Document Privacy & Protected Uploads]');
    await test('Unauthenticated access to /api/guests/uploads is blocked with 401', async () => {
      const res = await request('/guests/uploads/confidential-id-proof.jpg');
      assert.strictEqual(res.status, 401, 'Unauthenticated upload access should return 401');
    });

    await test('Token passed via query param is accepted for protected preview', async () => {
      // Non-existent file should reach handler and return 404 (not 401)
      const res = await request(`/guests/uploads/sample-proof.png?token=${adminToken}`);
      assert.strictEqual(res.status, 404, 'Authorized request should pass auth check and return 404 for missing file');
    });

    // TEST GROUP 5: Dynamic Room Management API
    console.log('\n⚙️  [SUITE 5: Dynamic Room Administration]');
    let createdRoomId = '';
    await test('Admin can create a new dynamic room node (Room 107)', async () => {
      const res = await request('/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          roomNumber: '107',
          name: 'Executive Suite 107',
          type: 'VIP Deluxe',
          capacity: 3,
          baseTariff: 1200.00
        }
      });
      assert.strictEqual(res.status, 201, 'Admin room creation failed');
      assert.strictEqual(res.data.roomNumber, '107');
      createdRoomId = res.data.id;
    });

    await test('Non-admin users cannot create rooms (403 Forbidden)', async () => {
      const res = await request('/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: { roomNumber: '999', name: 'Unauthorized Room' }
      });
      assert.strictEqual(res.status, 403, 'Student should be forbidden from creating rooms');
    });

    await test('Admin can update dynamic room details', async () => {
      const res = await request(`/rooms/${createdRoomId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { baseTariff: 1500.00 }
      });
      assert.strictEqual(res.status, 200, 'Room update failed');
      assert.strictEqual(Number(res.data.baseTariff), 1500.00);
    });

    await test('Admin can delete/decommission a dynamic room', async () => {
      const res = await request(`/rooms/${createdRoomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, 'Room deletion failed');
    });

    // TEST GROUP 6: Real-Time SSE Stream & Decision Email Dispatch
    console.log('\n⚡ [SUITE 6: Real-Time SSE Stream & Decision Workflow]');
    await test('Real-Time SSE endpoint (/api/events) connects and streams event stream headers', async () => {
      const res = await fetch(`${BASE_URL}/events`);
      assert.strictEqual(res.status, 200, 'SSE endpoint should return 200');
      const contentType = res.headers.get('content-type');
      assert.ok(contentType && contentType.includes('text/event-stream'), 'Content-Type must be text/event-stream');
      res.body.cancel(); // close stream
    });

    await test('Admin can approve booking, updating ledger and triggering decision email', async () => {
      const res = await request(`/guests/${initialBookingId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          status: 'Approved',
          receiptNo: 'REC-AUTOTEST-2026',
          receiptDate: '2026-12-09',
          remarks: 'Official approval by Registrar Peshi'
        }
      });
      assert.strictEqual(res.status, 200, 'Approval update failed');
      assert.strictEqual(res.data.status, 'Approved');
      assert.strictEqual(res.data.receiptNo, 'REC-AUTOTEST-2026');
    });

    // TEST GROUP 7: Institutional Payment Gateway & Electronic Settlement
    console.log('\n💳 [SUITE 7: Institutional Payment Gateway & Settlement Ledger]');
    let testOrderId = '';
    let testPaymentId = '';

    await test('Gateway configuration returns public Key ID and sandbox status', async () => {
      const res = await request('/payments/config');
      assert.strictEqual(res.status, 200, 'Config endpoint failed');
      assert.ok(res.data.keyId, 'Gateway keyId missing');
      assert.strictEqual(res.data.currency, 'INR', 'Currency should be INR');
      assert.strictEqual(res.data.isSandbox, true, 'Default mode should be sandbox');
    });

    await test('Create Payment Order generates valid order ID and amount in paise', async () => {
      const res = await request('/payments/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          bookingId: initialBookingId,
          amount: 1500,
          payerName: 'Parent of Student',
          payerEmail: 'parent@gmail.com'
        }
      });
      assert.ok(res.status === 200 || res.status === 201, `Create order failed: ${JSON.stringify(res.data)}`);
      assert.ok(res.data.orderId, 'Order ID missing');
      assert.strictEqual(res.data.amount, 1500, 'Amount mismatch');
      testOrderId = res.data.orderId;
    });

    await test('Verify Payment processes settlement, marks booking as Paid, and generates official receipt', async () => {
      testPaymentId = `pay_test_${Date.now()}`;
      const res = await request('/payments/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          bookingId: initialBookingId,
          orderId: testOrderId,
          paymentId: testPaymentId,
          paymentMethod: 'UPI'
        }
      });
      assert.strictEqual(res.status, 200, `Payment verification failed: ${JSON.stringify(res.data)}`);
      assert.strictEqual(res.data.success, true, 'Payment verification should succeed');
      assert.strictEqual(res.data.paymentStatus, 'Paid', 'Status should be Paid');
      assert.ok(res.data.receiptNo, 'Official Receipt number missing');
      assert.ok(res.data.transactionId, 'Transaction ID missing');

      // Verify booking record in database is updated
      const guestRes = await request(`/guests/${initialBookingId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(guestRes.data.paymentStatus, 'Paid', 'Guest entry paymentStatus was not updated to Paid');
      assert.strictEqual(guestRes.data.paymentMethod, 'UPI', 'Guest entry paymentMethod mismatch');
      assert.strictEqual(guestRes.data.transactionId, testPaymentId, 'Guest entry transactionId mismatch');
    });

    await test('Payment ledger logs transaction history with payer details', async () => {
      const res = await request('/payments/history', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, 'Payment history retrieval failed');
      assert.ok(Array.isArray(res.data), 'History should be an array');
      const foundPayment = res.data.find(p => p.paymentId === testPaymentId || p.orderId === testOrderId);
      assert.ok(foundPayment, 'Settled payment transaction was not recorded in the Payment table');
      assert.strictEqual(foundPayment.status.toLowerCase(), 'paid', 'Payment status in history should be Paid');
    });

    // TEST GROUP 8: Database-Backed Persistent OTP Ledger
    console.log('\n🔢 [SUITE 8: Persistent Database OTP Ledger]');
    let issuedOtp = '';
    const testOtpTarget = 'prof.test_otp@jntugv.edu.in';

    await test('Send OTP persists record in OtpRecord database table', async () => {
      const res = await request('/auth/send-otp', {
        method: 'POST',
        body: { target: testOtpTarget, type: 'email' }
      });
      assert.strictEqual(res.status, 200, 'Send OTP request failed');
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.mockOtp, 'mockOtp should be returned in test mode');
      issuedOtp = res.data.mockOtp;

      // Verify direct database persistence
      const dbRecord = await sequelize.models.OtpRecord.findOne({
        where: { target: testOtpTarget, isUsed: false }
      });
      assert.ok(dbRecord, 'OtpRecord was not found in the database');
      assert.strictEqual(dbRecord.otp, issuedOtp);
      assert.strictEqual(dbRecord.attempts, 0);
      assert.strictEqual(dbRecord.isUsed, false);
    });

    await test('Verifying with incorrect code increments attempt counter and returns 400', async () => {
      const res = await request('/auth/verify-otp', {
        method: 'POST',
        body: { target: testOtpTarget, otp: '000000' }
      });
      assert.strictEqual(res.status, 400, 'Incorrect OTP should return 400');
      assert.strictEqual(res.data.success, false);

      const dbRecord = await sequelize.models.OtpRecord.findOne({
        where: { target: testOtpTarget, isUsed: false }
      });
      assert.strictEqual(dbRecord.attempts, 1, 'Attempt counter should be incremented to 1');
    });

    await test('Verifying with valid code succeeds and marks OtpRecord as used', async () => {
      const res = await request('/auth/verify-otp', {
        method: 'POST',
        body: { target: testOtpTarget, otp: issuedOtp }
      });
      assert.strictEqual(res.status, 200, 'Valid OTP verification failed');
      assert.strictEqual(res.data.success, true);

      const dbRecord = await sequelize.models.OtpRecord.findOne({
        where: { target: testOtpTarget, otp: issuedOtp }
      });
      assert.strictEqual(dbRecord.isUsed, true, 'OtpRecord isUsed flag should be true');
    });

    await test('Re-using an already consumed OTP is rejected', async () => {
      const res = await request('/auth/verify-otp', {
        method: 'POST',
        body: { target: testOtpTarget, otp: issuedOtp }
      });
      assert.strictEqual(res.status, 400, 'Consumed OTP must not be reusable');
    });

    // TEST GROUP 9: Pluggable Storage Adapter & File Persistence
    console.log('\n🗄️  [SUITE 9: Pluggable Storage Adapter & File Persistence]');
    let savedFilename = '';

    await test('Storage adapter saves buffer, generates safe filename, and returns URL', async () => {
      const testBuffer = Buffer.from('Official JNTU-GV Institutional Verification Document Header');
      const saved = await storageUtils.saveFile({
        buffer: testBuffer,
        originalname: 'dean_clearance_letter.pdf',
        mimetype: 'application/pdf'
      });
      assert.ok(saved.filename, 'Filename missing');
      assert.ok(saved.url.startsWith('/api/guests/uploads/'), 'URL format mismatch');
      assert.strictEqual(saved.storageDriver, 'local');
      savedFilename = saved.filename;
    });

    await test('Storage adapter getFile validates existence and sanitizes path', async () => {
      const fileInfo = storageUtils.getFile(savedFilename);
      assert.strictEqual(fileInfo.exists, true, 'Saved file should exist on disk');
      assert.strictEqual(fileInfo.filename, savedFilename);

      // Path traversal attack check
      const traversalInfo = storageUtils.getFile('../../etc/passwd');
      assert.strictEqual(traversalInfo.filename, 'passwd', 'Path traversal should be stripped');
    });

    // TEST GROUP 10: Asynchronous Razorpay Webhook Engine
    console.log('\n💳 [SUITE 10: Asynchronous Razorpay Webhook Engine]');
    let webhookBookingId = '';
    let webhookOrderId = '';

    await test('Create a pending reservation for webhook settlement testing', async () => {
      const res = await request('/guests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          guestName: 'Dr. Webhook Test Visitor',
          address: 'Andhra University, Visakhapatnam',
          nationality: 'Indian',
          purposeOfVisit: 'Academic Senate Meeting',
          category: 'Institute Guests (Official Work)',
          roomNo: '102',
          arrivalDateTime: '2026-12-25T10:00:00.000Z',
          departureDateTime: '2026-12-28T12:00:00.000Z',
          numDays: 3,
          totalAmount: 1500,
          paymentType: 'Personal'
        }
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.paymentStatus, 'Pending');
      webhookBookingId = res.data.id;

      // Create order
      const orderRes = await request('/payments/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          bookingId: webhookBookingId,
          amount: 1500,
          payerName: 'Dr. Webhook Test Visitor',
          payerEmail: 'webhook_visitor@jntugv.edu.in'
        }
      });
      assert.ok(orderRes.status === 200 || orderRes.status === 201);
      webhookOrderId = orderRes.data.orderId;
    });

    await test('Razorpay Webhook rejects invalid HMAC-SHA256 signature with 400', async () => {
      const webhookPayload = {
        event: 'order.paid',
        payload: {
          order: { entity: { id: webhookOrderId, notes: { bookingId: webhookBookingId } } },
          payment: { entity: { id: 'pay_invalid_sig_123', order_id: webhookOrderId, method: 'upi' } }
        }
      };

      const res = await request('/payments/webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': 'invalid_forged_cryptographic_signature' },
        body: webhookPayload
      });
      assert.strictEqual(res.status, 400, 'Invalid signature must return 400');
    });

    await test('Razorpay Webhook with valid HMAC signature automatically settles booking & generates receipt', async () => {
      const webhookPaymentId = `pay_wh_${Date.now()}`;
      const webhookPayload = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: webhookOrderId,
              amount: 150000,
              notes: { bookingId: webhookBookingId }
            }
          },
          payment: {
            entity: {
              id: webhookPaymentId,
              order_id: webhookOrderId,
              amount: 150000,
              method: 'netbanking',
              email: 'webhook_visitor@jntugv.edu.in'
            }
          }
        }
      };

      const rawString = JSON.stringify(webhookPayload);
      const validSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawString)
        .digest('hex');

      const res = await request('/payments/webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': validSignature },
        body: webhookPayload
      });
      assert.strictEqual(res.status, 200, 'Webhook processing failed');
      assert.strictEqual(res.data.status, 'ok');

      // Verify the booking in DB was asynchronously settled without user browser involvement
      const guestRes = await request(`/guests/${webhookBookingId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(guestRes.data.paymentStatus, 'Paid', 'Booking was not updated to Paid by webhook');
      assert.strictEqual(guestRes.data.paymentMethod, 'NETBANKING', 'Payment method mismatch');
      assert.strictEqual(guestRes.data.transactionId, webhookPaymentId, 'Transaction ID mismatch');
      assert.ok(guestRes.data.receiptNo, 'Official Receipt number missing');
      assert.ok(guestRes.data.paidAt, 'paidAt timestamp missing');
    });

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runAllTests().catch(err => {
  console.error('FATAL_TEST_RUNNER_ERROR:', err);
  if (server) server.close();
  process.exit(1);
});
