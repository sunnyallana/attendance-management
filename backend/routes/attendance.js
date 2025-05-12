// Filename: routes/attendance.js


const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');
const RFIDScanLog = require('../models/RFIDScanLog');
const socket = require('../socket');


// RFID-based attendance marking
router.post('/rfid', async (req, res) => {
  try {
    const { rfidUid, location, scanType } = req.body;
    
    // Find user by RFID UID
    const user = await User.findOne({ 'rfidCard.uid': rfidUid, isActive: true });
    
    // Log the scan attempt
    const scanLog = new RFIDScanLog({
      organizationId: user?.organizationId,
      rfidUid,
      userId: user?._id,
      location,
      scanType,
      status: user ? 'success' : 'unknown_card'
    });
    await scanLog.save();
    
    if (!user) {
      return res.status(404).json({ error: 'RFID card not recognized' });
    }
    
    // Handle attendance based on scan type
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      studentId: user._id,
      date: { $gte: today }
    });
    
    if (!attendance) {
      attendance = new Attendance({
        organizationId: user.organizationId,
        studentId: user._id,
        date: new Date(),
        status: 'present'
      });
      
      // If student, add class/section info
      if (user.role === 'student' && user.studentDetails?.currentClassId) {
        attendance.classId = user.studentDetails.currentClassId;
        attendance.sectionId = user.studentDetails.currentSectionId;
      }
    }
    
    if (scanType === 'entry') {
      attendance.entryTime = new Date();
      attendance.status = attendance.status === 'absent' ? 'late' : attendance.status;
    } else if (scanType === 'exit') {
      attendance.exitTime = new Date();
      
      // Calculate total time present if both entry and exit times exist
      if (attendance.entryTime && attendance.exitTime) {
        const diffMs = attendance.exitTime - attendance.entryTime;
        attendance.totalTimePresent = Math.round(diffMs / (1000 * 60)); // in minutes
      }
    }
    
    await attendance.save();

    // Emit notification to parent if student has attendance marked
    if (user.role === 'student') {
      const parents = await User.find({
        'parentDetails.children': user._id,
        isActive: true
      });

        // Create notifications
      const notificationPromises = parents.map(parent => {
        const notification = new Notification({
          parentId: parent._id,
          studentId: user._id,
          attendanceId: attendance._id,
          message: `Attendance marked as ${attendance.status} for ${user.firstName} ${user.lastName}`
        });
        return notification.save();
      });
      
      await Promise.all(notificationPromises);
      
      parents.forEach(parent => {
        socket.getIO().to(parent._id.toString()).emit('attendanceUpdate', {
          studentId: user._id,
          studentName: `${user.firstName} ${user.lastName}`,
          status: attendance.status,
          time: new Date(),
          entryTime: attendance.entryTime,
          exitTime: attendance.exitTime
        });
      });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Manual attendance marking (for teachers/admins)
router.post('/manual', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const { studentId, date, status, remarks } = req.body;
    const teacher = req.user;
    
    // Verify the student is in the teacher's class (for teachers)
    if (teacher.role === 'teacher') {
      const classes = await Class.find({ 
        'teachers.teacherId': teacher._id,
        status: 'active'
      });
      
      const student = await User.findById(studentId);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ error: 'Invalid student' });
      }
      
      const isStudentInClass = classes.some(cls => 
        cls._id.equals(student.studentDetails?.currentClassId)
      );
      
      if (!isStudentInClass) {
        return res.status(403).json({ error: 'Student not in your class' });
      }
    }
    
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      studentId,
      date: { $gte: attendanceDate }
    });
    
    if (!attendance) {
      attendance = new Attendance({
        organizationId: teacher.organizationId,
        studentId,
        date: attendanceDate,
        status,
        remarks,
        markedBy: teacher._id
      });
      
      // Add class/section info if available
      const student = await User.findById(studentId);
      if (student?.role === 'student' && student.studentDetails?.currentClassId) {
        attendance.classId = student.studentDetails.currentClassId;
        attendance.sectionId = student.studentDetails.currentSectionId;
      }
    } else {
      attendance.status = status;
      attendance.remarks = remarks;
      attendance.markedBy = teacher._id;
      attendance.updatedAt = new Date();
    }
    
    await attendance.save();

    // Emit notification to parent if student has attendance marked
    if (req.body.studentId) {
      const student = await User.findById(req.body.studentId);
      if (student?.role === 'student') {
        const parents = await User.find({
          'parentDetails.children': student._id,
          isActive: true
        });

          // Create notifications
        const notificationPromises = parents.map(parent => {
          const notification = new Notification({
            parentId: parent._id,
            studentId: user._id,
            attendanceId: attendance._id,
            message: `Attendance marked as ${attendance.status} for ${user.firstName} ${user.lastName}`
          });
          return notification.save();
        });
        
        await Promise.all(notificationPromises);
        
        parents.forEach(parent => {
          socket.getIO().to(parent._id.toString()).emit('attendanceUpdate', {
            studentId: student._id,
            studentName: `${student.firstName} ${student.lastName}`,
            status: attendance.status,
            time: new Date(),
            markedBy: `${req.user.firstName} ${req.user.lastName}`,
            remarks: attendance.remarks
          });
        });
      }
    }

    res.json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get attendance records
router.get('/', auth(), async (req, res) => {
  try {
    const { studentId, startDate, endDate, classId, sectionId } = req.query;
    const user = req.user;
    
    let query = { organizationId: user.organizationId };
    
    // For parents, they can only see their children's attendance
    if (user.role === 'parent') {
      const parent = await User.findById(user._id).populate('parentDetails.children');
      if (!parent.parentDetails?.children?.length) {
        return res.json([]);
      }
      query.studentId = { $in: parent.parentDetails.children.map(c => c._id) };
    } 
    // For students, they can only see their own attendance
    else if (user.role === 'student') {
      query.studentId = user._id;
    } 
    // For teachers, they can see attendance for students in their classes
    else if (user.role === 'teacher') {
      const classes = await Class.find({ 
        'teachers.teacherId': user._id,
        status: 'active'
      });
      
      if (!classes.length) {
        return res.json([]);
      }
      
      const students = await User.find({
        'studentDetails.currentClassId': { $in: classes.map(c => c._id) },
        role: 'student'
      });
      
      query.studentId = { $in: students.map(s => s._id) };
    }
    
    if (studentId) {
      // Verify the requesting user has access to this student's data
      if (user.role === 'teacher') {
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
          return res.status(400).json({ error: 'Invalid student' });
        }
        
        const classes = await Class.find({ 
          'teachers.teacherId': user._id,
          status: 'active'
        });
        
        const isStudentInClass = classes.some(cls => 
          cls._id.equals(student.studentDetails?.currentClassId)
        );
        
        if (!isStudentInClass) {
          return res.status(403).json({ error: 'Student not in your class' });
        }
      } else if (user.role === 'parent') {
        const parent = await User.findById(user._id).populate('parentDetails.children');
        const isChild = parent.parentDetails.children.some(c => c._id.equals(studentId));
        if (!isChild) {
          return res.status(403).json({ error: 'Not your child' });
        }
      } else if (user.role === 'student' && !user._id.equals(studentId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      query.studentId = studentId;
    }
    
    if (classId) {
      query.classId = classId;
    }
    
    if (sectionId) {
      query.sectionId = sectionId;
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    const attendance = await Attendance.find(query)
      .populate('studentId', 'firstName lastName role')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1 });
    
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update attendance (for teachers/admins)
router.patch('/:id', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const user = req.user;
    
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Verify the teacher has access to this student's attendance
    if (user.role === 'teacher') {
      const classes = await Class.find({ 
        'teachers.teacherId': user._id,
        status: 'active'
      });
      
      const isStudentInClass = classes.some(cls => 
        cls._id.equals(attendance.classId)
      );
      
      if (!isStudentInClass) {
        return res.status(403).json({ error: 'Student not in your class' });
      }
    } else if (user.role === 'admin' && !attendance.organizationId.equals(user.organizationId)) {
      return res.status(403).json({ error: 'Not in your organization' });
    }
    
    if (status) attendance.status = status;
    if (remarks) attendance.remarks = remarks;
    attendance.markedBy = user._id;
    attendance.updatedAt = new Date();
    
    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Delete attendance record
router.delete('/:id', auth(['superAdmin', 'admin', 'teacher']), async (req, res) => {
  try {
    const user = req.user;
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Authorization checks
    if (user.role === 'teacher') {
      const classes = await Class.find({ 
        'teachers.teacherId': user._id,
        status: 'active'
      });
      
      const isStudentInClass = classes.some(cls => 
        cls._id.equals(attendance.classId)
      );
      
      if (!isStudentInClass) {
        return res.status(403).json({ error: 'Student not in your class' });
      }
    } else if (user.role === 'admin' && !attendance.organizationId.equals(user.organizationId)) {
      return res.status(403).json({ error: 'Not in your organization' });
    }
    
    await attendance.deleteOne();
    
    // Delete associated notifications
    await Notification.deleteMany({ attendanceId: attendance._id });
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


module.exports = router;