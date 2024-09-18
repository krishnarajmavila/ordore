const mongoose = require('mongoose');

const ArchivedOrderSchema = new mongoose.Schema({
  originalOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  archivedAt: {
    type: Date,
    default: Date.now
  },
  orderData: {
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
    status: String,
    createdAt: Date
  }
});

module.exports = mongoose.model('ArchivedOrder', ArchivedOrderSchema);