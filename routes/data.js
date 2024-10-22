const express = require('express');
const router = express.Router();
const { SensorData } = require('../models/sensorData');

// Get latest sensor data
router.get('/latest', async (req, res) => {
  try {
    const latestData = await SensorData.findOne().sort({ timestamp: -1 });
    res.json(latestData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching latest data', error: error.message });
  }
});

// Get sensor data within a date range
router.get('/range', async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const data = await SensorData.find({
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).sort({ timestamp: 1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data range', error: error.message });
  }
});

module.exports = router;