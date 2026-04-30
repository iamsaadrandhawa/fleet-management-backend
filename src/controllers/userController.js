// src/controllers/userController.js
const User = require('../models/User');

console.log('🔄 Loading userController...');

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
    console.log('📋 getAllUsers called');
    try {
        const users = await User.find().select('-password');
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('❌ getAllUsers error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
    console.log('🔍 getUserById called for ID:', req.params.id);
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('❌ getUserById error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private
const createUser = async (req, res) => {
    console.log('➕ createUser called');
    try {
        const { name, email, password, role } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'viewer',
            isActive: true
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('❌ createUser error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
    console.log('✏️ updateUser called for ID:', req.params.id);
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('❌ updateUser error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user (HARD DELETE - permanently remove from database)
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = async (req, res) => {
    console.log('🗑️ PERMANENT DELETE called for ID:', req.params.id);
    try {
        // Check if user exists
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Check if trying to delete yourself
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: 'You cannot delete your own account' 
            });
        }
        
        // PERMANENT DELETE - remove from database
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ 
            success: true, 
            message: 'User permanently deleted from database' 
        });
    } catch (error) {
        console.error('❌ deleteUser error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// @desc    Hard delete user (alias - keeps compatibility)
// @route   DELETE /api/users/:id/hard
// @access  Private
const hardDeleteUser = async (req, res) => {
    console.log('🔥 hardDeleteUser called for ID:', req.params.id);
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        res.json({ 
            success: true, 
            message: 'User permanently deleted' 
        });
    } catch (error) {
        console.error('❌ hardDeleteUser error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Private
const updateUserPassword = async (req, res) => {
    console.log('🔐 updateUserPassword called for ID:', req.params.id);
    try {
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }

        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });
    } catch (error) {
        console.error('❌ updateUserPassword error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private
const getUsersByRole = async (req, res) => {
    console.log('🎭 getUsersByRole called for role:', req.params.role);
    try {
        const users = await User.find({ role: req.params.role })
            .select('-password');
        res.json({ 
            success: true, 
            count: users.length, 
            data: users 
        });
    } catch (error) {
        console.error('❌ getUsersByRole error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getUserStats = async (req, res) => {
    console.log('📊 getUserStats called');
    try {
        const total = await User.countDocuments();
        const active = await User.countDocuments({ isActive: true });
        const inactive = await User.countDocuments({ isActive: false });
        
        res.json({
            success: true,
            data: { total, active, inactive }
        });
    } catch (error) {
        console.error('❌ getUserStats error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// @desc    Bulk update user status
// @route   PATCH /api/users/bulk/status
// @access  Private
const bulkUpdateStatus = async (req, res) => {
    console.log('📦 bulkUpdateStatus called');
    try {
        const { userIds, isActive } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide an array of user IDs' 
            });
        }

        const result = await User.updateMany(
            { _id: { $in: userIds } },
            { isActive }
        );
        
        res.json({ 
            success: true, 
            message: `Updated ${result.modifiedCount} users` 
        });
    } catch (error) {
        console.error('❌ bulkUpdateStatus error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

console.log('✅ User controller loaded with functions:', {
    getAllUsers: typeof getAllUsers,
    getUserById: typeof getUserById,
    createUser: typeof createUser,
    updateUser: typeof updateUser,
    deleteUser: typeof deleteUser,
    hardDeleteUser: typeof hardDeleteUser,
    updateUserPassword: typeof updateUserPassword,
    getUsersByRole: typeof getUsersByRole,
    getUserStats: typeof getUserStats,
    bulkUpdateStatus: typeof bulkUpdateStatus
});

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    hardDeleteUser,
    updateUserPassword,
    getUsersByRole,
    getUserStats,
    bulkUpdateStatus
};