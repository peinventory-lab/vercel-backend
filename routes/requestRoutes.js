const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const InventoryItem = require('../models/InventoryItem');

// ✅ POST — STEMbassador submits one or more requests
router.post('/', async (req, res) => {
  try {
    const { requests, requestedBy } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ message: 'No requests provided' });
    }

    const savedRequests = await Promise.all(
      requests.map((reqItem) =>
        new Request({
          itemId: reqItem.itemId,
          quantity: reqItem.quantity,
          status: 'pending',
          requestedBy,
        }).save()
      )
    );

    res.status(201).json({ message: 'Requests submitted successfully', data: savedRequests });
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({ message: 'Server error submitting request' });
  }
});

// ✅ GET — STEMbassador: Fetch past requests
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const userRequests = await Request.find({ requestedBy: username })
      .populate({ path: 'itemId', model: 'InventoryItem', select: 'name quantity' })
      .sort({ requestedAt: -1 });

    res.status(200).json(userRequests);
  } catch (err) {
    console.error('Error fetching user requests:', err);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

// ✅ GET — Manager: Fetch only pending requests
router.get('/pending', async (req, res) => {
  try {
    const pendingRequests = await Request.find({ status: 'pending' })
      .populate({ path: 'itemId', model: 'InventoryItem', select: 'name quantity' })
      .sort({ requestedAt: -1 });

    const formatted = pendingRequests.map((r) => ({
      _id: r._id,
      itemName: r.itemId?.name || 'Unknown Item',
      quantity: r.quantity,
      requestedBy: r.requestedBy,
      requestedAt: r.requestedAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('Error fetching pending requests:', err);
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
});

// ✅ PUT — Approve a request
router.put('/approve/:id', async (req, res) => {
  try {
    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' }, // ✅ lowercase
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ message: 'Failed to approve request' });
  }
});

// ✅ PUT — Reject a request
router.put('/reject/:id', async (req, res) => {
  try {
    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' }, // ✅ lowercase
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ message: 'Failed to reject request' });
  }
});

// ✅ GET — Director: Fetch all requests
router.get('/', async (req, res) => {
  try {
    const allRequests = await Request.find()
      .populate({ path: 'itemId', model: 'InventoryItem', select: 'name' })
      .sort({ requestedAt: -1 });

    const formatted = allRequests.map((r) => ({
      _id: r._id,
      itemName: r.itemId?.name || 'Unknown',
      quantity: r.quantity,
      requestedBy: r.requestedBy,
      status: r.status,
      note: r.note || '',
      requestedAt: r.requestedAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('Error fetching all requests:', err);
    res.status(500).json({ message: 'Failed to fetch all requests' });
  }
});

module.exports = router;