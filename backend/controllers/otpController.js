const otpService = require('../services/otpService');

exports.sendOtp = async (req, res) => {
  const { mobileNumber } = req.body;
  try {
    console.log('Attempting to send OTP to:', mobileNumber);
    await otpService.sendOtp(mobileNumber);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  const { mobileNumber, otp } = req.body;
  try {
    console.log('Attempting to verify OTP for:', mobileNumber);
    const result = await otpService.verifyOtp(mobileNumber, otp);
    if (result.valid) {
      res.json({ message: 'OTP verified successfully', valid: true });
    } else {
      res.status(400).json({ message: 'Invalid OTP', valid: false });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};