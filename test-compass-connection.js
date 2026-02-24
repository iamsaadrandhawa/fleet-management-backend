const mongoose = require('mongoose');

// Your connection string from Compass
const MONGODB_URI = 'mongodb://localhost:27017/fleet_management';

async function testConnection() {
    console.log('🔄 Testing connection to MongoDB...');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!');
        
        // Get connection info
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        console.log('\n📊 Database: fleet_management');
        console.log('📚 Collections found:');
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });
        
        // Count documents in each collection
        console.log('\n📈 Document counts:');
        for (let col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`   - ${col.name}: ${count} documents`);
        }
        
        // Close connection
        await mongoose.connection.close();
        console.log('\n👋 Connection closed');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testConnection();