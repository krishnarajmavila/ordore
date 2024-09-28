// routes/foodTypeRoutes.js

const express = require('express');
const router = express.Router();
const FoodType = require('../models/FoodType');

// Get all food types
router.get('/', async (req, res) => {
  try {
    const foodTypes = await FoodType.find();
    res.json(foodTypes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new food type
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const newFoodType = new FoodType({ name });
    const savedFoodType = await newFoodType.save();
    res.status(201).json(savedFoodType);
  } catch (error) {
    res.status(400).json({ message: 'Error adding food type', error: error.message });
  }
});

// Update a food type
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const updatedFoodType = await FoodType.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!updatedFoodType) {
      return res.status(404).json({ message: 'Food type not found' });
    }
    res.json(updatedFoodType);
  } catch (error) {
    res.status(400).json({ message: 'Error updating food type', error: error.message });
  }
});

// Delete a food type
router.delete('/:id', async (req, res) => {
  try {
    const deletedFoodType = await FoodType.findByIdAndDelete(req.params.id);
    if (!deletedFoodType) {
      return res.status(404).json({ message: 'Food type not found' });
    }
    res.json({ message: 'Food type deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting food type', error: error.message });
  }
});

module.exports = router;