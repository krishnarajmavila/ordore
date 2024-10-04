const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Table = require('../models/Table');
const auth = require('../middleware/auth');

// Middleware to check for restaurantId
const checkRestaurantId = (req, res, next) => {
  const restaurantId = req.body.restaurant || req.query.restaurantId || req.params.restaurantId;
  console.log('Received restaurantId:', restaurantId);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  console.log('Request params:', req.params);

  if (!restaurantId) {
    return res.status(400).json({ message: 'Restaurant ID is required' });
  }
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    return res.status(400).json({ message: 'Invalid restaurant ID format' });
  }
  req.restaurantId = restaurantId;
  next();
};

// Get all tables for a restaurant
router.get('/', auth, checkRestaurantId, async (req, res) => {
  try {
    const tables = await Table.find({ restaurant: req.restaurantId });
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new table
router.post('/', auth, checkRestaurantId, async (req, res) => {
  try {
    const { number, capacity, location } = req.body;
    console.log('Received request to add table:', { number, capacity, location, restaurant: req.restaurantId });

    const newTable = new Table({
      number,
      capacity,
      location,
      restaurant: req.restaurantId,
      otp: generateOTP()
    });

    const savedTable = await newTable.save();
    console.log('Table added successfully:', savedTable);
    res.status(201).json(savedTable);
  } catch (error) {
    console.error('Error adding table:', error);
    res.status(400).json({ message: 'Error adding table', error: error.message });
  }
});

// Update a table
router.put('/:id', auth, checkRestaurantId, async (req, res) => {
  try {
    const { id } = req.params;
    const { number, capacity, location, isOccupied } = req.body;

    const updatedTable = await Table.findOneAndUpdate(
      { _id: id, restaurant: req.restaurantId },
      { number, capacity, location, isOccupied },
      { new: true, runValidators: true }
    );

    if (!updatedTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(updatedTable);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(400).json({ message: 'Error updating table', error: error.message });
  }
});

// Delete a table
router.delete('/:id', auth, checkRestaurantId, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTable = await Table.findOneAndDelete({ _id: id, restaurant: req.restaurantId });
    if (!deletedTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ message: 'Error deleting table', error: error.message });
  }
});

// Refresh OTP for a table
router.post('/:id/refresh-otp', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedTable = await Table.findOneAndUpdate(
      { _id: id },
      { 
        otp: generateOTP(),
        otpGeneratedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(updatedTable);
  } catch (error) {
    console.error('Error refreshing table OTP:', error);
    res.status(400).json({ message: 'Error refreshing table OTP', error: error.message });
  }
});

router.patch('/:id/payment', async (req, res) => {
  try {
    const { isPayInitiated, paymentType } = req.body;
    const updatedTable = await Table.findByIdAndUpdate(
      req.params.id,
      { isPayInitiated, paymentType },
      { new: true }
    );
    res.json(updatedTable);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

module.exports = router;