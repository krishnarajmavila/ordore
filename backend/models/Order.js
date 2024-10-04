const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  items: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodType',
      required: true
    },
    imageUrl: String
  }],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  customerName: {
    type: String,
    required: true
  },
  phoneNumber: String,
  tableOtp: {
    type: String,
    required: true
  },
  tableNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  }
}, {
  timestamps: true
});

// Add a pre-save hook to calculate the total price if not provided
OrderSchema.pre('save', function(next) {
  if (!this.totalPrice) {
    this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);