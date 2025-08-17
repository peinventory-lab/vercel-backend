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

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "*",  // Allow your frontend domain
  credentials: true
}));
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.send('✅ API is running...');
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);

console.log('📌 Routes mounted: /api/auth, /api/inventory, /api/requests');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');

  // Only listen when NOT running in Vercel (Vercel uses serverless functions)
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  }
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
});

// Export app for Vercel
module.exports = app;