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
  tableOtp: String,  // Changed from tableNumber to tableOtp
  status: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);