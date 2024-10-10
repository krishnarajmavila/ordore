const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Table = require('../models/Table');
const ArchivedOrder = require('../models/archivedOrder.model');
const auth = require('../middleware/auth');

// Robust ObjectId creation utility
const createSafeObjectId = (id) => {
  if (id === null || id === undefined) {
    return null;
  }
  try {
    if (typeof id === 'string') {
      return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
    }
    if (id instanceof mongoose.Types.ObjectId) {
      return id;
    }
    return null;
  } catch (error) {
    console.error('Error creating ObjectId:', error);
    return null;
  }
};

// Middleware to check for restaurantId
const checkRestaurantId = (req, res, next) => {
  const restaurantId = req.body.restaurant || req.query.restaurantId || req.params.restaurantId;
  console.log('Received restaurantId:', restaurantId);

  const safeRestaurantId = createSafeObjectId(restaurantId);
  if (!safeRestaurantId) {
    return res.status(400).json({ message: 'Invalid restaurant ID' });
  }
  req.restaurantId = safeRestaurantId;
  next();
};

module.exports = function(io) {
  // POST route to create a new order
  router.post('/', checkRestaurantId, async (req, res) => {
    try {
      const { items, totalPrice, customerName, phoneNumber, tableOtp } = req.body;
      
      const table = await Table.findOne({ otp: tableOtp, restaurant: req.restaurantId });
      if (!table) {
        return res.status(404).json({ message: 'Table not found for this restaurant' });
      }

      const itemsWithCategory = items.map(item => ({
        ...item,
        category: createSafeObjectId(item.category) || item.category
      }));

      const newOrder = new Order({
        items: itemsWithCategory,
        totalPrice,
        customerName,
        phoneNumber,
        tableOtp,
        tableNumber: table.number,
        status: 'pending',
        restaurant: req.restaurantId
      });

      const savedOrder = await newOrder.save();
      
      if (io && typeof io.emit === 'function') {
        io.emit('newOrder', savedOrder);
      }

      res.status(201).json(savedOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // GET route to fetch orders, with optional tableOtp filter
  router.get('/', checkRestaurantId, async (req, res) => {
    try {
      const { tableOtp } = req.query;
      let query = { restaurant: req.restaurantId };
      
      if (tableOtp) {
        query.tableOtp = tableOtp;
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  router.patch('/:id/item/:itemIndex', checkRestaurantId, async (req, res) => {
    try {
      const { id, itemIndex } = req.params;
      const { status } = req.body;
  
      const order = await Order.findOne({ 
        _id: id, 
        restaurant: req.restaurantId
      });
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found for this restaurant' });
      }
  
      if (itemIndex < 0 || itemIndex >= order.items.length) {
        return res.status(404).json({ message: 'Item index out of range' });
      }
  
      order.items[itemIndex].status = status;
      order.updateOverallStatus();  // Use the method we defined in the schema
  
      await order.save();
  
      if (io && typeof io.emit === 'function') {
        io.emit('orderUpdated', order);
      }
  
      res.json(order);
    } catch (error) {
      console.error('Error updating item status:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });
  // DELETE route to delete a completed order and archive it
  router.delete('/:orderId/items/:itemIndex', async (req, res) => {
    try {
      const { orderId, itemIndex } = req.params;
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      const itemIndexNum = parseInt(itemIndex, 10);
  
      if (isNaN(itemIndexNum) || itemIndexNum < 0 || itemIndexNum >= order.items.length) {
        return res.status(400).json({ message: 'Invalid item index' });
      }
  
      // Remove the item at the specified index
      order.items.splice(itemIndexNum, 1);
  
      // Recalculate the total price
      order.totalPrice = order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
      if (order.items.length === 0) {
        // If no items left, delete the entire order
        await Order.findByIdAndDelete(orderId);
        return res.status(200).json(null);
      } else {
        // Save the updated order
        const updatedOrder = await order.save();
        return res.status(200).json(updatedOrder);
      }
    } catch (error) {
      console.error('Error deleting order item:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Other routes (GET single order, GET by status, POST add item, DELETE remove item) 
  // should be updated similarly, using createSafeObjectId for all ID parameters.

  return router;
};