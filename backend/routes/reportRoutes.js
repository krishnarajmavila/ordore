const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Adjust the path as needed

// GET report data
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const endOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59, 999);

    // Daily data
    const dailyOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const dailyRevenue = dailyOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const dailyOrderCount = dailyOrders.length;

    // Monthly data
    const monthlyOrders = await Order.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const monthlyOrderCount = monthlyOrders.length;

    // Calculate average order value
    const averageOrderValue = dailyOrderCount > 0 ? dailyRevenue / dailyOrderCount : 0;

    res.json({
      dailyRevenue,
      monthlyRevenue,
      orderCount: dailyOrderCount,
      averageOrderValue,
      // You can add more data points here as needed
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Error fetching report data', error: error.message });
  }
});

module.exports = router;