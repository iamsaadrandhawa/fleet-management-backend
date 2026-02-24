// src/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_management';
        
        // Silence mongoose logs
        mongoose.set('debug', false);
        
        const conn = await mongoose.connect(mongoURI);
        
        console.log(`📦 MongoDB: ${conn.connection.host}/${conn.connection.name}`);
        
        return conn;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;