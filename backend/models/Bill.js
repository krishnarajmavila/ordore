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
    required: true, 
    unique: true 
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
  date: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Add any pre-save hooks or methods here if needed
BillSchema.pre('save', function(next) {
  // You can add any pre-save logic here
  // For example, calculating totals if not provided
  if (!this.total) {
    this.total = this.subTotal + this.serviceCharge + this.gst;
  }
  next();
});

module.exports = mongoose.model('Bill', BillSchema);