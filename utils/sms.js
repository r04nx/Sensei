const twilio = require('twilio');
const { PhoneNumber } = require('../models/phoneNumber');
require('dotenv').config();
require('dotenv/config')

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const senderPhone = process.env.TWILIO_SENDER_PHONE;
const client = twilio(accountSid, authToken);

const sendWarningOrErrorSMS = async (sensorData) => {
  try {
    const phoneNumbers = await PhoneNumber.find({ active: true });
    const messageBody = `Warning/Error:\nVoltage: ${sensorData.voltage}\nWarning: ${sensorData.warning}\nError: ${sensorData.error}`;

    // Send the SMS to all active numbers
    await Promise.all(phoneNumbers.map(async (phone) => {
      const message = await client.messages.create({
        body: messageBody,
        from: senderPhone,
        to: phone.number
      });
      console.log(`SMS sent successfully to ${phone.number}`);
    }));
  } catch (error) {
    console.error('Failed to send SMS:', error);
  }
};

module.exports = { sendWarningOrErrorSMS };
