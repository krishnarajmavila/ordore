const express = require('express');
const router = express.Router();
const Table = require('../models/Table');

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
  const table = new Table({
    number: req.body.number,
    capacity: req.body.capacity
  });

  try {
    const newTable = await table.save();
    res.status(201).json(newTable);
  } catch (err) {
    res.status(400).json({ message: err.message });
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
  
      res.json(updatedTable);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

module.exports = router;