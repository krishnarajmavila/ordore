// routes/waiterCallRoutes.js

const express = require('express');
const router = express.Router();

// POST route to acknowledge a waiter call
router.post('/acknowledge', (req, res) => {
  const { tableId } = req.body;  // Only expecting tableId

  // Logic to handle acknowledgment
  if (tableId) {
    // Add logic to store this acknowledgment in the database or perform any necessary action
    return res.status(200).json({
      message: 'Waiter call acknowledged successfully',
      tableId, // Respond with the tableId
    });
  } else {
    return res.status(400).json({
      error: 'Missing tableId', // Only indicate missing tableId
    });
  }
});

module.exports = router;
