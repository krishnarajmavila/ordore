const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true
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
  }
});

// Method to check if OTP is valid (less than 8 hours old)
TableSchema.methods.isOtpValid = function() {
  const now = new Date();
  const otpAge = (now - this.otpGeneratedAt) / (1000 * 60 * 60); // age in hours
  return otpAge < 8;
};

module.exports = mongoose.model('Table', TableSchema);