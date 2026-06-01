// controllers/userController.js
const User = require('../models/User');
const { Role, Designation } = require('../models/Ledger');
const bcrypt = require('bcryptjs');

// @desc    Get all available roles from ledger
// @route   GET /api/users/available-roles
// @access  Private
const getAvailableRoles = async (req, res) => {
    try {
        const roles = await Role.find({ status: 'active' })
            .select('name description permissions')
            .sort({ name: 1 });
        
        res.json({
            success: true,
            count: roles.length,
            data: roles
        });
    } catch (error) {
        console.error('getAvailableRoles error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all available designations from ledger
// @route   GET /api/users/available-designations
// @access  Private
const getAvailableDesignations = async (req, res) => {
    try {
        const designations = await Designation.find({ status: 'active' })
            .select('name description')
            .sort({ name: 1 });
        
        res.json({
            success: true,
            count: designations.length,
            data: designations
        });
    } catch (error) {
        console.error('getAvailableDesignations error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('roleId', 'name permissions')
            .populate('designationId', 'name')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('getAllUsers error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('roleId', 'name permissions')
            .populate('designationId', 'name');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('getUserById error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
    try {
        const {
            employeeId,
            firstName,
            lastName,
            email,
            department,
            designationId,
            roleId,
            phone,
            location,
            password,
            confirmPassword
        } = req.body;
        
        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }
        
        // Check if password is strong enough
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        
        // Check if employeeId already exists
        const existingEmployee = await User.findOne({ employeeId });
        if (existingEmployee) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID already exists'
            });
        }
        
        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        // Validate role exists
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role selected'
            });
        }
        
        // Validate designation exists
        const designation = await Designation.findById(designationId);
        if (!designation) {
            return res.status(400).json({
                success: false,
                message: 'Invalid designation selected'
            });
        }
        
        // Create user
        const user = await User.create({
            employeeId,
            firstName,
            lastName,
            email,
            department,
            designationId,
            designationName: designation.name,
            roleId,
            roleName: role.name,
            phone,
            location,
            password,
            isActive: true
        });
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        // Populate references
        await User.populate(userResponse, [
            { path: 'roleId', select: 'name permissions' },
            { path: 'designationId', select: 'name' }
        ]);
        
        res.status(201).json({
            success: true,
            data: userResponse,
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('createUser error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// controllers/userController.js
const updateUser = async (req, res) => {
  try {
    const { isActive, ...otherUpdates } = req.body;
    
    const updateData = { ...otherUpdates };
    
    // Handle isActive specifically
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: user, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Private/Admin
const updateUserPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('updateUserPassword error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// controllers/userController.js

// Soft Delete (Deactivate)
const deactivateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'User deactivated successfully' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Hard Delete (Permanent Removal)
const deleteUser = async (req, res) => {
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
            message: 'User permanently deleted from database' 
        });
    } catch (error) {
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
    try {
        const total = await User.countDocuments();
        const active = await User.countDocuments({ isActive: true });
        const inactive = await User.countDocuments({ isActive: false });
        
        // Get role distribution
        const roleDistribution = await User.aggregate([
            {
                $group: {
                    _id: '$roleName',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    role: '$_id',
                    count: 1,
                    _id: 0
                }
            }
        ]);
        
        res.json({
            success: true,
            data: {
                total,
                active,
                inactive,
                roleDistribution
            }
        });
    } catch (error) {
        console.error('getUserStats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get users by role
// @route   GET /api/users/role/:roleId
// @access  Private
const getUsersByRole = async (req, res) => {
    try {
        const users = await User.find({ roleId: req.params.roleId })
            .select('-password')
            .populate('roleId', 'name permissions')
            .populate('designationId', 'name');
        
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('getUsersByRole error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk update user status
// @route   PATCH /api/users/bulk/status
// @access  Private/Admin
const bulkUpdateStatus = async (req, res) => {
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
        console.error('bulkUpdateStatus error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk assign role to users
// @route   PATCH /api/users/bulk/role
// @access  Private/Admin
const bulkAssignRole = async (req, res) => {
    try {
        const { userIds, roleId } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of user IDs'
            });
        }
        
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role selected'
            });
        }
        
        const result = await User.updateMany(
            { _id: { $in: userIds } },
            { roleId, roleName: role.name }
        );
        
        res.json({
            success: true,
            message: `Assigned role to ${result.modifiedCount} users`
        });
    } catch (error) {
        console.error('bulkAssignRole error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAvailableRoles,
    getAvailableDesignations,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,        // Hard delete
    deactivateUser,    // ← ADD THIS - Soft delete
    getUserStats,
    getUsersByRole,
    bulkUpdateStatus,
    bulkAssignRole
};