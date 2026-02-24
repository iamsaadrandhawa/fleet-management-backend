const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const AuditService = require('../services/auditService');

// @desc    Create maintenance record
// @route   POST /api/maintenance
// @access  Private
const createMaintenance = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.body.vehicle);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        const maintenanceData = {
            ...req.body,
            vehicleNumber: vehicle.vehicleNumber,
            createdBy: req.user.id
        };

        const maintenance = await Maintenance.create(maintenanceData);

        // Update vehicle status if needed
        if (maintenance.status === 'In Progress' || maintenance.priority === 'Emergency') {
            vehicle.status = 'in maintenance';
            await vehicle.save();
        }

        // Audit Log
        await AuditService.logCreate(
            req, 'MAINTENANCE', 
            maintenance._id, 
            `${vehicle.vehicleNumber} - ${maintenance.maintenanceType}`
        );

        res.status(201).json({
            success: true,
            data: maintenance
        });

    } catch (error) {
        console.error('Create maintenance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get all maintenance records
// @route   GET /api/maintenance
// @access  Private
const getAllMaintenance = async (req, res) => {
    try {
        const { status, vehicle, priority, page = 1, limit = 10 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (vehicle) query.vehicle = vehicle;
        if (priority) query.priority = priority;

        const maintenance = await Maintenance.find(query)
            .populate('vehicle', 'company model vehicleNumber')
            .populate('createdBy', 'name email')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ scheduledDate: -1, createdAt: -1 });

        const total = await Maintenance.countDocuments(query);

        res.status(200).json({
            success: true,
            count: maintenance.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: maintenance
        });

    } catch (error) {
        console.error('Get maintenance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single maintenance record
// @route   GET /api/maintenance/:id
// @access  Private
const getMaintenanceById = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id)
            .populate('vehicle')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        res.status(200).json({
            success: true,
            data: maintenance
        });

    } catch (error) {
        console.error('Get maintenance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update maintenance record
// @route   PUT /api/maintenance/:id
// @access  Private
const updateMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        const oldData = { ...maintenance.toObject() };
        
        // Update fields
        Object.keys(req.body).forEach(key => {
            maintenance[key] = req.body[key];
        });
        
        maintenance.updatedBy = req.user.id;
        await maintenance.save();

        // If completed, update vehicle status
        if (req.body.status === 'Completed' && !maintenance.completedDate) {
            maintenance.completedDate = new Date();
            await maintenance.save();

            const vehicle = await Vehicle.findById(maintenance.vehicle);
            if (vehicle) {
                vehicle.status = 'active';
                vehicle.lastMaintenanceDate = new Date();
                vehicle.nextMaintenanceDate = maintenance.nextMaintenanceDue?.date;
                await vehicle.save();
            }
        }

        // Audit Log
        await AuditService.logUpdate(
            req, 'MAINTENANCE',
            maintenance._id,
            `${maintenance.vehicleNumber} - ${maintenance.maintenanceType}`,
            oldData,
            maintenance.toObject(),
            Object.keys(req.body)
        );

        res.status(200).json({
            success: true,
            data: maintenance
        });

    } catch (error) {
        console.error('Update maintenance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete maintenance record
// @route   DELETE /api/maintenance/:id
// @access  Private (Admin only)
const deleteMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        await maintenance.deleteOne();

        // Audit Log
        await AuditService.logDelete(
            req, 'MAINTENANCE',
            maintenance._id,
            `${maintenance.vehicleNumber} - ${maintenance.maintenanceType}`
        );

        res.status(200).json({
            success: true,
            message: 'Maintenance record deleted successfully'
        });

    } catch (error) {
        console.error('Delete maintenance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get maintenance statistics
// @route   GET /api/maintenance/stats
// @access  Private
const getMaintenanceStats = async (req, res) => {
    try {
        const stats = await Maintenance.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalCost: { $sum: '$actualCost' },
                    avgCost: { $avg: '$actualCost' }
                }
            }
        ]);

        const upcomingMaintenance = await Maintenance.find({
            scheduledDate: { $gte: new Date() },
            status: { $ne: 'Completed' }
        }).sort({ scheduledDate: 1 }).limit(5);

        res.status(200).json({
            success: true,
            data: {
                stats,
                upcomingMaintenance
            }
        });

    } catch (error) {
        console.error('Maintenance stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    createMaintenance,
    getAllMaintenance,
    getMaintenanceById,
    updateMaintenance,
    deleteMaintenance,
    getMaintenanceStats
};