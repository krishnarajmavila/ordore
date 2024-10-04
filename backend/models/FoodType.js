const mongoose = require('mongoose');

const FoodTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  }
}, {
  timestamps: true
});

// Create a compound index for name and restaurant
FoodTypeSchema.index({ name: 1, restaurant: 1 }, { unique: true });

module.exports = mongoose.model('FoodType', FoodTypeSchema);