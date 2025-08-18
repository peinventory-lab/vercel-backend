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

// In Vercel, requests come through a proxy
app.set('trust proxy', 1);

/* --------------------------- CORS configuration --------------------------- */
// Allow-list (comma-separated); fallback to your Vercel FE + localhost
const allowedOrigins = (
  process.env.CLIENT_URL ||
  'https://vercel-frontend-six-xi.vercel.app,http://localhost:3000'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

console.log('✅ CORS allow list:', allowedOrigins);

// Always vary on origin to keep caches honest
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});

// Build per-request CORS options
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  const isAllowed = !origin || allowedOrigins.includes(origin);

  // When allowed, mirror the origin (important if credentials are true)
  const opts = {
    origin: isAllowed ? (origin || true) : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  callback(isAllowed ? null : new Error(`Not allowed by CORS: ${origin}`), opts);
};

// Apply CORS for all requests + ensure preflights succeed
app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

// Some environments/proxies drop this—force it on every response
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// Body parsing
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
  .connect(process.env.MONGO_URI) // modern defaults
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