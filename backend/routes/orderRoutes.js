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

  // PATCH route to update order status
  router.patch('/:id', checkRestaurantId, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const safeId = createSafeObjectId(id);
      if (!safeId) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: safeId, restaurant: req.restaurantId },
        { status },
        { new: true }
      );
      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found for this restaurant' });
      }

      if (io && typeof io.emit === 'function') {
        io.emit('orderUpdated', updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // DELETE route to delete a completed order and archive it
  router.delete('/:id', checkRestaurantId, async (req, res) => {
    try {
      const { id } = req.params;
      const safeId = createSafeObjectId(id);
      if (!safeId) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      const orderToDelete = await Order.findOne({ _id: safeId, restaurant: req.restaurantId });

      if (!orderToDelete) {
        return res.status(404).json({ message: 'Order not found for this restaurant' });
      }

      if (orderToDelete.status !== 'completed') {
        return res.status(400).json({ message: 'Only completed orders can be deleted' });
      }

      const archivedOrder = new ArchivedOrder({
        originalOrder: orderToDelete._id,
        orderData: orderToDelete.toObject(),
        restaurant: req.restaurantId
      });

      await archivedOrder.save();
      await Order.findOneAndDelete({ _id: safeId, restaurant: req.restaurantId });

      if (io && typeof io.emit === 'function') {
        io.emit('orderDeleted', id);
      }

      res.json({ message: 'Order deleted and archived successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  // Other routes (GET single order, GET by status, POST add item, DELETE remove item) 
  // should be updated similarly, using createSafeObjectId for all ID parameters.

  return router;
};