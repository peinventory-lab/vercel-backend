// Load environment variables
require('dotenv').config();

// Core
const express = require('express');
const mongoose = require('mongoose');

// Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const requestRoutes = require('./routes/requestRoutes');

// App
const app = express();
const PORT = process.env.PORT || 5050;

/* -------------------------------------------------------------------------- */
/*                               C O R S  (manual)                            */
/*  We set headers ourselves so preflight OPTIONS never reaches route code.   */
/* -------------------------------------------------------------------------- */

// Allowed origins come from CLIENT_URL (comma‑separated). Provide safe defaults.
const allowedOrigins = (
  process.env.CLIENT_URL ||
  'https://vercel-frontend-6xa5cwk8-project-explorations-projects.vercel.app,http://localhost:3000'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

console.log('✅ CORS allow list:', allowedOrigins);

// 1) Set CORS headers on every request
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    // If no Origin (curl/server-to-server), echo first allowed so the header exists
    res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // Help caches/proxies vary by origin
    res.setHeader('Vary', 'Origin');
  }
  next();
});

// 2) Short‑circuit all OPTIONS (preflight) with a 204 + CORS headers
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  }
  next();
});

/* -------------------------------------------------------------------------- */

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('✅ API is running...');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);

console.log('📌 Routes mounted: /api/auth, /api/inventory, /api/requests');

/* ---------------------------- MongoDB & listen ----------------------------- */

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('❌ Missing MONGO_URI env var');
}

// Use lean defaults; Mongoose 7+ doesn’t need the old options
mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB connected');

    // Vercel serverless: DO NOT app.listen() in production
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
      });
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
  });

/* ------------------------------- Export app -------------------------------- */
module.exports = app;