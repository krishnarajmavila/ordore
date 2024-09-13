const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const upload = require('../middleware/upload');

// Get all food items
router.get('/', async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new food item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isVegetarian } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const newFood = new Food({
      name,
      category,
      price,
      description,
      imageUrl,
      isVegetarian: isVegetarian === 'true'
    });
    
    const savedFood = await newFood.save();
    res.status(201).json(savedFood);
  } catch (error) {
    console.error('Error adding food item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a food item
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isVegetarian } = req.body;
    const updateData = { name, category, price, description, isVegetarian: isVegetarian === 'true' };
    
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const updatedFood = await Food.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedFood) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating food item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a food item
router.delete('/:id', async (req, res) => {
  try {
    const deletedFood = await Food.findByIdAndDelete(req.params.id);
    if (!deletedFood) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json({ message: 'Food item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;