// Filename: models/Class.js


const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  code: String,
  gradeLevel: String,
  description: String,
  teachers: [{
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isPrimary: Boolean
  }],
  startDate: Date,
  endDate: Date,
  status: {
    type: String,
    enum: ["active", "completed", "cancelled", "archived"],
    default: "active"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

module.exports = mongoose.model('Class', classSchema);