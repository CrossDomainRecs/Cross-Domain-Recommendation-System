require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@movierecommender.com' });
    
    if (existingAdmin) {
      console.log('  Admin user already exists');
      console.log('Email: admin@movierecommender.com');
      if (existingAdmin.role !== 'admin') {
        console.log('  WARNING: User exists but role is not admin. Updating...');
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('  User role updated to admin');
      }
      process.exit(0);
    }

    // Create admin user
    console.log(' Hashing password...');
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@movierecommender.com',
      password: hashedPassword,
      role: 'admin',
      preferences: {
        genres: [],
        domains: ['movies']
      }
    });

    await adminUser.save();
    console.log('\n  Admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Email:    admin@movierecommender.com');
    console.log('  Password: Admin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n  Admin Login URL: http://localhost:3000/admin/login');
    console.log('\n  IMPORTANT: Change this password immediately after first login!\n');

  } catch (error) {
    console.error('  Error creating admin user:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('  Disconnected from MongoDB');
    process.exit(0);
  }
};

createAdminUser();