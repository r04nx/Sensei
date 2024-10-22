const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { PhoneNumber } = require('../models/phoneNumber');
require('dotenv/config')
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send SMS to all active phone numbers
router.post('/broadcast', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const phoneNumbers = await PhoneNumber.find({ active: true });
    const results = await Promise.all(phoneNumbers.map(phone => 
      client.messages.create({
        body: message,
        from: process.env.TWILIO_SENDER_PHONE,
        to: phone.number
      })
    ));

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send broadcast messages', details: error.message });
  }
});

// Add a new phone number
router.post('/add-number', async (req, res) => {
  const { number } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const newNumber = new PhoneNumber({ number });
    await newNumber.save();
    res.json({ success: true, number: newNumber });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add phone number', details: error.message });
  }
});

module.exports = router;