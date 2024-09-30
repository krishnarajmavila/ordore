const mongoose = require('mongoose');

const FoodSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FoodType', 
    required: true 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  description: { 
    type: String,
    trim: true
  },
  imageUrl: { 
    type: String 
  },
  isVegetarian: { 
    type: Boolean, 
    required: true 
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  isInStock: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Food', FoodSchema);