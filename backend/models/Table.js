const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: false
  },
  isOccupied: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    required: true
  },
  otpGeneratedAt: {
    type: Date,
    default: Date.now
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  isPayInitiated: {
    type: Boolean,
    default: false
  },
  paymentType: {
    type: String,
    default: null
  }
});

// Method to check if OTP is valid (less than 8 hours old)
TableSchema.methods.isOtpValid = function() {
  const now = new Date();
  const otpAge = (now - this.otpGeneratedAt) / (1000 * 60 * 60); // age in hours
  return otpAge < 8;
};

module.exports = mongoose.model('Table', TableSchema);