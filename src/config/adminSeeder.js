const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    // 🔌 connect DB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('📡 MongoDB Connected');

    // 🔍 check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('⚠️ Admin already exists. Seeder skipped.');
      process.exit();
    }


    // 👑 create admin
    const admin = await User.create({
      name: 'Super Admin',
      email: 'saad@jadeedgroup.com',
      password: 'saad123' ,
      role: 'admin'
    });

    console.log('✅ Admin created successfully:');
    console.log({
      email: admin.email,
      role: admin.role
    });

    process.exit();

  } catch (error) {
    console.error('❌ Seeder Error:', error.message);
    process.exit(1);
  }
};

seedAdmin();