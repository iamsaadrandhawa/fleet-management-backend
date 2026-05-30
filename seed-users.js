// seed-users.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./src/models/User');

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet-management');
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};

// Seed users
const seedUsers = async () => {
    try {
        console.log('🌱 Creating users...\n');

        // Hash password manually
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        
        // Hardcoded role IDs from your database
        const SUPER_ADMIN_ID = new mongoose.Types.ObjectId('6a1a8d57737590815f24bce6');
        const MANAGER_ID = new mongoose.Types.ObjectId('6a1a8d57737590815f24bce8');
        
        // User data
        const usersData = [
            {
                employeeId: 'EMP001',
                firstName: 'Jadeed',
                lastName: 'Admin',
                email: 'jadeed@fleet.com',
                department: 'Administration',
                designationName: 'Administration',
                roleId: SUPER_ADMIN_ID,
                roleName: 'Super Admin',
                phone: '+92 300 1111111',
                location: 'Head Office, Karachi',
                password: hashedPassword,
                isActive: true
            },
            {
                employeeId: 'EMP002',
                firstName: 'Saad',
                lastName: 'Manager',
                email: 'saad@fleet.com',
                department: 'Management',
                designationName: 'Management',
                roleId: MANAGER_ID,
                roleName: 'Manager',
                phone: '+92 300 2222222',
                location: 'Head Office, Karachi',
                password: hashedPassword,
                isActive: true
            }
        ];

        // Clear existing users
        await User.deleteMany({});
        console.log('🗑️ Cleared existing users');

        // Create users
        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            console.log(`✅ Created: ${user.firstName} ${user.lastName} (${user.email})`);
        }
        
        console.log(`\n✅ Users seeded successfully!`);
        console.log('\n📋 Login Credentials:');
        console.log('='.repeat(50));
        console.log('   Email: jadeed@fleet.com');
        console.log('   Password: password123');
        console.log('   Role: Super Admin');
        console.log('   ---');
        console.log('   Email: saad@fleet.com');
        console.log('   Password: password123');
        console.log('   Role: Manager');
        console.log('='.repeat(50));
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
};

// Run seed
connectDB().then(() => seedUsers());