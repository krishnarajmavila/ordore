// reportRoutes.js
const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Get report data for a specific restaurant
router.get('/', auth, async (req, res) => {
  try {
    const { date, restaurantId } = req.query;
    
    if (!date || !restaurantId) {
      return res.status(400).json({ message: 'Date and Restaurant ID parameters are required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const endOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59, 999);

    // Daily data
    const dailyOrders = await Order.find({
      restaurant: restaurantId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const dailyRevenue = dailyOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const dailyOrderCount = dailyOrders.length;

    // Monthly data
    const monthlyOrders = await Order.find({
      restaurant: restaurantId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const monthlyOrderCount = monthlyOrders.length;

    // Calculate average order value
    const averageOrderValue = dailyOrderCount > 0 ? dailyRevenue / dailyOrderCount : 0;

    // Get top selling items
    const topSellingItems = await Order.aggregate([
      { $match: { restaurant: restaurantId, createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalQuantity: { $sum: '$items.quantity' } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      dailyRevenue,
      monthlyRevenue,
      dailyOrderCount,
      monthlyOrderCount,
      averageOrderValue,
      topSellingItems
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Error fetching report data', error: error.message });
  }
});

// Get combined report data across all restaurants
router.get('/combined', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const restaurants = await Restaurant.find({ createdBy: req.user.userId });
    
    let combinedReport = {
      totalRevenue: 0,
      totalOrderCount: 0,
      averageOrderValue: 0,
      restaurantReports: []
    };

    for (let restaurant of restaurants) {
      const orders = await Order.find({
        restaurant: restaurant._id,
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      const restaurantRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      const orderCount = orders.length;
      const averageOrderValue = orderCount > 0 ? restaurantRevenue / orderCount : 0;

      combinedReport.totalRevenue += restaurantRevenue;
      combinedReport.totalOrderCount += orderCount;

      combinedReport.restaurantReports.push({
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        revenue: restaurantRevenue,
        orderCount: orderCount,
        averageOrderValue: averageOrderValue
      });
    }

    combinedReport.averageOrderValue = combinedReport.totalOrderCount > 0 
      ? combinedReport.totalRevenue / combinedReport.totalOrderCount 
      : 0;

    // Get top selling items across all restaurants
    const topSellingItems = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalQuantity: { $sum: '$items.quantity' } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    combinedReport.topSellingItems = topSellingItems;

    res.json(combinedReport);
  } catch (error) {
    console.error('Error generating combined report:', error);
    res.status(500).json({ message: 'Error generating combined report', error: error.message });
  }
});

// Get daily sales trend for a specific restaurant
router.get('/sales-trend', auth, async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.query;

    if (!restaurantId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Restaurant ID, start date, and end date are required' });
    }

    const salesTrend = await Order.aggregate([
      {
        $match: {
          restaurant: restaurantId,
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(salesTrend);
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    res.status(500).json({ message: 'Error fetching sales trend', error: error.message });
  }
});

// Get category-wise sales for a specific restaurant
router.get('/category-sales', auth, async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.query;

    if (!restaurantId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Restaurant ID, start date, and end date are required' });
    }

    const categorySales = await Order.aggregate([
      {
        $match: {
          restaurant: restaurantId,
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'foods',
          localField: 'items.name',
          foreignField: 'name',
          as: 'foodInfo'
        }
      },
      { $unwind: '$foodInfo' },
      {
        $group: {
          _id: '$foodInfo.category',
          totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          itemCount: { $sum: '$items.quantity' }
        }
      },
      {
        $lookup: {
          from: 'foodtypes',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          category: '$categoryInfo.name',
          totalSales: 1,
          itemCount: 1
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    res.json(categorySales);
  } catch (error) {
    console.error('Error fetching category-wise sales:', error);
    res.status(500).json({ message: 'Error fetching category-wise sales', error: error.message });
  }
});

module.exports = router;