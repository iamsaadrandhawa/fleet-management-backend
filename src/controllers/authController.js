// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ✅ Make sure this path is correct
const AuditLog = require('../models/AuditLog'); // ✅ Add this import

// Helper function to get client IP
const getClientIp = (req) => {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           'unknown';
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('=== LOGIN DEBUG ===');
        console.log('Email:', email);
        
        // Get request info for logging
        const clientIp = getClientIp(req);
        const userAgent = req.get('User-Agent') || 'unknown';
        
        // Check if User exists and is a function
        if (!User || typeof User.findOne !== 'function') {
            console.error('User model is not properly loaded!');
            
            // Log system error
            await AuditLog.create({
                userEmail: email || 'unknown',
                action: 'LOGIN',
                module: 'AUTH',
                status: 'FAILED',
                description: 'System error - User model not loaded',
                errorMessage: 'Database model error',
                requestInfo: {
                    method: req.method,
                    url: req.originalUrl,
                    ip: clientIp,
                    userAgent: userAgent
                },
                timestamp: new Date()
            }).catch(err => console.error('Audit log error:', err));
            
            return res.status(500).json({
                success: false,
                message: 'Database model error. Please try again later.'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            console.log('User not found:', email);
            
            // Log failed login - user not found
            await AuditLog.create({
                userEmail: email,
                action: 'LOGIN',
                module: 'AUTH',
                status: 'FAILED',
                description: `Failed login attempt - user not found: ${email}`,
                errorMessage: 'Invalid credentials',
                requestInfo: {
                    method: req.method,
                    url: req.originalUrl,
                    ip: clientIp,
                    userAgent: userAgent
                },
                timestamp: new Date()
            }).catch(err => console.error('Audit log error:', err));
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        console.log('User found:', user.email);
        
        // Check password
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            
            // Log failed login - wrong password
            await AuditLog.create({
                user: user._id,
                userEmail: user.email,
                userRole: user.roleName || 'USER',
                action: 'LOGIN',
                module: 'AUTH',
                status: 'FAILED',
                description: `Failed login attempt - invalid password for: ${email}`,
                errorMessage: 'Invalid credentials',
                requestInfo: {
                    method: req.method,
                    url: req.originalUrl,
                    ip: clientIp,
                    userAgent: userAgent
                },
                metadata: {
                    userId: user._id,
                    userEmail: user.email
                },
                timestamp: new Date()
            }).catch(err => console.error('Audit log error:', err));
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        console.log('Login successful for:', email);
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate token
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email,
                roleId: user.roleId,
                roleName: user.roleName
            },
            process.env.JWT_SECRET || 'your_secret_key_here',
            { expiresIn: '30d' }
        );
        
        // Log successful login
        await AuditLog.create({
            user: user._id,
            userEmail: user.email,
            userRole: user.roleName || 'USER',
            action: 'LOGIN',
            module: 'AUTH',
            status: 'SUCCESS',
            description: `User ${user.email} logged in successfully`,
            requestInfo: {
                method: req.method,
                url: req.originalUrl,
                ip: clientIp,
                userAgent: userAgent
            },
            metadata: {
                userId: user._id,
                userEmail: user.email,
                role: user.roleName,
                loginTime: new Date().toISOString()
            },
            timestamp: new Date()
        }).catch(err => console.error('Audit log error:', err));
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                roleName: user.roleName,
                employeeId: user.employeeId
            }
        });
        
    } catch (error) {
        console.error('Login error details:', error);
        
        // Log error
        const clientIp = getClientIp(req);
        const userAgent = req.get('User-Agent') || 'unknown';
        
        await AuditLog.create({
            userEmail: req.body?.email || 'unknown',
            action: 'LOGIN',
            module: 'AUTH',
            status: 'FAILED',
            description: `Login error: ${error.message}`,
            errorMessage: error.message,
            requestInfo: {
                method: req.method,
                url: req.originalUrl,
                ip: clientIp,
                userAgent: userAgent
            },
            timestamp: new Date()
        }).catch(err => console.error('Audit log error:', err));
        
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        // Log logout if user is authenticated
        if (req.user) {
            const clientIp = getClientIp(req);
            const userAgent = req.get('User-Agent') || 'unknown';
            
            await AuditLog.create({
                user: req.user.id,
                userEmail: req.user.email,
                userRole: req.user.roleName || 'USER',
                action: 'LOGOUT',
                module: 'AUTH',
                status: 'SUCCESS',
                description: `User ${req.user.email} logged out`,
                requestInfo: {
                    method: req.method,
                    url: req.originalUrl,
                    ip: clientIp,
                    userAgent: userAgent
                },
                timestamp: new Date()
            }).catch(err => console.error('Audit log error:', err));
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};