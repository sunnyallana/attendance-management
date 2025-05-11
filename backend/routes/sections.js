// routes/sections.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Section = require('../models/Section');
const Class = require('../models/Class');
const User = require('../models/User');

// Create section (admin/teacher)
router.post('/', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, name, schedule } = req.body;
    const user = req.user;
    
    // Verify the class exists and belongs to the organization
    const classObj = await Class.findOne({
      _id: classId,
      organizationId: user.organizationId
    });
    
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // For teachers, verify they teach this class
    if (user.role === 'teacher') {
      const isTeaching = classObj.teachers.some(t => t.teacherId.equals(user._id));
      if (!isTeaching) {
        return res.status(403).json({ error: 'Not teaching this class' });
      }
    }
    
    const section = new Section({
      organizationId: user.organizationId,
      classId,
      name,
      schedule
    });
    
    await section.save();
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get sections for a class
router.get('/', auth(), async (req, res) => {
  try {
    const { classId } = req.query;
    const user = req.user;
    
    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }
    
    // Verify the class exists and belongs to the organization
    const classObj = await Class.findOne({
      _id: classId,
      organizationId: user.organizationId
    });
    
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // For teachers, verify they teach this class
    if (user.role === 'teacher') {
      const isTeaching = classObj.teachers.some(t => t.teacherId.equals(user._id));
      if (!isTeaching) {
        return res.status(403).json({ error: 'Not teaching this class' });
      }
    }
    // For students, verify this is their current class
    else if (user.role === 'student') {
      if (!user.studentDetails?.currentClassId?.equals(classObj._id)) {
        return res.status(403).json({ error: 'Not your class' });
      }
    }
    
    const sections = await Section.find({ classId });
    res.json(sections);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add student to section (admin/teacher)
router.post('/:id/students', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId } = req.body;
    const user = req.user;
    const section = await Section.findById(req.params.id);
    
    if (!section || !section.organizationId.equals(user.organizationId)) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Verify the student exists and belongs to the organization
    const student = await User.findOne({
      _id: studentId,
      organizationId: user.organizationId,
      role: 'student',
      isActive: true
    });
    
    if (!student) {
      return res.status(400).json({ error: 'Student not found' });
    }
    
    // Verify the section's class matches the student's current class
    if (!student.studentDetails?.currentClassId?.equals(section.classId)) {
      return res.status(400).json({ error: 'Student not in this class' });
    }
    
    // For teachers, verify they teach this class
    if (user.role === 'teacher') {
      const classObj = await Class.findById(section.classId);
      const isTeaching = classObj.teachers.some(t => t.teacherId.equals(user._id));
      if (!isTeaching) {
        return res.status(403).json({ error: 'Not teaching this class' });
      }
    }
    
    // Check if student is already in the section
    if (section.students.some(s => s.equals(studentId))) {
      return res.status(400).json({ error: 'Student already in section' });
    }
    
    section.students.push(studentId);
    await section.save();
    
    // Update student's current section if not set
    if (!student.studentDetails?.currentSectionId) {
      student.studentDetails.currentSectionId = section._id;
      await student.save();
    }
    
    res.json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;