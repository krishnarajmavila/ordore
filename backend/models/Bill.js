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
  customerName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String
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
  cashierName: {
    type: String,
    required: true
  },
  restaurantInfo: {
    name: String,
    companyName: String,
    addressLine1: String,
    addressLine2: String,
    addressLine3: String,
    pincode: String,
    gstin: String
  },
  kotNumber: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Bill', BillSchema);