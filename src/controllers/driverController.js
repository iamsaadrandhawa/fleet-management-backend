const Driver = require('../models/Driver');
const fs = require('fs').promises;
const path = require('path');

// @desc    Add a new driver
// @route   POST /api/drivers
// @access  Private (Admin/Manager)
const addDriver = async (req, res) => {
    try {
        console.log('Adding new driver...');
        
        // Prepare driver data (only 7 fields)
        const driverData = {
            name: req.body.name,
            employeeId: req.body.employeeId,
            department: req.body.department,
            phoneNumber: req.body.phoneNumber,
            licenseNumber: req.body.licenseNumber,
            location: req.body.location,
            createdBy: req.user.id
        };

        // Validate required fields
        const requiredFields = ['name', 'employeeId', 'department', 'phoneNumber', 'licenseNumber', 'location'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required`
                });
            }
        }

        // Check if driver with same employeeId or licenseNumber already exists
        const existingDriver = await Driver.findOne({
            $or: [
                { employeeId: driverData.employeeId },
                { licenseNumber: driverData.licenseNumber }
            ]
        });

        if (existingDriver) {
            return res.status(400).json({
                success: false,
                message: 'Driver with same Employee ID or License Number already exists'
            });
        }

        // Create driver
        const driver = await Driver.create(driverData);

        res.status(201).json({
            success: true,
            message: 'Driver added successfully',
            data: {
                _id: driver._id,
                name: driver.name,
                employeeId: driver.employeeId,
                department: driver.department,
                phoneNumber: driver.phoneNumber,
                licenseNumber: driver.licenseNumber,
                location: driver.location,
                status: driver.status,
                createdAt: driver.createdAt
            }
        });

    } catch (error) {
        console.error('Add driver error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Server error while adding driver',
            error: error.message
        });
    }
};

// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Private
const getAllDrivers = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = {};

        if (status) query.status = status;

        const drivers = await Driver.find(query)
            .select('name employeeId department phoneNumber licenseNumber location status createdAt')
            .populate('createdBy', 'name')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Driver.countDocuments(query);

        res.status(200).json({
            success: true,
            count: drivers.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: drivers
        });

    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching drivers'
        });
    }
};

// @desc    Get single driver
// @route   GET /api/drivers/:id
// @access  Private
const getDriverById = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .select('name employeeId department phoneNumber licenseNumber location status createdAt updatedAt')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        res.status(200).json({
            success: true,
            data: driver
        });

    } catch (error) {
        console.error('Get driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching driver'
        });
    }
};

// @desc    Update driver
// @route   PUT /api/drivers/:id
// @access  Private
const updateDriver = async (req, res) => {
    try {
        let driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        // Update basic fields
        const updateFields = ['name', 'department', 'phoneNumber', 'licenseNumber', 'location'];
        updateFields.forEach(field => {
            if (req.body[field]) driver[field] = req.body[field];
        });

        driver.updatedBy = req.user.id;
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Driver updated successfully',
            data: {
                _id: driver._id,
                name: driver.name,
                employeeId: driver.employeeId,
                department: driver.department,
                phoneNumber: driver.phoneNumber,
                licenseNumber: driver.licenseNumber,
                location: driver.location,
                status: driver.status,
                updatedAt: driver.updatedAt
            }
        });

    } catch (error) {
        console.error('Update driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating driver'
        });
    }
};

// @desc    Delete driver
// @route   DELETE /api/drivers/:id
// @access  Private (Admin only)
const deleteDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        await driver.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Driver deleted successfully'
        });

    } catch (error) {
        console.error('Delete driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting driver'
        });
    }
};

// @desc    Update driver status
// @route   PATCH /api/drivers/:id/status
// @access  Private
const updateDriverStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const driver = await Driver.findByIdAndUpdate(
            req.params.id,
            { status, updatedBy: req.user.id },
            { new: true, runValidators: true }
        ).select('name employeeId status');

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Driver status updated successfully',
            data: driver
        });

    } catch (error) {
        console.error('Update driver status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating driver status'
        });
    }
};

// @desc    Get drivers by status
// @route   GET /api/drivers/status/:status
// @access  Private
const getDriversByStatus = async (req, res) => {
    try {
        const drivers = await Driver.find({ status: req.params.status })
            .select('name employeeId phoneNumber location status');

        res.status(200).json({
            success: true,
            count: drivers.length,
            data: drivers
        });

    } catch (error) {
        console.error('Get drivers by status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching drivers'
        });
    }
};

module.exports = {
    addDriver,
    getAllDrivers,
    getDriverById,
    updateDriver,
    deleteDriver,
    updateDriverStatus,
    getDriversByStatus
};