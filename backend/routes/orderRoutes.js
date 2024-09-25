const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');
const ArchivedOrder = require('../models/archivedOrder.model');

module.exports = function(io) {
  // POST route to create a new order
  router.post('/', async (req, res) => {
    try {
      const { items, totalPrice, customerName, phoneNumber, tableOtp } = req.body;
      
      // Find the table with the given OTP
      const table = await Table.findOne({ otp: tableOtp });
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }

      const newOrder = new Order({
        items,
        totalPrice,
        customerName,
        phoneNumber,
        tableOtp,
        tableNumber: table.number,
        status: 'pending'
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
  router.get('/', async (req, res) => {
    try {
      const { tableOtp } = req.query;
      let query = {};
      
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
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found' });
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
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const orderToDelete = await Order.findById(id);

      if (!orderToDelete) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (orderToDelete.status !== 'completed') {
        return res.status(400).json({ message: 'Only completed orders can be deleted' });
      }

      // Create an archived order
      const archivedOrder = new ArchivedOrder({
        originalOrder: orderToDelete._id,
        orderData: orderToDelete.toObject()
      });

      await archivedOrder.save();

      // Delete the original order
      await Order.findByIdAndDelete(id);

      if (io && typeof io.emit === 'function') {
        io.emit('orderDeleted', id);
      }

      res.json({ message: 'Order deleted and archived successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  return router;
};