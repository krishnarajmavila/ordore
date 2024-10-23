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
    imageUrl: String,
    notes: String, 
    status: {  // Add this field for individual item status
      type: String,
      enum: ['pending', 'preparing', 'ready', 'completed'],
      default: 'pending'
    }
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

// Add a method to update the overall order status based on item statuses
OrderSchema.methods.updateOverallStatus = function() {
  const statuses = this.items.map(item => item.status);
  if (statuses.every(status => status === 'completed')) {
    this.status = 'completed';
  } else if (statuses.some(status => status === 'ready')) {
    this.status = 'ready';
  } else if (statuses.some(status => status === 'preparing')) {
    this.status = 'preparing';
  } else {
    this.status = 'pending';
  }
};

module.exports = mongoose.model('Order', OrderSchema);