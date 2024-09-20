const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Auth Route - Environment variables loaded:', Object.keys(process.env));
console.log('Auth Route - JWT_SECRET:', process.env.JWT_SECRET ? 'Is set' : 'Is not set');

// Login route (existing)
router.post('/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;
    console.log('Login attempt:', { username, userType });

    const user = await User.findOne({ username, userType });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Stored hashed password:', user.password);
    console.log('Provided password:', password);

    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in the environment');
      return res.status(500).json({ message: 'Internal server error - JWT configuration issue' });
    }

    try {
      const token = jwt.sign(
        { userId: user._id, userType: user.userType },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      console.log('Token generated successfully');
      res.json({ token, userType: user.userType });
    } catch (jwtError) {
      console.error('Error generating JWT:', jwtError);
      return res.status(500).json({ message: 'Error generating authentication token' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Registration route (existing)
router.post('/register', auth, async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const newUser = new User({ username, password, userType });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// New route: Get all users
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// New route: Update a user
router.put('/users/:id', auth, async (req, res) => {
  try {
    const { username, userType, password } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = username || user.username;
    user.userType = userType || user.userType;
    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// New route: Delete a user
router.delete('/users/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;