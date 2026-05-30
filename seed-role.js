// seed-role.js
const mongoose = require('mongoose');
const path = require('path');

// Correct path to your models
const { Role } = require('./src/models/Ledger');

require('dotenv').config();

console.log('🌱 Starting Role Seeder...');
console.log('Current directory:', __dirname);
console.log('Looking for models at:', path.join(__dirname, 'models'));

// Define roles with permissions
const rolesWithPermissions = [
    {
        name: 'Super Admin',
        description: 'Complete system access with all permissions',
        status: 'active',
        permissions: {
            create: true,
            read: true,
            update: true,
            delete: true
        }
    },
    {
        name: 'Admin',
        description: 'Administrative access with most permissions',
        status: 'active',
        permissions: {
            create: true,
            read: true,
            update: true,
            delete: true
        }
    },
    {
        name: 'Manager',
        description: 'Can manage resources but limited delete access',
        status: 'active',
        permissions: {
            create: true,
            read: true,
            update: true,
            delete: false
        }
    },
    {
        name: 'Editor',
        description: 'Can create, read, and update but cannot delete',
        status: 'active',
        permissions: {
            create: true,
            read: true,
            update: true,
            delete: false
        }
    },
    {
        name: 'Auditor',
        description: 'Read and update access for auditing purposes',
        status: 'active',
        permissions: {
            create: false,
            read: true,
            update: true,
            delete: false
        }
    },
    {
        name: 'Dispatcher',
        description: 'Can create and read dispatch operations',
        status: 'active',
        permissions: {
            create: true,
            read: true,
            update: false,
            delete: false
        }
    },
    {
        name: 'Driver',
        description: 'Basic read access for drivers',
        status: 'active',
        permissions: {
            create: false,
            read: true,
            update: false,
            delete: false
        }
    },
    {
        name: 'Viewer',
        description: 'Read-only access to all resources',
        status: 'active',
        permissions: {
            create: false,
            read: true,
            update: false,
            delete: false
        }
    },
    {
        name: 'Support',
        description: 'Limited create and read access for support staff',
        status: 'active',
        permissions: {
            create: true,
            read: true,
            update: false,
            delete: false
        }
    },
    {
        name: 'Contractor',
        description: 'Limited read access for external contractors',
        status: 'active',
        permissions: {
            create: false,
            read: true,
            update: false,
            delete: false
        }
    }
];

// Function to seed roles
const seedRoles = async () => {
    try {
        // Get MongoDB URI from environment variable
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_management';
        
        console.log('Connecting to database...');
        console.log('MongoDB URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials
        
        // Connect to database - WITHOUT deprecated options
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to database');

        // Check if Role model is loaded
        if (!Role) {
            throw new Error('Role model not loaded. Check the path to your model.');
        }
        console.log('✅ Role model loaded');

        // Check if roles already exist
        const existingRoles = await Role.find({});
        console.log(`Found ${existingRoles.length} existing roles`);
        
        if (existingRoles.length > 0) {
            console.log('🔄 Updating existing roles and adding new ones...');
            
            // Update or create each role
            for (const roleData of rolesWithPermissions) {
                const existingRole = await Role.findOne({ name: roleData.name });
                
                if (existingRole) {
                    // Update existing role
                    await Role.findByIdAndUpdate(existingRole._id, roleData, { new: true });
                    console.log(`✅ Updated role: ${roleData.name}`);
                } else {
                    // Create new role
                    await Role.create(roleData);
                    console.log(`✅ Created new role: ${roleData.name}`);
                }
            }
        } else {
            // Insert all roles
            await Role.insertMany(rolesWithPermissions);
            console.log(`✅ Created ${rolesWithPermissions.length} roles successfully!`);
        }

        // Display all roles after seeding
        const allRoles = await Role.find({}).sort({ name: 1 });
        console.log('\n📋 Current Roles in Database:');
        console.log('='.repeat(60));
        allRoles.forEach(role => {
            console.log(`\n📌 ${role.name}`);
            console.log(`   Description: ${role.description}`);
            console.log(`   Status: ${role.status}`);
            console.log(`   Permissions: Create:${role.permissions.create ? '✓' : '✗'} Read:${role.permissions.read ? '✓' : '✗'} Update:${role.permissions.update ? '✓' : '✗'} Delete:${role.permissions.delete ? '✓' : '✗'}`);
        });
        console.log('\n' + '='.repeat(60));
        
        console.log('\n✅ Seeding completed successfully!');
        return allRoles;
    } catch (error) {
        console.error('❌ Error seeding roles:', error);
        console.error('Error details:', error.stack);
        throw error;
    } finally {
        // Close database connection
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
};

// Run the seeder
if (require.main === module) {
    seedRoles().catch(console.error);
}

module.exports = { seedRoles, rolesWithPermissions };