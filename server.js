// Load environment variables
require('dotenv').config();


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
/*                               C O R S (Public Access)                      */
/* -------------------------------------------------------------------------- */

app.use(cors({
  origin: 'https://vercel-frontend-c2izxq2s5-project-explorations-projects.vercel.app',
  credentials: true
}));

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
