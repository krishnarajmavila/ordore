const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Food = require('../models/Food');
const FoodType = require('../models/FoodType');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// Get all food items for a restaurant
router.get('/', async (req, res) => {
  try {
    console.log('Received GET request for food items');
    console.log('Query params:', req.query);

    const { restaurantId } = req.query;
    console.log('Extracted restaurant ID:', restaurantId);
    
    if (!restaurantId) {
      console.log('Restaurant ID is missing in the request');
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      console.log('Invalid restaurant ID format:', restaurantId);
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }

    console.log('Executing Food.find() with restaurantId:', restaurantId);
    const foods = await Food.find({ restaurant: restaurantId }).populate('category');
    console.log(`Found ${foods.length} food items`);
    
    res.json(foods);
  } catch (error) {
    console.error('Error fetching food items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific food item
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurant)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const food = await Food.findOne({ _id: id, restaurant }).populate('category');
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    res.json(food);
  } catch (error) {
    console.error('Error fetching food item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new food item
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Received request to add food item:', req.body);
    console.log('File:', req.file);

    const { name, category, price, description, isVegetarian, restaurant } = req.body;

    if (!name || !category || !price || !restaurant) {
      return res.status(400).json({ 
        message: 'Name, category, price, and restaurant ID are required',
        receivedData: { name, category, price, restaurant }
      });
    }

    if (!mongoose.Types.ObjectId.isValid(restaurant)) {
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }

    let categoryId;
    if (mongoose.Types.ObjectId.isValid(category)) {
      const categoryExists = await FoodType.exists({ _id: category, restaurant });
      if (!categoryExists) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      categoryId = category;
    } else {
      let foodType = await FoodType.findOne({ name: category, restaurant });
      if (!foodType) {
        foodType = new FoodType({ name: category, restaurant });
        await foodType.save();
      }
      categoryId = foodType._id;
    }

    let imageUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }
    
    const newFood = new Food({
      name,
      category: categoryId,
      price: parseFloat(price),
      description,
      imageUrl,
      isVegetarian: isVegetarian === 'true',
      restaurant
    });
    
    const savedFood = await newFood.save();
    const populatedFood = await Food.findById(savedFood._id).populate('category');
    console.log('Food item saved successfully:', populatedFood);
    res.status(201).json(populatedFood);
  } catch (error) {
    console.error('Error adding food item:', error);
    res.status(400).json({ message: 'Error adding food item', error: error.message });
  }
});

// Update a food item
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, isVegetarian, restaurant } = req.body;
    console.log('Received request to update food item:', req.body);

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurant)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    let categoryId;
    if (mongoose.Types.ObjectId.isValid(category)) {
      const categoryExists = await FoodType.exists({ _id: category, restaurant });
      if (!categoryExists) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      categoryId = category;
    } else {
      let foodType = await FoodType.findOne({ name: category, restaurant });
      if (!foodType) {
        foodType = new FoodType({ name: category, restaurant });
        await foodType.save();
      }
      categoryId = foodType._id;
    }
    
    const updateData = { 
      name, 
      category: categoryId, 
      price: parseFloat(price), 
      description, 
      isVegetarian: isVegetarian === 'true' 
    };
    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      updateData.imageUrl = result.secure_url;
    }
    
    const updatedFood = await Food.findOneAndUpdate(
      { _id: id, restaurant },
      updateData,
      { new: true, runValidators: true }
    ).populate('category');

    if (!updatedFood) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    console.log('Food item updated successfully:', updatedFood);
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating food item:', error);
    res.status(400).json({ message: 'Error updating food item', error: error.message });
  }
});

// Delete a food item
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurant)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const deletedFood = await Food.findOneAndDelete({ _id: id, restaurant });
    if (!deletedFood) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    // If there's an image associated with this food item, delete it from Cloudinary
    if (deletedFood.imageUrl) {
      const publicId = deletedFood.imageUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    console.log('Food item deleted successfully:', deletedFood);
    res.json({ message: 'Food item deleted successfully' });
  } catch (error) {
    console.error('Error deleting food item:', error);
    res.status(500).json({ message: 'Error deleting food item', error: error.message });
  }
});

// Update stock status
router.patch('/:id/stock', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isInStock, restaurant } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurant)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const updatedFood = await Food.findOneAndUpdate(
      { _id: id, restaurant },
      { isInStock },
      { new: true, runValidators: true }
    ).populate('category');

    if (!updatedFood) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    console.log('Stock status updated successfully:', updatedFood);
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating stock status:', error);
    res.status(400).json({ message: 'Error updating stock status', error: error.message });
  }
});

module.exports = router;