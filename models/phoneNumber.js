const mongoose = require('mongoose');

const phoneNumberSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports.PhoneNumber = mongoose.model('PhoneNumber', phoneNumberSchema);