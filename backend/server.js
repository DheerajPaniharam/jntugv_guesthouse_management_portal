
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./db');

const authRoutes = require('./src/routes/auth.routes');
const guestRoutes = require('./src/routes/guest.routes');
const roomRoutes = require('./src/routes/room.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const auditRoutes = require('./src/routes/audit.routes');
const paymentRoutes = require('./src/routes/payment.routes');

const { addClient } = require('./src/utils/sse');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim()) : [];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Real-Time Server-Sent Events Endpoint
app.get('/api/events', (req, res) => {
  addClient(req, res);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);

// Unmatched API Route 404 Handler
app.all('/api/*', (req, res) => {
  res.status(404).json({ message: 'Requested API endpoint not found.' });
});

// Static File Serving (Production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('University Guest House API Running (Development Mode)');
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed by CORS policy.' });
  }

  console.error('SERVER_ERROR:', err.stack);
  res.status(500).json({
    message: 'Internal Institutional Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize Database and Start Server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Portal Server active on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
  });
};

startServer();
