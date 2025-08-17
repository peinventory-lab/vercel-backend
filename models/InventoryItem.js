// backend/models/InventoryItem.js
const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  location: { type: String, required: true },  // Example: A1, B2, etc.
  quantity: { type: Number, required: true }
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);