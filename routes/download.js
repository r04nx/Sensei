const express = require('express');
const router = express.Router();
const { SensorData } = require('../models/sensorData');
const { Parser } = require('json2csv');

router.post('/', async (req, res) => {
  const { startDate, endDate, columns } = req.body;

  try {
    const query = {};
    if (startDate && endDate) {
      query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const data = await SensorData.find(query).sort({ timestamp: 1 });

    const fields = Object.keys(columns).filter(key => columns[key]);
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('sensor_data.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading data', error: error.message });
  }
});

module.exports = router;