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

// Add any pre-save hooks or methods here if needed
FoodSchema.pre('save', function(next) {
  // You can add any pre-save logic here
  // For example, you could perform some data validation or transformation
  next();
});

// Add any static methods here if needed
FoodSchema.statics.findByRestaurant = function(restaurantId) {
  return this.find({ restaurant: restaurantId });
};

// Add any instance methods here if needed
FoodSchema.methods.toggleStock = function() {
  this.isInStock = !this.isInStock;
  return this.save();
};

module.exports = mongoose.model('Food', FoodSchema);