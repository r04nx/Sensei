const mongoose = require('mongoose');

mongoose.set('debug', true);

const sensorDataSchema = new mongoose.Schema({
  voltage: Number,
  current1: Number,
  current2: Number,
  current3: Number,
  temperature: Number,
  humidity: Number,
  timestamp: { type: Date, default: Date.now },
  warning: String,
  error: String
}, {
  writeConcern: {
    w: 'majority',
    j: true
  }
});

module.exports.SensorData = mongoose.model('SensorData', sensorDataSchema);