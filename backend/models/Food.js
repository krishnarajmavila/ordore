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
  isInStock: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Add a pre-save hook to ensure the category exists
FoodSchema.pre('save', async function(next) {
  if (this.isModified('category')) {
    const FoodType = mongoose.model('FoodType');
    const categoryExists = await FoodType.exists({ _id: this.category });
    if (!categoryExists) {
      next(new Error('Invalid category'));
    }
  }
  next();
});

module.exports = mongoose.model('Food', FoodSchema);