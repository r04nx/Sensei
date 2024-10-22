require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const { SensorData } = require('./models/sensorData');
const { PhoneNumber } = require('./models/phoneNumber');
const dataRoutes = require('./routes/data');
const smsRoutes = require('./routes/sms');
const downloadRoutes = require('./routes/download');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/data', dataRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/download', downloadRoutes);

// MQTT Client
const client = mqtt.connect(process.env.MQTT_BROKER);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (!err) {
      console.log(`Subscribed to ${process.env.MQTT_TOPIC}`);
    }
  });
});

client.on('message', async (topic, message) => {
  const data = message.toString().split(',').map(Number);
  const [voltage, current1, current2, current3, temperature, humidity] = data;

  const sensorData = new SensorData({
    voltage,
    current1,
    current2,
    current3,
    temperature,
    humidity,
  });

  // Check thresholds before saving
  const alerts = checkThresholds(sensorData);
  sensorData.warnings = alerts.filter(alert => alert.type === 'warning').map(alert => alert.message);
  sensorData.errors = alerts.filter(alert => alert.type === 'error').map(alert => alert.message);

  try {
    await sensorData.save();
    console.log('Sensor data saved to MongoDB');
    
    if (alerts.length > 0) {
      await sendAlerts(alerts);
    }
  } catch (error) {
    console.error('Error saving sensor data:', error);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Threshold checking function
function checkThresholds(data) {
  const alerts = [];
  const thresholds = {
    VOLTAGE: {
      LOW_AC_WARNING: Number(process.env.THRESHOLD_VOLTAGE_LOW_AC_WARNING),
      HIGH_AC_WARNING: Number(process.env.THRESHOLD_VOLTAGE_HIGH_AC_WARNING),
      HIGH_DC_WARNING: Number(process.env.THRESHOLD_VOLTAGE_HIGH_DC_WARNING),
      LOW_DC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_LOW_DC_ERROR),
      HIGH_AC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_HIGH_AC_ERROR),
      LOW_DC_ERROR_SECONDARY: Number(process.env.THRESHOLD_VOLTAGE_LOW_DC_ERROR_SECONDARY),
      HIGH_DC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_HIGH_DC_ERROR),
      MAINS_FAILURE: Number(process.env.THRESHOLD_VOLTAGE_MAINS_FAILURE),
      LOW_AC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_LOW_AC_ERROR),
    },
    CURRENT: {
      CRITICAL_LOAD: Number(process.env.THRESHOLD_CURRENT_CRITICAL_LOAD),
    },
  };

  // Voltage checks
  if (data.voltage < thresholds.VOLTAGE.LOW_AC_WARNING) {
    alerts.push({ 
      message: `⚠️ Low AC voltage warning! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.LOW_AC_WARNING} V`, 
      type: 'warning' 
    });
  }
  // if (data.voltage > thresholds.VOLTAGE.HIGH_AC_WARNING) {
  //   alerts.push({ 
  //     message: `⚠️ High AC voltage warning! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.HIGH_AC_WARNING} V`, 
  //     type: 'warning' 
  //   });
  // }
  // if (data.voltage > thresholds.VOLTAGE.HIGH_DC_WARNING) {
  //   alerts.push({ 
  //     message: `⚠️ High DC voltage warning! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.HIGH_DC_WARNING} V`, 
  //     type: 'warning' 
  //   });
  // }
  // if (data.voltage < thresholds.VOLTAGE.LOW_DC_ERROR) {
  //   alerts.push({ 
  //     message: `❌ Low DC voltage error! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.LOW_DC_ERROR} V`, 
  //     type: 'error' 
  //   });
  // }
  // if (data.voltage > thresholds.VOLTAGE.HIGH_AC_ERROR) {
  //   alerts.push({ 
  //     message: `❌ High AC voltage error! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.HIGH_AC_ERROR} V`, 
  //     type: 'error' 
  //   });
  // }
  // if (data.voltage < thresholds.VOLTAGE.LOW_DC_ERROR_SECONDARY) {
  //   alerts.push({ 
  //     message: `❌ Low DC voltage error (46V)! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.LOW_DC_ERROR_SECONDARY} V`, 
  //     type: 'error' 
  //   });
  // }
  // if (data.voltage > thresholds.VOLTAGE.HIGH_DC_ERROR) {
  //   alerts.push({ 
  //     message: `❌ High DC voltage error! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.HIGH_DC_ERROR} V`, 
  //     type: 'error' 
  //   });
  // }
  // if (data.voltage === thresholds.VOLTAGE.MAINS_FAILURE) {
  //   alerts.push({ 
  //     message: `❌ Mains failure detected! Current: ${data.voltage} V`, 
  //     type: 'error' 
  //   });
  // }
  // if (data.voltage < thresholds.VOLTAGE.LOW_AC_ERROR) {
  //   alerts.push({ 
  //     message: `❌ Low AC voltage error! Current: ${data.voltage} V, Threshold: ${thresholds.VOLTAGE.LOW_AC_ERROR} V`, 
  //     type: 'error' 
  //   });
  // }

  // // Current checks
  // const totalCurrent = data.current1 + data.current2 + data.current3;
  // if (totalCurrent > thresholds.CURRENT.CRITICAL_LOAD) {
  //   alerts.push({ 
  //     message: `⚠️ Critical load condition (overload)! Total Current: ${totalCurrent} A, Threshold: ${thresholds.CURRENT.CRITICAL_LOAD} A`, 
  //     type: 'warning' 
  //   });
  // }

  return alerts;
}

// Function to send alerts
async function sendAlerts(alerts) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const phoneNumbers = await PhoneNumber.find({ active: true });

  for (const alert of alerts) {
    const message = `${alert.type.toUpperCase()}: ${alert.message}`;

    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await client.messages.create({
          body: message,
          from: process.env.TWILIO_SENDER_PHONE,
          to: phoneNumber.number
        });
        console.log(`Alert sent to ${phoneNumber.number}. SID: ${result.sid}`);
      } catch (error) {
        console.error(`Failed to send alert to ${phoneNumber.number}:`, error.message);
      }
    }
  }
}

module.exports = app;