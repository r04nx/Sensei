require('dotenv').config(); // Load environment variables from .env
const mqtt = require('mqtt');
const mongoose = require('mongoose');
require('dotenv/config')

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define a simple schema for storing test data
const testDataSchema = new mongoose.Schema({
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const TestData = mongoose.model('TestData', testDataSchema);

// Connect to the MQTT broker
const client = mqtt.connect(process.env.MQTT_BROKER);

client.on('connect', () => {
  console.log('Connected to MQTT broker');

  // Subscribe to the topic
  client.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (err) {
      console.error('Subscription error:', err);
    } else {
      console.log(`Subscribed to topic: ${process.env.MQTT_TOPIC}`);
    }
  });

  // Publish test data to the MQTT topic
  const testData = 'Test message from MQTT client';
  

// Listen for incoming MQTT messages
client.on('message', (topic, message) => {
  console.log(`Message received on topic ${topic}: ${message.toString()}`);

  // Save the message to MongoDB
  const newTestData = new TestData({ message: message.toString() });
  newTestData.save()
    .then(() => {
      console.log('Data saved to MongoDB:', message.toString());
    })
    .catch((err) => {
      console.error('Error saving data to MongoDB:', err);
    });
});

// Handle errors
client.on('error', (err) => {
  console.error('MQTT client error:', err);
});
