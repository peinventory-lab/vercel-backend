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

// Helps caches/proxies vary on Origin and avoid weird caching issues
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / server-to-server / curl (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
});

/* ------------------------------ Export for Vercel ------------------------------ */
module.exports = app;