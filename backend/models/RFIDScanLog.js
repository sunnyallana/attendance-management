// Filename: models/RFIDScanLog.js


const mongoose = require('mongoose');

const rfidScanLogSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  rfidUid: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: String,
  scanType: {
    type: String,
    enum: ["entry", "exit"]
  },
  status: {
    type: String,
    enum: ["success", "failed", "unknown_card"],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RFIDScanLog', rfidScanLogSchema);