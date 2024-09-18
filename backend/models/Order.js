const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  items: [{
    name: String,
    price: Number,
    quantity: Number
  }],
  totalPrice: Number,
  customerName: String,
  phoneNumber: String,
  tableOtp: String,
  tableNumber: Number,
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'completed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);