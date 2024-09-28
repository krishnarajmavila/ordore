const express = require('express');
const router = express.Router();
const Table = require('../models/Table');

// Function to generate a 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Get a single table by ID
router.get('/:id', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all tables
router.get('/', async (req, res) => {
  try {
    const tables = await Table.find();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new table
router.post('/', async (req, res) => {
  const tableData = {
    number: req.body.number,
    capacity: req.body.capacity,
    otp: generateOTP()
  };

  if (req.body.location) {
    tableData.location = req.body.location;
  }

  const table = new Table(tableData);

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
    const updateData = {
      number: req.body.number,
      capacity: req.body.capacity,
      isOccupied: req.body.isOccupied
    };

    if (req.body.location !== undefined) {
      updateData.location = req.body.location;
    }

    const updatedTable = await Table.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(updatedTable);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Manually refresh OTP for a specific table
router.post('/:id/refresh-otp', async (req, res) => {
  try {
    const newOtp = generateOTP();
    const updatedTable = await Table.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          otp: newOtp,
          otpGeneratedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(updatedTable);
  } catch (err) {
    console.error('Error refreshing OTP:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a table
router.delete('/:id', async (req, res) => {
  try {
    const deletedTable = await Table.findByIdAndDelete(req.params.id);
    if (!deletedTable) {
      return res.status(404).json({ message: 'Table not found' });
    }
    res.json({ message: 'Table deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;