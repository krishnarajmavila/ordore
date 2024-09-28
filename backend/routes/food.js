const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const FoodType = require('../models/FoodType');
const upload = require('../middleware/upload');
const mongoose = require('mongoose');

// Get all food items
router.get('/', async (req, res) => {
  try {
    const foods = await Food.find().populate('category');
    res.json(foods);
  } catch (error) {
    console.error('Error fetching food items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new food item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isVegetarian } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    let categoryId;
    if (mongoose.Types.ObjectId.isValid(category)) {
      const categoryExists = await FoodType.exists({ _id: category });
      if (!categoryExists) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      categoryId = category;
    } else {
      let foodType = await FoodType.findOne({ name: category });
      if (!foodType) {
        foodType = new FoodType({ name: category });
        await foodType.save();
      }
      categoryId = foodType._id;
    }
    
    const newFood = new Food({
      name,
      category: categoryId,
      price,
      description,
      imageUrl,
      isVegetarian: isVegetarian === 'true'
    });
    
    const savedFood = await newFood.save();
    const populatedFood = await Food.findById(savedFood._id).populate('category');
    res.status(201).json(populatedFood);
  } catch (error) {
    console.error('Error adding food item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a food item
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isVegetarian } = req.body;
    
    let categoryId;
    if (mongoose.Types.ObjectId.isValid(category)) {
      const categoryExists = await FoodType.exists({ _id: category });
      if (!categoryExists) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      categoryId = category;
    } else {
      let foodType = await FoodType.findOne({ name: category });
      if (!foodType) {
        foodType = new FoodType({ name: category });
        await foodType.save();
      }
      categoryId = foodType._id;
    }
    
    const updateData = { 
      name, 
      category: categoryId, 
      price, 
      description, 
      isVegetarian: isVegetarian === 'true' 
    };
    
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const updatedFood = await Food.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('category');
    if (!updatedFood) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating food item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update stock status
router.patch('/:id/stock', async (req, res) => {
  try {
    const { isInStock } = req.body;
    const updatedFood = await Food.findByIdAndUpdate(
      req.params.id, 
      { isInStock }, 
      { new: true }
    ).populate('category');
    if (!updatedFood) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating stock status:', error);
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
    console.error('Error deleting food item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search food items
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const foods = await Food.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).populate('category');

    res.json(foods);
  } catch (error) {
    console.error('Error searching food items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;