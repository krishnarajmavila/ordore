const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Table = require('../models/Table');
const ArchivedOrder = require('../models/archivedOrder.model');
const auth = require('../middleware/auth');

// Middleware to check for restaurantId
const checkRestaurantId = (req, res, next) => {
  const restaurantId = req.body.restaurant || req.query.restaurantId || req.params.restaurantId;
  console.log('Received restaurantId:', restaurantId);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  console.log('Request params:', req.params);

  if (!restaurantId) {
    return res.status(400).json({ message: 'Restaurant ID is required' });
  }
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    return res.status(400).json({ message: 'Invalid restaurant ID format' });
  }
  req.restaurantId = restaurantId;
  next();
};

module.exports = function(io) {
  // POST route to create a new order
  router.post('/', checkRestaurantId, async (req, res) => {
    try {
      const { items, totalPrice, customerName, phoneNumber, tableOtp } = req.body;
      
      // Find the table with the given OTP and restaurant
      const table = await Table.findOne({ otp: tableOtp, restaurant: req.restaurantId });
      if (!table) {
        return res.status(404).json({ message: 'Table not found for this restaurant' });
      }

      // Ensure each item has a category
      const itemsWithCategory = items.map(item => ({
        ...item,
        category: mongoose.Types.ObjectId(item.category) // Convert category to ObjectId
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

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: id, restaurant: req.restaurantId },
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
      const orderToDelete = await Order.findOne({ _id: id, restaurant: req.restaurantId });

      if (!orderToDelete) {
        return res.status(404).json({ message: 'Order not found for this restaurant' });
      }

      if (orderToDelete.status !== 'completed') {
        return res.status(400).json({ message: 'Only completed orders can be deleted' });
      }

      // Create an archived order
      const archivedOrder = new ArchivedOrder({
        originalOrder: orderToDelete._id,
        orderData: orderToDelete.toObject(),
        restaurant: req.restaurantId
      });

      await archivedOrder.save();

      // Delete the original order
      await Order.findOneAndDelete({ _id: id, restaurant: req.restaurantId });

      if (io && typeof io.emit === 'function') {
        io.emit('orderDeleted', id);
      }

      res.json({ message: 'Order deleted and archived successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  // GET route to fetch a single order by ID
  router.get('/:id', checkRestaurantId, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findOne({ _id: id, restaurant: req.restaurantId });

      if (!order) {
        return res.status(404).json({ message: 'Order not found for this restaurant' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET route to fetch orders by status
  router.get('/status/:status', checkRestaurantId, async (req, res) => {
    try {
      const { status } = req.params;
      const orders = await Order.find({ status, restaurant: req.restaurantId }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST route to add an item to an existing order
  router.post('/:id/items', checkRestaurantId, async (req, res) => {
    try {
      const { id } = req.params;
      const { item } = req.body;

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: id, restaurant: req.restaurantId },
        { $push: { items: item }, $inc: { totalPrice: item.price * item.quantity } },
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

  // DELETE route to remove an item from an existing order
  router.delete('/:orderId/items/:itemId', checkRestaurantId, async (req, res) => {
    try {
      const { orderId, itemId } = req.params;

      const order = await Order.findOne({ _id: orderId, restaurant: req.restaurantId });
      if (!order) {
        return res.status(404).json({ message: 'Order not found for this restaurant' });
      }

      const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found in the order' });
      }

      const removedItem = order.items[itemIndex];
      order.items.splice(itemIndex, 1);
      order.totalPrice -= removedItem.price * removedItem.quantity;

      await order.save();

      if (io && typeof io.emit === 'function') {
        io.emit('orderUpdated', order);
      }

      res.json(order);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  return router;
};