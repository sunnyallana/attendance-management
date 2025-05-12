// Filename: scripts/createSuperAdmin.js


require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const superAdmin = new User({
      email: "superadmin@amp.com",
      passwordHash: await bcrypt.hash("super@amp", 8),
      firstName: "Super",
      lastName: "Admin",
      role: "superAdmin",
      isActive: true
    });

    await superAdmin.save();
    console.log("Super admin created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();