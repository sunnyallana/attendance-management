// routes/classes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Class = require('../models/Class');
const User = require('../models/User');

// Create class (admin/teacher)
router.post('/', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const { name, code, gradeLevel, description, startDate, endDate } = req.body;
    const user = req.user;
    
    const classData = {
      organizationId: user.organizationId,
      name,
      code,
      gradeLevel,
      description,
      startDate,
      endDate
    };
    
    const newClass = new Class(classData);
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all classes
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

// Get class by ID
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

// Update class (admin/teacher)
router.patch('/:id', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const user = req.user;
    const classObj = await Class.findById(req.params.id);
    
    if (!classObj || !classObj.organizationId.equals(user.organizationId)) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // For teachers, verify they teach this class and are primary
    if (user.role === 'teacher') {
      const teacherRole = classObj.teachers.find(t => t.teacherId.equals(user._id));
      if (!teacherRole || !teacherRole.isPrimary) {
        return res.status(403).json({ error: 'Not primary teacher for this class' });
      }
    }
    
    Object.assign(classObj, req.body);
    classObj.updatedAt = new Date();
    await classObj.save();
    res.json(classObj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add teacher to class (admin/primary teacher)
router.post('/:id/teachers', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const { teacherId, isPrimary } = req.body;
    const user = req.user;
    const classObj = await Class.findById(req.params.id);
    
    if (!classObj || !classObj.organizationId.equals(user.organizationId)) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Verify the teacher exists and belongs to the organization
    const teacher = await User.findOne({
      _id: teacherId,
      organizationId: user.organizationId,
      role: 'teacher',
      isActive: true
    });
    
    if (!teacher) {
      return res.status(400).json({ error: 'Teacher not found' });
    }
    
    // For teachers, verify they are primary teacher for this class
    if (user.role === 'teacher') {
      const teacherRole = classObj.teachers.find(t => t.teacherId.equals(user._id));
      if (!teacherRole || !teacherRole.isPrimary) {
        return res.status(403).json({ error: 'Not primary teacher for this class' });
      }
    }
    
    // Check if teacher is already in the class
    const existingTeacher = classObj.teachers.find(t => t.teacherId.equals(teacherId));
    if (existingTeacher) {
      return res.status(400).json({ error: 'Teacher already in class' });
    }
    
    classObj.teachers.push({ teacherId, isPrimary: !!isPrimary });
    await classObj.save();
    res.json(classObj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;