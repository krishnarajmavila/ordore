const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  billNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  tableNumber: { 
    type: String, 
    required: true 
  },
  tableOtp: { 
    type: String, 
    required: true 
  },
  items: [{
    name: String,
    price: Number,
    quantity: Number
  }],
  subTotal: { 
    type: Number, 
    required: true 
  },
  serviceCharge: { 
    type: Number, 
    required: true 
  },
  gst: { 
    type: Number, 
    required: true 
  },
  total: { 
    type: Number, 
    required: true 
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'other'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Bill', BillSchema);