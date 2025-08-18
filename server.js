// Load environment variables
require('dotenv').config();
console.log('Loaded CLIENT_URL from .env:', process.env.CLIENT_URL);

// Core
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const requestRoutes = require('./routes/requestRoutes');

// App
const app = express();
const PORT = process.env.PORT || 5050;

/* -------------------------------------------------------------------------- */
/*                               C O R S  (with middleware)                   */
/* -------------------------------------------------------------------------- */

// Allowed origins come from CLIENT_URL (comma‑separated). Provide safe defaults.
const allowedOrigins = (
  process.env.CLIENT_URL ||
  'https://vercel-frontend-6xa5cwk8-project-explorations-projects.vercel.app,http://localhost:3000'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
console.log('Loaded CLIENT_URL from .env:', process.env.CLIENT_URL);
console.log('✅ CORS allow list:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

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