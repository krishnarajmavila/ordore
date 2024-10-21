const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Restaurant = require('../models/Restaurant');
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
    const dailyBills = await Bill.find({
      restaurant: restaurantId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'paid'
    });

    const dailyRevenue = dailyBills.reduce((sum, bill) => sum + bill.total, 0);
    const dailyBillCount = dailyBills.length;

    // Monthly data
    const monthlyBills = await Bill.find({
      restaurant: restaurantId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'paid'
    });

    const monthlyRevenue = monthlyBills.reduce((sum, bill) => sum + bill.total, 0);
    const monthlyBillCount = monthlyBills.length;

    // Calculate average bill value
    const averageBillValue = dailyBillCount > 0 ? dailyRevenue / dailyBillCount : 0;

    // Get top selling items
    const topSellingItems = await Bill.aggregate([
      { 
        $match: { 
          restaurant: restaurantId, 
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          status: 'paid'
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

    res.json({
      dailyRevenue,
      monthlyRevenue,
      dailyBillCount,
      monthlyBillCount,
      averageBillValue,
      topSellingItems
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Error fetching report data', error: error.message });
  }
});

// Get weekly report
router.get('/weekly', auth, async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const bills = await Bill.find({
      restaurant: restaurantId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'paid'
    });

    const totalRevenue = bills.reduce((sum, bill) => sum + bill.total, 0);
    const totalBills = bills.length;
    const averageDailyRevenue = totalRevenue / 7;

    const dailyBillCounts = {};
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayString = day.toISOString().split('T')[0];
      dailyBillCounts[dayString] = 0;
    }

    bills.forEach(bill => {
      const dayString = bill.createdAt.toISOString().split('T')[0];
      dailyBillCounts[dayString] = (dailyBillCounts[dayString] || 0) + 1;
    });

    res.json({
      totalBills,
      totalRevenue,
      averageDailyRevenue,
      dailyBillCounts
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ message: 'Error generating weekly report', error: error.message });
  }
});

// Get most ordered items
router.get('/most-ordered', auth, async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const mostOrderedItems = await Bill.aggregate([
      { 
        $match: { 
          restaurant: restaurantId,
          status: 'paid'
        } 
      },
      { $unwind: '$items' },
      { 
        $group: { 
          _id: '$items.name', 
          count: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { 
        $project: {
          name: '$_id',
          count: 1,
          totalRevenue: 1,
          _id: 0
        }
      }
    ]);

    res.json(mostOrderedItems);
  } catch (error) {
    console.error('Error fetching most ordered items:', error);
    res.status(500).json({ message: 'Error fetching most ordered items', error: error.message });
  }
});

// Get recent bills
router.get('/recent', auth, async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const recentBills = await Bill.find({ restaurant: restaurantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('billNumber tableNumber total status createdAt');

    res.json(recentBills);
  } catch (error) {
    console.error('Error fetching recent bills:', error);
    res.status(500).json({ message: 'Error fetching recent bills', error: error.message });
  }
});

module.exports = router;