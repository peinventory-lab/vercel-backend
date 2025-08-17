const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',  // ✅ Correct model name
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  requestedBy: {
    type: String, // Use ObjectId if referencing User collection in future
    required: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Request', requestSchema);