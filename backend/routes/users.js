// Filename: routes/users.js


const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Create User (SuperAdmin/Admin) - Tested via Postman
router.post('/', auth(['superAdmin', 'admin']), async (req, res) => {
  try {
    const { email, password, role, ...rest } = req.body;
    
    // Authorization checks
    if (req.user.role === 'admin') {
      // Admin can't create superAdmins or other admins
      if (['superAdmin', 'admin'].includes(role)) {
        return res.status(403).json({ error: 'Insufficient privileges' });
      }
      // Admin can only create users in their own organization
      rest.organizationId = req.user.organizationId;
    }
    
    const userData = {
      ...rest,
      email,
      passwordHash: await bcrypt.hash(password, 8),
      role
    };

    const user = new User(userData);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Users (with role-based filtering) - Tested via Postman
router.get('/', auth(), async (req, res) => {
  try {
    let query = { isActive: true };
    
    if (req.user.role === 'superAdmin') {
      // SuperAdmin can see all users
    } else if (req.user.role === 'admin') {
      // Admin can only see users in their organization, except other superAdmins
      query.organizationId = req.user.organizationId;
      query.role = { $nin: ['superAdmin'] };
    } else {
      // Other roles can't list users
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get User by ID - Tested via Postman
router.get('/:id', auth(), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) throw new Error('User not found');
    
    // Authorization checks
    if (req.user.role === 'admin' && 
        (!user.organizationId || !user.organizationId.equals(req.user.organizationId))) {
      return res.status(403).json({ error: 'Forbidden' });
    } else if (req.user.role === 'teacher' || req.user.role === 'student' || req.user.role === 'parent') {
      // Users can only view their own profile
      if (!req.user._id.equals(user._id)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update User - Tested via Postman
router.patch('/:id', auth(), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) throw new Error('User not found');
    
    // Authorization checks
    if (req.user.role === 'admin') {
      // Admin can't update superAdmins or other admins outside their org
      if (user.role === 'superAdmin' || 
          (user.role === 'admin' && !user.organizationId.equals(req.user.organizationId))) {
        return res.status(403).json({ error: 'Insufficient privileges' });
      }
      // Admin can only update users in their organization
      if (!user.organizationId || !user.organizationId.equals(req.user.organizationId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      // Admin can't change role to superAdmin or admin
      if (req.body.role && ['superAdmin', 'admin'].includes(req.body.role)) {
        return res.status(403).json({ error: 'Insufficient privileges' });
      }
    } else if (!req.user._id.equals(user._id)) {
      // Users can only update their own profile
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    Object.assign(user, req.body);
    user.updatedAt = new Date();
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete User (actually deactivate) - Tested via Postman
router.delete('/:id', auth(['superAdmin', 'admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) throw new Error('User not found');
    
    // Authorization checks
    if (req.user.role === 'admin') {
      // Admin can't delete superAdmins or other admins
      if (user.role === 'superAdmin' || 
          (user.role === 'admin' && !user.organizationId.equals(req.user.organizationId))) {
        return res.status(403).json({ error: 'Insufficient privileges' });
      }
      // Admin can only delete users in their organization
      if (!user.organizationId || !user.organizationId.equals(req.user.organizationId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    user.isActive = false;
    user.updatedAt = new Date();
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;