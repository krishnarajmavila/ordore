const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const User = require('../models/User');

// Validate Table OTP
router.post('/validate', async (req, res) => {
    try {
      const { tableOtp } = req.body;
      
      const table = await Table.findOne({ otp: tableOtp });
      
      if (table) {
        // Check if the method exists before calling it
        if (typeof table.isOtpValid === 'function') {
          const isValid = table.isOtpValid();
          res.json({ valid: isValid, message: isValid ? 'Valid OTP' : 'Table OTP has expired' });
        } else {
          // Fallback if the method doesn't exist
          const now = new Date();
          const otpAge = (now - table.otpGeneratedAt) / (1000 * 60 * 60); // age in hours
          const isValid = otpAge < 8;
          res.json({ valid: isValid, message: isValid ? 'Valid OTP' : 'Table OTP has expired' });
        }
      } else {
        res.json({ valid: false, message: 'Invalid Table OTP' });
      }
    } catch (err) {
      console.error('Error validating Table OTP:', err);
      res.status(500).json({ message: 'Error validating Table OTP' });
    }
  });

// Send customer OTP after validating Table OTP
router.post('/send-customer-otp', async (req, res) => {
  try {
    const { name, mobileNumber, tableOtp } = req.body;

    const table = await Table.findOne({ otp: tableOtp });
    if (!table || !table.isOtpValid()) {
      return res.status(400).json({ message: table ? 'Table OTP has expired' : 'Invalid Table OTP' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to user (or create new user if doesn't exist)
    let user = await User.findOne({ mobileNumber });
    if (!user) {
      user = new User({ name, mobileNumber });
    }
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
    await user.save();

    // Send OTP (implement your OTP sending logic here)
    // For example: await sendSMS(mobileNumber, `Your OTP is: ${otp}`);

    res.json({ message: 'Customer OTP sent successfully' });
  } catch (error) {
    console.error('Error sending customer OTP:', error);
    res.status(500).json({ message: 'Error sending customer OTP' });
  }
});

// Refresh Table OTP
router.post('/refresh', async (req, res) => {
  try {
    const { tableId } = req.body;
    
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    table.generateNewOtp();
    await table.save();

    res.json({ message: 'Table OTP refreshed successfully', otp: table.otp });
  } catch (error) {
    console.error('Error refreshing Table OTP:', error);
    res.status(500).json({ message: 'Error refreshing Table OTP' });
  }
});

module.exports = router;