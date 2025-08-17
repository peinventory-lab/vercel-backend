// backend/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const InventoryItem = require('../models/InventoryItem');

// GET /api/inventory - Fetch all inventory items
router.get('/', async (req, res) => {
  try {
    const items = await InventoryItem.find();
    res.status(200).json(items);
  } catch (err) {
    console.error('❌ Error fetching inventory:', err);
    res.status(500).json({ message: 'Failed to fetch inventory' });
  }
});

// POST /api/inventory/add - Add a new inventory item
router.post('/add', async (req, res) => {
  try {
    const { name, quantity, location, description } = req.body;
    const newItem = new InventoryItem({ name, quantity, location, description });
    await newItem.save();
    res.status(201).json({ message: 'Item added successfully', item: newItem });
  } catch (err) {
    console.error('❌ Error adding item:', err);
    res.status(500).json({ message: 'Failed to add item' });
  }
});

// PUT /api/inventory/edit/:id - Update an inventory item
router.put('/edit/:id', async (req, res) => {
  try {
    const { name, quantity, location, description } = req.body;
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { name, quantity, location, description },
      { new: true }
    );
    res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
  } catch (err) {
    console.error('❌ Error updating item:', err);
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// DELETE /api/inventory/delete/:id - Delete an inventory item
router.delete('/delete/:id', async (req, res) => {
  try {
    await InventoryItem.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting item:', err);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

// GET /api/inventory/filter?location=A1 - Filter items by location
router.get('/filter', async (req, res) => {
  try {
    const { location } = req.query;
    const filteredItems = await InventoryItem.find({ location });
    res.status(200).json(filteredItems);
  } catch (err) {
    console.error('❌ Error filtering items:', err);
    res.status(500).json({ message: 'Failed to filter inventory' });
  }
});

module.exports = router;