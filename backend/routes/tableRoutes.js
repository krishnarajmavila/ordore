const express = require('express');
const router = express.Router();
const Table = require('../models/Table');

// Function to generate a 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Middleware to check and refresh OTP if needed
async function checkAndRefreshOTP(table) {
  const now = new Date();
  const otpAge = (now - table.otpGeneratedAt) / (1000 * 60 * 60); // Age in hours

  if (otpAge >= 8) {
    table.otp = generateOTP();
    table.otpGeneratedAt = now;
    await table.save();
  }
}
// Get a single table by ID
router.get('/:id', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    await checkAndRefreshOTP(table);
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get all tables
router.get('/', async (req, res) => {
  try {
    const tables = await Table.find();
    for (let table of tables) {
      await checkAndRefreshOTP(table);
    }
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new table
router.post('/', async (req, res) => {
  const table = new Table({
    number: req.body.number,
    capacity: req.body.capacity,
    otp: generateOTP()
  });

  try {
    const newTable = await table.save();
    res.status(201).json(newTable);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a table
router.put('/:id', async (req, res) => {
  try {
    const updatedTable = await Table.findByIdAndUpdate(
      req.params.id,
      {
        number: req.body.number,
        capacity: req.body.capacity,
        isOccupied: req.body.isOccupied
      },
      { new: true }
    );

    if (!updatedTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    await checkAndRefreshOTP(updatedTable);
    res.json(updatedTable);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Refresh OTP for a specific table
router.post('/:id/refresh-otp', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    table.otp = generateOTP();
    table.otpGeneratedAt = new Date();
    await table.save();

    res.json(table);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a table
router.delete('/:id', async (req, res) => {
  try {
    await Table.findByIdAndDelete(req.params.id);
    res.json({ message: 'Table deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;