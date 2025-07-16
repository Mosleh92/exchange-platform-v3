const express = require('express');
const router = express.Router();

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Exchange Platform API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;