const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodType',
      required: true
    }
  }],
  totalPrice: Number,
  customerName: String,
  phoneNumber: String,
  tableOtp: String,
  tableNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'completed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  }
});

module.exports = mongoose.model('Order', OrderSchema);