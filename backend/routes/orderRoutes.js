const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

module.exports = function(io) {
  // POST route to create a new order
  router.post('/', async (req, res) => {
    try {
      const { items, totalPrice, customerName, phoneNumber, tableNumber } = req.body;
      
      const newOrder = new Order({
        items,
        totalPrice,
        customerName,
        phoneNumber,
        tableNumber,
        status: 'pending'
      });

      const savedOrder = await newOrder.save();
      
      // Emit the 'newOrder' event only if io is defined
      if (io && typeof io.emit === 'function') {
        io.emit('newOrder', savedOrder);
      }

      res.status(201).json(savedOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // GET route to fetch all orders
  router.get('/', async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH route to update order status
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Emit the 'orderUpdated' event only if io is defined
      if (io && typeof io.emit === 'function') {
        io.emit('orderUpdated', updatedOrder);
      }

      res.json(updatedOrder);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  return router;
};