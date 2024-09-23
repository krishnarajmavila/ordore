const express = require('express');
const router = express.Router();
const OtpUser = require('../models/OtpUser');

// Route to save OTP user
router.post('/save-otp-user', async (req, res) => {
  try {
    const { name, phoneNumber, tableOtp } = req.body;

    // Create a new OTP user entry without checking for existing records
    const otpUser = new OtpUser({
      name,
      phoneNumber,
      tableOtp
    });

    await otpUser.save();

    res.status(201).json({ message: 'OTP user saved successfully', user: otpUser });
  } catch (error) {
    console.error('Error saving OTP user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// New API to find users with the same tableOtp
router.get('/users-by-table-otp/:tableOtp', async (req, res) => {
  try {
    const { tableOtp } = req.params;
    
    // Find users with the same tableOtp
    const users = await OtpUser.find({ tableOtp });
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users by tableOtp:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
