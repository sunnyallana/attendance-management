// Filename: routes/organizations.js


const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Organization = require('../models/Organization');
const User = require('../models/User');

// Create Organization (SuperAdmin only) - Tested via Postman
router.post('/', auth(['superAdmin']), async (req, res) => {
  try {
    const organization = new Organization(req.body);
    await organization.save();
    res.status(201).json(organization);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Organizations (SuperAdmin only) - Tested via Postman
router.get('/', auth(['superAdmin']), async (req, res) => {
  try {
    const organizations = await Organization.find();
    res.json(organizations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Organization by ID - Tested via Postman
// Only admin of the organization and superadmin can view the org
router.get('/:id', auth(['superAdmin', 'admin']), async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    
    // Admin can only access their own organization
    if (req.user.role === 'admin' && !req.user.organizationId.equals(organization._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (!organization) throw new Error('Organization not found');
    res.json(organization);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Organization - Tested via Postman
// // Only admin of the organization and superad
router.patch('/:id', auth(['superAdmin', 'admin']), async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    
    // Admin can only update their own organization
    if (req.user.role === 'admin' && !req.user.organizationId.equals(organization._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    Object.assign(organization, req.body);
    organization.updatedAt = new Date();
    await organization.save();
    res.json(organization);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Organization (SuperAdmin only) - Tested via Postman
router.delete('/:id', auth(['superAdmin']), async (req, res) => {
  try {
    const organization = await Organization.findByIdAndDelete(req.params.id);
    if (!organization) throw new Error('Organization not found');
    
    // Also deactivate all users in this organization
    await User.updateMany(
      { organizationId: organization._id },
      { isActive: false }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;