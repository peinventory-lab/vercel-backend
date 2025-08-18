const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },

  // make email OPTIONAL, and only enforce uniqueness when provided
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,   // keep unique
    sparse: true    // <-- makes unique apply only to docs that have an email
  },

  password: { type: String, required: true },
  role: { type: String, enum: ['director', 'inventoryManager', 'stembassador'], default: 'stembassador' },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);