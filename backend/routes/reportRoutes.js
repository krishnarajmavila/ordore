const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Get most ordered items
router.get('/most-ordered', auth, async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setHours(23, 59, 59, 999);

    console.log('Most Ordered Query parameters:', {
      restaurantId,
      startOfMonth,
      endOfMonth
    });

    const mostOrderedItems = await Bill.aggregate([
      {
        $match: {
          restaurant: new mongoose.Types.ObjectId(restaurantId),
          status: 'paid',
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] }
          },
          averagePrice: { $avg: '$items.price' },
          itemsCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: '$_id',
          totalQuantity: { $round: ['$totalQuantity', 0] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          averagePrice: { $round: ['$averagePrice', 2] },
          orderCount: '$itemsCount',
          _id: 0
        }
      }
    ]);

    console.log('Found most ordered items:', mostOrderedItems);

    if (mostOrderedItems.length === 0) {
      const billCount = await Bill.countDocuments({
        restaurant: new mongoose.Types.ObjectId(restaurantId),
        status: 'paid',
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });

      console.log('Debug info for empty results:', {
        totalBills: billCount,
        timeRange: {
          start: startOfMonth,
          end: endOfMonth
        }
      });
    }

    res.json(mostOrderedItems);

  } catch (error) {
    console.error('Error in most-ordered aggregation:', error);
    res.status(500).json({ 
      message: 'Error fetching most ordered items', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get weekly report
router.get('/weekly', auth, async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    // Calculate date range for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    console.log('Weekly Report Query:', {
      restaurantId,
      startDate,
      endDate
    });

    // Get daily stats
    const dailyStats = await Bill.aggregate([
      {
        $match: {
          restaurant: new mongoose.Types.ObjectId(restaurantId),
          status: 'paid',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Initialize data structure
    const dailyOrderCounts = {};
    let totalRevenue = 0;
    let totalBills = 0;

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyOrderCounts[dateStr] = 0;
    }

    // Fill in actual data
    dailyStats.forEach(stat => {
      const dateStr = stat._id.date;
      dailyOrderCounts[dateStr] = stat.count;
      totalRevenue += stat.revenue;
      totalBills += stat.count;
    });

    const averageDailyRevenue = totalBills > 0 ? totalRevenue / 7 : 0;

    const response = {
      totalBills,
      totalRevenue,
      averageDailyRevenue,
      dailyOrderCounts
    };

    console.log('Weekly Report Response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ 
      message: 'Error generating weekly report',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get daily report
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

    console.log('Daily Report Query parameters:', {
      restaurantId,
      startOfDay,
      endOfDay
    });

    // Daily bills
    const dailyBills = await Bill.find({
      restaurant: new mongoose.Types.ObjectId(restaurantId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'paid'
    });

    const dailyRevenue = dailyBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const dailyBillCount = dailyBills.length;

    // Monthly data
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const endOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyBills = await Bill.find({
      restaurant: new mongoose.Types.ObjectId(restaurantId),
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'paid'
    });

    const monthlyRevenue = monthlyBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const monthlyBillCount = monthlyBills.length;
    const averageBillValue = dailyBillCount > 0 ? dailyRevenue / dailyBillCount : 0;

    // Get top selling items for the day
    const topSellingItems = await Bill.aggregate([
      {
        $match: {
          restaurant: new mongoose.Types.ObjectId(restaurantId),
          status: 'paid',
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    const response = {
      dailyRevenue,
      monthlyRevenue,
      dailyBillCount,
      monthlyBillCount,
      averageBillValue,
      topSellingItems
    };

    console.log('Daily report response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ 
      message: 'Error generating report',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Report Routes Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = router;