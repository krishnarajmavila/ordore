const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');

// Get all bills for a restaurant
router.get('/', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }
    const bills = await Bill.find({ restaurant: restaurantId });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific bill by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    const bill = await Bill.findOne({ _id: id, restaurant: restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new bill
router.post('/', async (req, res) => {
  try {
    const newBill = new Bill(req.body);
    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a bill
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId, ...updateData } = req.body;
    const updatedBill = await Bill.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      updateData,
      { new: true }
    );
    if (!updatedBill) return res.status(404).json({ message: 'Bill not found' });
    res.json(updatedBill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a bill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    const deletedBill = await Bill.findOneAndDelete({ _id: id, restaurant: restaurantId });
    if (!deletedBill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if a bill exists for a given tableOtp
router.get('/check/:tableOtp', async (req, res) => {
  try {
    const { tableOtp } = req.params;
    const { restaurantId } = req.query;
    const existingBill = await Bill.findOne({ 
      tableOtp, 
      restaurant: restaurantId,
      status: { $ne: 'cancelled' } // Exclude cancelled bills
    });
    res.json({ exists: !!existingBill });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;