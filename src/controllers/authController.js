// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ✅ Make sure this path is correct

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('=== LOGIN DEBUG ===');
        console.log('Email:', email);
        console.log('User model type:', typeof User);
        console.log('User model:', User);
        
        // Check if User exists and is a function
        if (!User || typeof User.findOne !== 'function') {
            console.error('User model is not properly loaded!');
            return res.status(500).json({
                success: false,
                message: 'Database model error. Please try again later.'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            console.log('User not found:', email);
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
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};