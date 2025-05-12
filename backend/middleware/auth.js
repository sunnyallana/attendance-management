// middleware/auth.js


const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = (roles = []) => async (req, res, next) => {
  try {
    // Skip auth for RFID scanning endpoint
    if (req.path === '/api/attendance/rfid' && req.method === 'POST') {
      return next();
    }
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id, isActive: true });

    if (!user) throw new Error();

    // Role-based access control
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Organization context for non-superAdmins
    if (user.role !== 'superAdmin' && !user.organizationId) {
      return res.status(403).json({ error: 'Organization access required' });
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};

module.exports = auth;