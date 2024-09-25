// models/waiterCall.model.js
const mongoose = require('mongoose');

const waiterCallSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true
  },
  // You can add other fields if necessary
  acknowledged: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const WaiterCall = mongoose.model('WaiterCall', waiterCallSchema);
module.exports = WaiterCall;
