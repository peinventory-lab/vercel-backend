// Load environment variables
require('dotenv').config();

// Core modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Route modules
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const requestRoutes = require('./routes/requestRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5050;

/* ----------------------------- CORS (important) ----------------------------- */
// Allow list comes from CLIENT_URL (comma-separated), with safe defaults
const allowedOrigins = (
  process.env.CLIENT_URL ||
  'https://vercel-frontend-six-xi.vercel.app,http://localhost:3000'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

console.log('✅ CORS allow list:', allowedOrigins);

// Make caches/proxies vary on Origin and avoid weird caching issues
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});

const corsOptionsDelegate = (req, cb) => {
  const origin = req.header('Origin');
  // Allow same-origin / server-to-server / curl (no Origin header)
  if (!origin || allowedOrigins.includes(origin)) {
    cb(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    cb(new Error(`Not allowed by CORS: ${origin}`));
  }
};

// Main CORS
app.use(cors(corsOptionsDelegate));
// Ensure OPTIONS (preflight) succeeds quickly
app.options('*', cors(corsOptionsDelegate));

// Keep credential header explicit (some proxies strip it)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json());

/* ----------------------------- Health check ----------------------------- */
app.get('/', (req, res) => {
  res.send('✅ API is running...');
});

/* ----------------------------- API routes ----------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);

console.log('📌 Routes mounted: /api/auth, /api/inventory, /api/requests');

/* ------------------------- Mongo & local listener ------------------------- */
mongoose
  .connect(process.env.MONGO_URI, {
    // modern defaults
  })
  .then(() => {
    console.log('✅ MongoDB connected');

    // In Vercel we export the app; only listen locally
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });

/* ------------------------------ Export for Vercel ------------------------------ */
module.exports = app;