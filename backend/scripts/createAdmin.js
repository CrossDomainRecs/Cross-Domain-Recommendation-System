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
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@movierecommender.com',
      password: hashedPassword,
      role: 'admin',
      preferences: {
        genres: ['all'],
        domains: ['all']
      }
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@movierecommender.com');
    console.log('Password: Admin@123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createAdminUser();