// Filename: routes/auth.js


const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Login - Tested via Postman
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true });
    
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Restrict login to specific roles
    const allowedRoles = ['superAdmin', 'admin', 'teacher', 'parent'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Login not permitted for your role' });
    }

    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



// Password Reset (Admin only) - Tested via Postman
router.post('/reset-password', auth(['superAdmin', 'admin']), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 8);
    
    const user = await User.findByIdAndUpdate(userId, { 
      passwordHash: hashedPassword 
    });
    
    if (!user) throw new Error('User not found');
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;