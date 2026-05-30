// src/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const path = require('path');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const driverRoutes = require('./routes/driverRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const auditRoutes = require('./routes/auditRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes'); // NEW: Ledger routes
//const roleRoutes = require('./routes/roleRoutes'); // If you created role management

// Import middleware
const auditMiddleware = require('./middleware/auditMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ============= MIDDLEWARE =============

// Security headers (relaxed for development)
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration - FIXED for ngrok
app.use(cors({
    origin: true, // Allows any origin (including ngrok URLs)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type", 
        "Authorization",
        "ngrok-skip-browser-warning", // Required for free ngrok
        "Accept",
        "X-Requested-With",
        "Origin"
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Compression for better performance
app.use(compression());

// File upload middleware
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
    responseOnLimit: 'File size limit exceeded (max 5MB)',
    createParentPath: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (only errors in production)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { 
        skip: (req, res) => res.statusCode < 400 
    }));
}

// Serve static files for uploaded content
app.use('/data', express.static(path.join(__dirname, '../data')));

// ============= CREATE UPLOAD DIRECTORIES =============
const fs = require('fs').promises;
const createUploadDirectories = async () => {
    const dirs = [
        path.join(__dirname, '../data/profiles/drivers'),
        path.join(__dirname, '../data/documents/drivers'),
        path.join(__dirname, '../data/profiles/users'),
        path.join(__dirname, '../data/vehicles/documents'),
    ];
    
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            console.log(`Note: Could not create directory ${dir}: ${err.message}`);
        }
    }
};
createUploadDirectories();

// ============= ROUTES =============

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Fleet Management API',
        version: '2.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api',
            auth: '/api/auth',
            users: '/api/users',
            drivers: '/api/drivers',
            vehicles: '/api/vehicles',
            'audit-logs': '/api/audit-logs',
            logs: '/api/logs', // NEW: Alias for audit-logs
            ledgers: '/api/ledgers' // NEW: Ledger endpoints
        }
    });
});

// Debug middleware to log requests (optional - remove in production)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`${req.method} ${req.path} - ${req.ip}`);
    }
    next();
});

// Apply audit middleware to all API routes (optional)
// app.use('/api', auditMiddleware);

// ============= API ROUTES =============

// Existing Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/audit-logs', auditRoutes);

// NEW ROUTES ADDED BELOW:

// 1. Ledger Routes (for dropdown data management)
app.use('/api/ledgers', ledgerRoutes);

// 2. Alias for audit logs (to support both /audit-logs and /logs)
app.use('/api/logs', auditRoutes);

// 3. Additional auth routes will be handled in authRoutes.js
// (change-password, logout endpoints)

//app.use('/api/roles', roleRoutes); // If you created role management

// ============= ERROR HANDLING =============

// 404 Handler - Route not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: messages
        });
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({
            success: false,
            message: `Duplicate value for ${field}. Please use a different value.`
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token. Please login again.'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired. Please login again.'
        });
    }
    
    // Default error
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============= START SERVER =============
const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🚀 Fleet Management API`);
            console.log(`${'='.repeat(50)}`);
            console.log(`   Port:        ${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   Database:    ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
            console.log(`${'='.repeat(50)}`);
            console.log(`\n📡 Available Endpoints:`);
            console.log(`   ├── GET  /`);
            console.log(`   ├── GET  /health`);
            console.log(`   │`);
            console.log(`   ├── Auth Routes:`);
            console.log(`   │   ├── POST   /api/auth/register`);
            console.log(`   │   ├── POST   /api/auth/login`);
            console.log(`   │   ├── GET    /api/auth/profile`);
            console.log(`   │   ├── PUT    /api/auth/profile`);
            console.log(`   │   ├── POST   /api/auth/change-password ← NEW`);
            console.log(`   │   └── POST   /api/auth/logout ← NEW`);
            console.log(`   │`);
            console.log(`   ├── User Routes:`);
            console.log(`   │   ├── GET    /api/users`);
            console.log(`   │   ├── POST   /api/users`);
            console.log(`   │   ├── GET    /api/users/:id`);
            console.log(`   │   ├── PUT    /api/users/:id`);
            console.log(`   │   ├── DELETE /api/users/:id`);
            console.log(`   │   ├── GET    /api/users/stats`);
            console.log(`   │   └── GET    /api/users/role/:role`);
            console.log(`   │`);
            console.log(`   ├── Driver Routes:`);
            console.log(`   │   ├── POST   /api/drivers`);
            console.log(`   │   ├── GET    /api/drivers`);
            console.log(`   │   ├── GET    /api/drivers/:id`);
            console.log(`   │   ├── PUT    /api/drivers/:id`);
            console.log(`   │   ├── DELETE /api/drivers/:id`);
            console.log(`   │   ├── GET    /api/drivers/status/:status`);
            console.log(`   │   └── PATCH  /api/drivers/:id/status`);
            console.log(`   │`);
            console.log(`   ├── Vehicle Routes:`);
            console.log(`   │   ├── POST   /api/vehicles`);
            console.log(`   │   ├── GET    /api/vehicles`);
            console.log(`   │   ├── GET    /api/vehicles/available`);
            console.log(`   │   ├── GET    /api/vehicles/status/:status`);
            console.log(`   │   ├── GET    /api/vehicles/:id`);
            console.log(`   │   ├── PUT    /api/vehicles/:id`);
            console.log(`   │   ├── DELETE /api/vehicles/:id`);
            console.log(`   │   ├── PUT    /api/vehicles/:id/assign`);
            console.log(`   │   └── PUT    /api/vehicles/:id/unassign`);
            console.log(`   │`);
            console.log(`   ├── Ledger Routes (NEW):`);
            console.log(`   │   ├── Designations:`);
            console.log(`   │   │   ├── GET    /api/ledgers/designations`);
            console.log(`   │   │   ├── POST   /api/ledgers/designations`);
            console.log(`   │   │   ├── GET    /api/ledgers/designations/:id`);
            console.log(`   │   │   ├── PUT    /api/ledgers/designations/:id`);
            console.log(`   │   │   └── DELETE /api/ledgers/designations/:id`);
            console.log(`   │   ├── Locations:`);
            console.log(`   │   │   ├── GET    /api/ledgers/locations`);
            console.log(`   │   │   ├── POST   /api/ledgers/locations`);
            console.log(`   │   │   ├── GET    /api/ledgers/locations/:id`);
            console.log(`   │   │   ├── PUT    /api/ledgers/locations/:id`);
            console.log(`   │   │   └── DELETE /api/ledgers/locations/:id`);
            console.log(`   │   ├── Makes:`);
            console.log(`   │   │   ├── GET    /api/ledgers/makes`);
            console.log(`   │   │   ├── POST   /api/ledgers/makes`);
            console.log(`   │   │   ├── GET    /api/ledgers/makes/:id`);
            console.log(`   │   │   ├── PUT    /api/ledgers/makes/:id`);
            console.log(`   │   │   └── DELETE /api/ledgers/makes/:id`);
            console.log(`   │   ├── Vehicle Categories:`);
            console.log(`   │   │   ├── GET    /api/ledgers/vehicle-categories`);
            console.log(`   │   │   ├── POST   /api/ledgers/vehicle-categories`);
            console.log(`   │   │   ├── GET    /api/ledgers/vehicle-categories/:id`);
            console.log(`   │   │   ├── PUT    /api/ledgers/vehicle-categories/:id`);
            console.log(`   │   │   └── DELETE /api/ledgers/vehicle-categories/:id`);
            console.log(`   │   ├── Fuel Types:`);
            console.log(`   │   │   ├── GET    /api/ledgers/fuel-types`);
            console.log(`   │   │   ├── POST   /api/ledgers/fuel-types`);
            console.log(`   │   │   ├── GET    /api/ledgers/fuel-types/:id`);
            console.log(`   │   │   ├── PUT    /api/ledgers/fuel-types/:id`);
            console.log(`   │   │   └── DELETE /api/ledgers/fuel-types/:id`);
            console.log(`   │   └── Transmissions:`);
            console.log(`   │       ├── GET    /api/ledgers/transmissions`);
            console.log(`   │       ├── POST   /api/ledgers/transmissions`);
            console.log(`   │       ├── GET    /api/ledgers/transmissions/:id`);
            console.log(`   │       ├── PUT    /api/ledgers/transmissions/:id`);
            console.log(`   │       └── DELETE /api/ledgers/transmissions/:id`);
            console.log(`   │`);
            console.log(`   ├── Audit Log Routes:`);
            console.log(`   │   ├── GET    /api/audit-logs`);
            console.log(`   │   ├── GET    /api/audit-logs/stats`);
            console.log(`   │   ├── GET    /api/audit-logs/user/:userId`);
            console.log(`   │   └── GET    /api/audit-logs/:id`);
            console.log(`   │`);
            console.log(`   └── Log Routes (Alias for Audit Logs):`);
            console.log(`       ├── GET    /api/logs`);
            console.log(`       ├── GET    /api/logs/recent`);
            console.log(`       ├── GET    /api/logs/user/:userId`);
            console.log(`       ├── GET    /api/logs/action/:action`);
            console.log(`       ├── GET    /api/logs/entity/:entityType`);
            console.log(`       ├── DELETE /api/logs/:id`);
            console.log(`       └── DELETE /api/logs`);
            console.log(`\n${'='.repeat(50)}`);
            console.log(`✅ API is ready and listening on port ${PORT}`);
            console.log(`${'='.repeat(50)}\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT. Closing server...');
    await mongoose.disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM. Closing server...');
    await mongoose.disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
});

startServer();

module.exports = app;