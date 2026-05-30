// seed-ledgers-separate.js
const mongoose = require('mongoose');
require('dotenv').config();
const { 
    Designation, 
    Location, 
    Make, 
    VehicleCategory, 
    FuelType, 
    Transmission 
} = require('./src/models/Ledger');

const seedLedger = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet-management');
        console.log('✅ Database connected');

        // Clear existing data
        await Designation.deleteMany({});
        await Location.deleteMany({});
        await Make.deleteMany({});
        await VehicleCategory.deleteMany({});
        await FuelType.deleteMany({});
        await Transmission.deleteMany({});
        console.log('🗑️ Cleared existing ledger data');

        // Seed Designations
        const designations = await Designation.insertMany([
            { name: 'Senior Manager', description: 'Senior management role' },
            { name: 'Operations Manager', description: 'Operations management' },
            { name: 'Fleet Supervisor', description: 'Supervises fleet operations' },
            { name: 'Senior Driver', description: 'Experienced driver with 5+ years' },
            { name: 'Junior Driver', description: 'Entry level driver' },
            { name: 'Logistics Coordinator', description: 'Coordinates logistics' }
        ]);
        console.log(`✅ Added ${designations.length} designations`);

        // Seed Locations
        const locations = await Location.insertMany([
            { name: 'Head Office', address: '123 Main Street', city: 'Karachi' },
            { name: 'North Depot', address: '456 North Avenue', city: 'Lahore' },
            { name: 'South Depot', address: '789 South Boulevard', city: 'Islamabad' },
            { name: 'East Depot', address: '321 East Road', city: 'Multan' },
            { name: 'West Depot', address: '654 West Drive', city: 'Peshawar' }
        ]);
        console.log(`✅ Added ${locations.length} locations`);

        // Seed Makes
        const makes = await Make.insertMany([
            { name: 'Toyota', country: 'Japan' },
            { name: 'Honda', country: 'Japan' },
            { name: 'Suzuki', country: 'Japan' },
            { name: 'Ford', country: 'USA' },
            { name: 'Mercedes-Benz', country: 'Germany' },
            { name: 'BMW', country: 'Germany' },
            { name: 'Hyundai', country: 'South Korea' }
        ]);
        console.log(`✅ Added ${makes.length} makes`);

        // Seed Vehicle Categories
        const categories = await VehicleCategory.insertMany([
            { name: 'Sedan', description: 'Standard passenger car' },
            { name: 'SUV', description: 'Sport utility vehicle' },
            { name: 'Truck', description: 'Cargo vehicle' },
            { name: 'Van', description: 'Passenger van' },
            { name: 'Bus', description: 'Large passenger vehicle' },
            { name: 'Motorcycle', description: 'Two-wheeler' }
        ]);
        console.log(`✅ Added ${categories.length} vehicle categories`);

        // Seed Fuel Types
        const fuelTypes = await FuelType.insertMany([
            { name: 'Petrol' },
            { name: 'Diesel' },
            { name: 'Electric' },
            { name: 'Hybrid' },
            { name: 'CNG' }
        ]);
        console.log(`✅ Added ${fuelTypes.length} fuel types`);

        // Seed Transmissions
        const transmissions = await Transmission.insertMany([
            { name: 'Automatic' },
            { name: 'Manual' }
        ]);
        console.log(`✅ Added ${transmissions.length} transmissions`);

        console.log('\n✅ All ledger data seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding ledger data:', error);
        process.exit(1);
    }
};

seedLedger();