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
  tableNumber: String,
  status: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);