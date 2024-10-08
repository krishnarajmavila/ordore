const express = require('express');
const router = express.Router();
const FoodType = require('../models/FoodType');
const auth = require('../middleware/auth');

// Get all food types for a specific restaurant
router.get('/', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }
    const foodTypes = await FoodType.find({ restaurant: restaurantId });
    res.json(foodTypes);
  } catch (error) {
    console.error('Error fetching food types:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new food type
router.post('/', async (req, res) => {
  try {
    const { name, restaurant } = req.body;
    
    if (!name || !restaurant) {
      return res.status(400).json({ message: 'Name and Restaurant ID are required' });
    }

    const newFoodType = new FoodType({
      name,
      restaurant
    });

    const savedFoodType = await newFoodType.save();
    res.status(201).json(savedFoodType);
  } catch (error) {
    console.error('Error adding food type:', error);
    res.status(400).json({ message: 'Error adding food type', error: error.message });
  }
});

// Update a food type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, restaurant } = req.body;
    
    if (!name || !restaurant) {
      return res.status(400).json({ message: 'Name and Restaurant ID are required' });
    }
    
    const updatedFoodType = await FoodType.findOneAndUpdate(
      { _id: id, restaurant: restaurant },
      { name },
      { new: true }
    );
    
    if (!updatedFoodType) {
      return res.status(404).json({ message: 'Food type not found' });
    }
    
    res.json(updatedFoodType);
  } catch (error) {
    console.error('Error updating food type:', error);
    res.status(400).json({ message: 'Error updating food type', error: error.message });
  }
});

// Delete a food type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;  // Changed from req.body to req.query

    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const deletedFoodType = await FoodType.findOneAndDelete({ _id: id, restaurant: restaurantId });

    if (!deletedFoodType) {
      return res.status(404).json({ message: 'Food type not found' });
    }

    res.json({ message: 'Food type deleted successfully' });
  } catch (error) {
    console.error('Error deleting food type:', error);
    res.status(400).json({ message: 'Error deleting food type', error: error.message });
  }
});

module.exports = router;