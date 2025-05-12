// Filename: routes/classes.js


const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Class = require('../models/Class');
const User = require('../models/User');

// Create class (Admin Only) - Tested via Postmam
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { name, code, gradeLevel, description, startDate, endDate } = req.body;
    const newClass = new Class({
      organizationId: req.user.organizationId,
      name,
      code,
      gradeLevel,
      description,
      startDate,
      endDate
    });
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all classes (Admin, Teacher, Student) - Tested via Postmam
router.get('/', auth(), async (req, res) => {
  try {
    const user = req.user;
    let query = { organizationId: user.organizationId };
    
    // For teachers, only show classes they teach
    if (user.role === 'teacher') {
      query['teachers.teacherId'] = user._id;
    }
    // For students, only show their current class
    else if (user.role === 'student') {
      if (!user.studentDetails?.currentClassId) {
        return res.json([]);
      }
      query._id = user.studentDetails.currentClassId;
    }
    
    const classes = await Class.find(query);
    res.json(classes);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get class by ID (Admin, Teacher, Student) - Tested via Postmam
router.get('/:id', auth(), async (req, res) => {
  try {
    const user = req.user;
    const classObj = await Class.findById(req.params.id);
    
    if (!classObj || !classObj.organizationId.equals(user.organizationId)) {
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
    
    res.json(classObj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update class (Admin Only) - Tested via Postmam
router.patch('/:id', auth(['admin']), async (req, res) => {
  try {
    const classObj = await Class.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { $set: req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!classObj) throw new Error('Class not found');
    res.json(classObj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add teacher to class (Admin Only) - Tested via Postmam
router.post('/:id/teachers', auth(['admin']), async (req, res) => {
  try {
    const { teacherId, isPrimary } = req.body;
    const teacher = await User.findOne({ 
      _id: teacherId, 
      organizationId: req.user.organizationId,
      role: 'teacher'
    });
    if (!teacher) throw new Error('Teacher not found');

    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { $addToSet: { teachers: { teacherId, isPrimary } } },
      { new: true }
    );
    if (!updatedClass) throw new Error('Class not found');
    res.json(updatedClass);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;