// seed-vehicles.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
const Driver = require('./src/models/Driver');

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

// Function to create vehicle directories
const createVehicleDirectory = (vehicleNumber) => {
    const vehicleDir = path.join(__dirname, 'data', 'vehicles', vehicleNumber);
    const imagesDir = path.join(vehicleDir, 'images');
    const documentsDir = path.join(vehicleDir, 'documents');
    
    // Create directories
    if (!fs.existsSync(vehicleDir)) {
        fs.mkdirSync(vehicleDir, { recursive: true });
        console.log(`   📁 Created directory: ${vehicleDir}`);
    }
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
    }
    
    return { vehicleDir, imagesDir, documentsDir };
};

// Seed vehicles
const seedVehicles = async () => {
    try {
        console.log('🌱 Seeding vehicles...\n');

        // Clear existing vehicles
        await Vehicle.deleteMany({});
        console.log('🗑️ Cleared existing vehicles');

        // Get admin user for createdBy field
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.findOne({ role: 'manager' });
        }
        
        if (!adminUser) {
            console.error('❌ No admin or manager user found. Please run seed-users.js first');
            process.exit(1);
        }
        
        console.log(`✅ Found user: ${adminUser.name} (${adminUser.role})\n`);

        // Get all drivers for assignment
        const drivers = await Driver.find();
        console.log(`📋 Available drivers: ${drivers.map(d => d.name).join(', ')}\n`);

        // Vehicle data matching your model
        const vehiclesData = [
            {
                // Vehicle Information
                company: 'Toyota',
                model: 'Camry',
                year: 2023,
                
                // Registration Details
                vehicleNumber: 'VH-001',
                registrationNumber: 'ABC-123',
                
                // Mileage
                meterReading: 15000,
                
                // Purchase Details
                purchaseDate: new Date('2022-12-10'),
                purchasePrice: 25000,
                
                // Vehicle Specifications
                color: 'White',
                fuelType: 'Petrol',
                engineNumber: 'EN-123456789',
                chassisNumber: 'CH-123456789',
                
                // Insurance and Expiry
                insuranceExpiry: new Date('2024-12-31'),
                registrationExpiry: new Date('2024-12-31'),
                
                // Status and Assignment
                status: 'active',
                assignedTo: drivers.find(d => d.employeeId === 'EMP-001')?._id || null,
                
                // Additional Info
                notes: 'Regular maintenance vehicle',
                
                // Audit Fields
                createdBy: adminUser._id
            },
            {
                // Vehicle Information
                company: 'Honda',
                model: 'Civic',
                year: 2022,
                
                // Registration Details
                vehicleNumber: 'VH-002',
                registrationNumber: 'XYZ-789',
                
                // Mileage
                meterReading: 25000,
                
                // Purchase Details
                purchaseDate: new Date('2022-05-15'),
                purchasePrice: 22000,
                
                // Vehicle Specifications
                color: 'Black',
                fuelType: 'Petrol',
                engineNumber: 'EN-987654321',
                chassisNumber: 'CH-987654321',
                
                // Insurance and Expiry
                insuranceExpiry: new Date('2024-09-30'),
                registrationExpiry: new Date('2024-09-30'),
                
                // Status and Assignment
                status: 'active',
                assignedTo: drivers.find(d => d.employeeId === 'EMP-002')?._id || null,
                
                // Additional Info
                notes: 'Fuel efficient vehicle',
                
                // Audit Fields
                createdBy: adminUser._id
            },
            {
                // Vehicle Information
                company: 'Ford',
                model: 'F-150',
                year: 2023,
                
                // Registration Details
                vehicleNumber: 'VH-003',
                registrationNumber: 'LMN-456',
                
                // Mileage
                meterReading: 8000,
                
                // Purchase Details
                purchaseDate: new Date('2023-02-28'),
                purchasePrice: 45000,
                
                // Vehicle Specifications
                color: 'Blue',
                fuelType: 'Diesel',
                engineNumber: 'EN-456789123',
                chassisNumber: 'CH-456789123',
                
                // Insurance and Expiry
                insuranceExpiry: new Date('2024-11-20'),
                registrationExpiry: new Date('2024-11-20'),
                
                // Status and Assignment
                status: 'active',
                assignedTo: drivers.find(d => d.employeeId === 'EMP-003')?._id || null,
                
                // Additional Info
                notes: 'Heavy duty truck for cargo transport',
                
                // Audit Fields
                createdBy: adminUser._id
            },
            {
                // Vehicle Information
                company: 'Mercedes-Benz',
                model: 'Sprinter',
                year: 2023,
                
                // Registration Details
                vehicleNumber: 'VH-004',
                registrationNumber: 'DEF-012',
                
                // Mileage
                meterReading: 5000,
                
                // Purchase Details
                purchaseDate: new Date('2023-03-20'),
                purchasePrice: 55000,
                
                // Vehicle Specifications
                color: 'Silver',
                fuelType: 'Diesel',
                engineNumber: 'EN-789012345',
                chassisNumber: 'CH-789012345',
                
                // Insurance and Expiry
                insuranceExpiry: new Date('2024-10-15'),
                registrationExpiry: new Date('2024-10-15'),
                
                // Status and Assignment
                status: 'active',
                assignedTo: drivers.find(d => d.employeeId === 'EMP-004')?._id || null,
                
                // Additional Info
                notes: 'Passenger van for staff transport',
                
                // Audit Fields
                createdBy: adminUser._id
            },
            {
                // Vehicle Information
                company: 'BMW',
                model: 'X5',
                year: 2022,
                
                // Registration Details
                vehicleNumber: 'VH-005',
                registrationNumber: 'GHI-345',
                
                // Mileage
                meterReading: 35000,
                
                // Purchase Details
                purchaseDate: new Date('2022-08-10'),
                purchasePrice: 62000,
                
                // Vehicle Specifications
                color: 'Red',
                fuelType: 'Petrol',
                engineNumber: 'EN-345678901',
                chassisNumber: 'CH-345678901',
                
                // Insurance and Expiry
                insuranceExpiry: new Date('2024-12-01'),
                registrationExpiry: new Date('2024-12-01'),
                
                // Status and Assignment
                status: 'in maintenance',
                assignedTo: drivers.find(d => d.employeeId === 'EMP-005')?._id || null,
                
                // Additional Info
                notes: 'Under maintenance - engine check required',
                
                // Audit Fields
                createdBy: adminUser._id
            },
            {
                // Vehicle Information
                company: 'Hyundai',
                model: 'Santa Fe',
                year: 2023,
                
                // Registration Details
                vehicleNumber: 'VH-006',
                registrationNumber: 'JKL-678',
                
                // Mileage
                meterReading: 3000,
                
                // Purchase Details
                purchaseDate: new Date('2023-05-20'),
                purchasePrice: 48000,
                
                // Vehicle Specifications
                color: 'Gray',
                fuelType: 'Hybrid',
                engineNumber: 'EN-901234567',
                chassisNumber: 'CH-901234567',
                
                // Insurance and Expiry
                insuranceExpiry: new Date('2025-01-15'),
                registrationExpiry: new Date('2025-01-15'),
                
                // Status and Assignment
                status: 'active',
                assignedTo: drivers.find(d => d.employeeId === 'EMP-006')?._id || null,
                
                // Additional Info
                notes: 'Eco-friendly hybrid vehicle',
                
                // Audit Fields
                createdBy: adminUser._id
            },
            {
                // Vehicle Information
                company: 'Suzuki',
                model: 'Swift',
                year: 2023,
                
                // Registration Details
                vehicleNumber: 'VH-007',
                registrationNumber: 'MNO-901',
                
                // Mileage
                meterReading: 12000,
                
                // Purchase Details
                purchaseDate: new Date('2023-01-15'),
                purchasePrice: 15000,
                
                // Vehicle Specifications
                color: 'White',
                fuelType: 'Petrol',
                engineNumber: 'EN-111222333',
                chassisNumber: 'CH-111222333',
                
                // Insurance and Expiry
                insuranceExpiry: new Date('2024-08-30'),
                registrationExpiry: new Date('2024-08-30'),
                
                // Status and Assignment
                status: 'active',
                assignedTo: drivers.find(d => d.employeeId === 'EMP-007')?._id || null,
                
                // Additional Info
                notes: 'City commuter vehicle',
                
                // Audit Fields
                createdBy: adminUser._id
            }
        ];

        // Create vehicles and their directories
        const insertedVehicles = [];
        for (const vehicleData of vehiclesData) {
            // Create directory structure for vehicle
            createVehicleDirectory(vehicleData.vehicleNumber);
            
            // Create vehicle record
            const vehicle = new Vehicle(vehicleData);
            await vehicle.save();
            insertedVehicles.push(vehicle);
            
            console.log(`   ✅ Created vehicle: ${vehicleData.company} ${vehicleData.model} (${vehicleData.vehicleNumber}) - ${vehicleData.status}`);
        }
        
        console.log(`\n✅ Added ${insertedVehicles.length} vehicles:`);
        console.log('\n📋 Vehicle Summary:');
        console.log('='.repeat(80));
        insertedVehicles.forEach(vehicle => {
            const driverName = drivers.find(d => d._id.equals(vehicle.assignedTo))?.name || 'Unassigned';
            console.log(`\n   🚗 ${vehicle.company} ${vehicle.model} (${vehicle.vehicleNumber})`);
            console.log(`   ├─ Registration: ${vehicle.registrationNumber}`);
            console.log(`   ├─ Color: ${vehicle.color}`);
            console.log(`   ├─ Fuel Type: ${vehicle.fuelType}`);
            console.log(`   ├─ Meter Reading: ${vehicle.meterReading.toLocaleString()} km`);
            console.log(`   ├─ Status: ${vehicle.status}`);
            console.log(`   ├─ Assigned To: ${driverName}`);
            console.log(`   ├─ Purchase Price: $${vehicle.purchasePrice.toLocaleString()}`);
            console.log(`   ├─ Purchase Date: ${vehicle.purchaseDate.toDateString()}`);
            console.log(`   ├─ Insurance Expiry: ${vehicle.insuranceExpiry.toDateString()}`);
            console.log(`   ├─ Registration Expiry: ${vehicle.registrationExpiry.toDateString()}`);
            console.log(`   └─ Notes: ${vehicle.notes || 'N/A'}`);
        });

        console.log('\n📁 Vehicle directories created at: ./data/vehicles/');
        vehiclesData.forEach(vehicle => {
            console.log(`   ├── ${vehicle.vehicleNumber}/`);
            console.log(`   │   ├── images/`);
            console.log(`   │   └── documents/`);
        });

        console.log('\n✅ Vehicles seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding vehicles:', error);
        if (error.code === 11000) {
            console.error('   Duplicate key error. Make sure vehicleNumber and registrationNumber are unique');
        }
        process.exit(1);
    }
};

// Run seed
connectDB().then(() => seedVehicles());