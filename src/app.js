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
//const roleRoutes = require('./routes/roleRoutes'); // If you created role management

// Import middleware
const auditMiddleware = require('./middleware/auditMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(compression());

// File upload middleware
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
    responseOnLimit: 'File size limit exceeded (max 5MB)',
    createParentPath: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploaded content
app.use('/data', express.static(path.join(__dirname, '../data')));

// Create upload directories if they don't exist
const fs = require('fs').promises;
const createUploadDirectories = async () => {
    const dirs = [
        path.join(__dirname, '../data/profiles/drivers'),
        path.join(__dirname, '../data/documents/drivers'),
        path.join(__dirname, '../data/profiles/users'),
        path.join(__dirname, '../data/vehicles/documents'),
    ];
    
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true }).catch(() => {});
    }
};
createUploadDirectories();

// Only log errors, not every request
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev', { skip: (req, res) => res.statusCode < 400 }));
}

// Routes
app.get('/', (req, res) => {
    res.json({
        name: 'Fleet Management API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Apply audit middleware to all API routes (optional - you can also apply per route)
// app.use('/api', auditMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/audit-logs', auditRoutes);
//app.use('/api/roles', roleRoutes); // If you created role management

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`\n🚀 Fleet Management API`);
            console.log(`   Port: ${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`\n📡 Endpoints:`);
            console.log(`   ├── GET  /`);
            console.log(`   ├── GET  /health`);
            console.log(`   │`);
            console.log(`   ├── Auth Routes:`);
            console.log(`   │   ├── POST   /api/auth/register`);
            console.log(`   │   ├── POST   /api/auth/login`);
            console.log(`   │   ├── GET    /api/auth/profile`);
            console.log(`   │   └── PUT    /api/auth/profile`);
            console.log(`   │`);
            console.log(`   ├── User Routes:`);
            console.log(`   │   ├── GET    /api/users`);
            console.log(`   │   ├── POST   /api/users`);
            console.log(`   │   ├── GET    /api/users/:id`);
            console.log(`   │   ├── PUT    /api/users/:id`);
            console.log(`   │   ├── DELETE /api/users/:id`);
            console.log(`   │   ├── GET    /api/users/stats/count`);
            console.log(`   │   └── GET    /api/users/role/:role`);
            console.log(`   │`);
            console.log(`   ├── Driver Routes:`);
            console.log(`   │   ├── POST   /api/drivers (Add driver)`);
            console.log(`   │   ├── GET    /api/drivers (List all drivers)`);
            console.log(`   │   ├── GET    /api/drivers/:id (Get driver details)`);
            console.log(`   │   ├── PUT    /api/drivers/:id (Update driver)`);
            console.log(`   │   ├── DELETE /api/drivers/:id (Delete driver)`);
            console.log(`   │   ├── GET    /api/drivers/status/:status (Filter by status)`);
            console.log(`   │   └── PATCH  /api/drivers/:id/status (Update status)`);
            console.log(`   │`);
            console.log(`   ├── Vehicle Routes:`);
            console.log(`   │   ├── POST   /api/vehicles (Add new vehicle)`);
            console.log(`   │   ├── GET    /api/vehicles (List all vehicles)`);
            console.log(`   │   ├── GET    /api/vehicles/available (Available vehicles)`);
            console.log(`   │   ├── GET    /api/vehicles/status/:status (Filter by status)`);
            console.log(`   │   ├── GET    /api/vehicles/:id (Get vehicle details)`);
            console.log(`   │   ├── PUT    /api/vehicles/:id (Update vehicle)`);
            console.log(`   │   ├── DELETE /api/vehicles/:id (Delete vehicle)`);
            console.log(`   │   ├── PUT    /api/vehicles/:id/assign (Assign to driver)`);
            console.log(`   │   └── PUT    /api/vehicles/:id/unassign (Unassign from driver)`);
            console.log(`   │`);
            console.log(`   ├── Audit Log Routes (Admin only):`);
            console.log(`   │   ├── GET    /api/audit-logs (View all audit logs)`);
            console.log(`   │   ├── GET    /api/audit-logs/stats (Audit statistics)`);
            console.log(`   │   ├── GET    /api/audit-logs/user/:userId (User activity)`);
            console.log(`   │   └── GET    /api/audit-logs/:id (View log details)`);
            console.log(`   │`);
            console.log(`   └── Role Routes (Admin only):`);
            console.log(`       ├── POST   /api/roles (Create custom role)`);
            console.log(`       ├── GET    /api/roles (List all roles)`);
            console.log(`       ├── GET    /api/roles/:id (Get role details)`);
            console.log(`       ├── PUT    /api/roles/:id (Update role)`);
            console.log(`       └── DELETE /api/roles/:id (Delete role)`);
            console.log(`\n✅ API ready\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;

