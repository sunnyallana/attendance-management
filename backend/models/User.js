// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  role: {
    type: String,
    enum: ['superAdmin', 'admin', 'teacher', 'student', 'parent'],
    required: true
  },
  contactInfo: {
    phone: String,
    address: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  teacherDetails: {
    department: String,
    employeeId: String,
    hireDate: Date
  },
  studentDetails: {
    grade: String,
    section: String,
    enrollmentNumber: String,
    enrollmentDate: Date
  },
  parentDetails: {
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  rfidCard: {
    uid: String,
    isActive: Boolean
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

module.exports = mongoose.model('User', userSchema);