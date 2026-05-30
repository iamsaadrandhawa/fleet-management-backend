// seed-drivers.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const Driver = require('./src/models/Driver');
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

// Function to create driver directories and save photo
const createDriverDirectory = async (employeeId, photoBuffer = null) => {
    const driverDir = path.join(__dirname, 'data', 'drivers', employeeId);
    const photosDir = path.join(driverDir, 'photos');
    const documentsDir = path.join(driverDir, 'documents');
    
    // Create directories
    if (!fs.existsSync(driverDir)) {
        fs.mkdirSync(driverDir, { recursive: true });
    }
    if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
    }
    if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
    }
    
    // Save photo if provided
    let photoPath = null;
    if (photoBuffer) {
        photoPath = path.join(photosDir, 'profile.jpg');
        fs.writeFileSync(photoPath, photoBuffer);
        photoPath = `/data/drivers/${employeeId}/photos/profile.jpg`;
    }
    
    return { driverDir, photosDir, documentsDir, photoPath };
};

// Seed drivers
const seedDrivers = async () => {
    try {
        console.log('🌱 Seeding drivers...\n');

        // Clear existing drivers
        await Driver.deleteMany({});
        console.log('🗑️ Cleared existing drivers');

        // Get admin user (created by seed-users.js)
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('❌ No admin user found. Please run seed-users.js first');
            process.exit(1);
        }

        // Driver data
        const driversData = [
            {
                name: 'John Doe',
                employeeId: 'EMP-001',
                department: 'Transport',
                phoneNumber: '+92 300 1234567',
                licenseNumber: 'DL-123456',
                location: 'Head Office, Karachi',
                status: 'available',
                createdBy: adminUser._id
            },
            {
                name: 'Michael Smith',
                employeeId: 'EMP-002',
                department: 'Transport',
                phoneNumber: '+92 300 7654321',
                licenseNumber: 'DL-789012',
                location: 'North Depot, Lahore',
                status: 'available',
                createdBy: adminUser._id
            },
            {
                name: 'Sarah Johnson',
                employeeId: 'EMP-003',
                department: 'Operations',
                phoneNumber: '+92 300 9876543',
                licenseNumber: 'DL-345678',
                location: 'South Depot, Islamabad',
                status: 'available',
                createdBy: adminUser._id
            },
            {
                name: 'Ahmed Raza',
                employeeId: 'EMP-004',
                department: 'Transport',
                phoneNumber: '+92 300 5555555',
                licenseNumber: 'DL-901234',
                location: 'East Depot, Multan',
                status: 'on trip',
                createdBy: adminUser._id
            },
            {
                name: 'Fatima Khan',
                employeeId: 'EMP-005',
                department: 'Logistics',
                phoneNumber: '+92 300 6666666',
                licenseNumber: 'DL-567890',
                location: 'West Depot, Peshawar',
                status: 'off duty',
                createdBy: adminUser._id
            },
            {
                name: 'Usman Ali',
                employeeId: 'EMP-006',
                department: 'Transport',
                phoneNumber: '+92 300 7777777',
                licenseNumber: 'DL-111222',
                location: 'Head Office, Karachi',
                status: 'available',
                createdBy: adminUser._id
            },
            {
                name: 'Ayesha Siddiqui',
                employeeId: 'EMP-007',
                department: 'Operations',
                phoneNumber: '+92 300 8888888',
                licenseNumber: 'DL-333444',
                location: 'North Depot, Lahore',
                status: 'suspended',
                createdBy: adminUser._id
            }
        ];

        // Create drivers and their directories
        const insertedDrivers = [];
        for (const driverData of driversData) {
            // Create directory structure for driver
            const { photoPath } = await createDriverDirectory(driverData.employeeId);
            
            // Add photo path if available (you can add actual photos later)
            if (photoPath) {
                driverData.photo = photoPath;
            }
            
            const driver = new Driver(driverData);
            await driver.save();
            insertedDrivers.push(driver);
            
            console.log(`   ✅ Created driver: ${driver.name} (${driver.employeeId}) - Directory created`);
        }
        
        console.log(`\n✅ Added ${insertedDrivers.length} drivers:`);
        insertedDrivers.forEach(driver => {
            console.log(`   - ${driver.name} (${driver.employeeId}) - ${driver.status} - ${driver.location}`);
        });

        console.log('\n📁 Driver directories created at: ./data/drivers/[employeeId]/');
        console.log('   - photos/ - for driver photos');
        console.log('   - documents/ - for driver documents');

        console.log('\n✅ Drivers seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding drivers:', error);
        process.exit(1);
    }
};

// Run seed
connectDB().then(() => seedDrivers());