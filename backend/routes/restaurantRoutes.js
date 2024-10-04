const express = require('express');
const mongoose = require('mongoose'); // Import mongoose for ObjectId validation
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// Create a new restaurant
router.post('/', auth, async (req, res) => {
  try {
    const { name, parentOrganization, type, city } = req.body;
    const restaurant = new Restaurant({
      name,
      parentOrganization,
      type,
      city,
      createdBy: req.user.userId
    });
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all restaurants (for the logged-in user)
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching restaurants for user ID:', req.user.userId);
    const restaurants = await Restaurant.find({ createdBy: req.user.userId }); // Only fetch restaurants created by the user
    console.log('Fetched restaurants:', JSON.stringify(restaurants, null, 2));
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all restaurants (for admin or public)
router.get('/all', async (req, res) => {
  try {
    console.log('Fetching all restaurants');
    const restaurants = await Restaurant.find(); // Fetch all restaurants
    console.log('Fetched all restaurants:', JSON.stringify(restaurants, null, 2));
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching all restaurants:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a specific restaurant
// Get all restaurants (public)
router.get('/all', async (req, res) => {
  try {
    console.log('Fetching all restaurants');
    const restaurants = await Restaurant.find(); // Fetch all restaurants
    console.log('Fetched all restaurants:', JSON.stringify(restaurants, null, 2));
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching all restaurants:', error);
    res.status(500).json({ message: error.message });
  }
});


// Verify a restaurant
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json({ message: 'Restaurant found', restaurant });
  } catch (error) {
    console.error('Error verifying restaurant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a restaurant
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentOrganization, type, city } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: id, createdBy: req.user.userId },
      { name, parentOrganization, type, city },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found or you do not have permission to update it' });
    }

    res.json({ message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Delete a restaurant
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }

    const restaurant = await Restaurant.findOneAndDelete({ _id: id, createdBy: req.user.userId });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found or you do not have permission to delete it' });
    }

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;
