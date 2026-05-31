const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

// @desc    Add a new vehicle
// @route   POST /api/vehicles
// @access  Private (Admin/Manager)
// @desc    Add a new vehicle
// @route   POST /api/vehicles
// @access  Private (Admin/Manager)
const addVehicle = async (req, res) => {
    try {
        console.log('Adding new vehicle...');
        console.log('Request body:', req.body);

        // ✅ ONLY validate these fields (NO DATES)
        const requiredFields = [
            'company', 'model', 'year', 'vehicleNumber', 
            'registrationNumber', 'fuelType', 'engineNumber', 'chassisNumber'
        ];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required`
                });
            }
        }

        // ✅ Prepare vehicle data - ONLY include what's provided
        const vehicleData = {
            company: req.body.company,
            model: req.body.model,
            year: req.body.year,
            vehicleNumber: req.body.vehicleNumber,
            registrationNumber: req.body.registrationNumber,
            meterReading: req.body.meterReading || 0,
            fuelType: req.body.fuelType,
            engineNumber: req.body.engineNumber,
            chassisNumber: req.body.chassisNumber,
            createdBy: req.user.id,
            // Optional fields - only add if they exist
            ...(req.body.color && { color: req.body.color }),
            ...(req.body.transmission && { transmission: req.body.transmission }),
            ...(req.body.seatingCapacity && { seatingCapacity: req.body.seatingCapacity }),
            ...(req.body.vehicleCategory && { vehicleCategory: req.body.vehicleCategory }),
            ...(req.body.status && { status: req.body.status }),
            ...(req.body.assignedDriver && { assignedTo: req.body.assignedDriver }),
            ...(req.body.notes && { notes: req.body.notes }),
            // Date fields - ONLY add if they exist (completely optional)
            ...(req.body.purchaseDate && { purchaseDate: req.body.purchaseDate }),
            ...(req.body.purchasePrice && { purchasePrice: req.body.purchasePrice }),
            ...(req.body.insuranceExpiry && { insuranceExpiry: req.body.insuranceExpiry }),
            ...(req.body.registrationExpiry && { registrationExpiry: req.body.registrationExpiry })
        };

        // Check if vehicle already exists
        const existingVehicle = await Vehicle.findOne({
            $or: [
                { vehicleNumber: vehicleData.vehicleNumber },
                { registrationNumber: vehicleData.registrationNumber }
            ]
        });

        if (existingVehicle) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle with same Vehicle Number or Registration Number already exists'
            });
        }

        // Create vehicle
        const vehicle = await Vehicle.create(vehicleData);

        res.status(201).json({
            success: true,
            message: 'Vehicle added successfully',
            data: vehicle
        });

    } catch (error) {
        console.error('Add vehicle error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error while adding vehicle',
            error: error.message
        });
    }
};

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
const getAllVehicles = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = {};

        if (status) query.status = status;

        const vehicles = await Vehicle.find(query)
            .populate('assignedTo', 'firstName lastName employeeId phoneNumber location')
            .populate('createdBy', 'name')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Vehicle.countDocuments(query);

        res.status(200).json({
            success: true,
            count: vehicles.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: vehicles
        });

    } catch (error) {
        console.error('Get vehicles error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching vehicles'
        });
    }
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
const getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id)
            .populate('assignedTo', 'firstName lastName employeeId phoneNumber location department')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        res.status(200).json({
            success: true,
            data: vehicle
        });

    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching vehicle'
        });
    }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
const updateVehicle = async (req, res) => {
    try {
        let vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        // Update regular fields (if provided)
        const updateFields = [
            'company', 'model', 'year', 'vehicleNumber', 'registrationNumber',
            'meterReading', 'color', 'fuelType', 'transmission', 'seatingCapacity',
            'engineNumber', 'chassisNumber', 'vehicleCategory', 'notes', 'status', 'assignedTo'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                vehicle[field] = req.body[field];
            }
        });

        // Update date fields (ONLY if provided, can be null to clear)
        if (req.body.purchaseDate !== undefined) vehicle.purchaseDate = req.body.purchaseDate || null;
        if (req.body.purchasePrice !== undefined) vehicle.purchasePrice = req.body.purchasePrice || 0;
        if (req.body.insuranceExpiry !== undefined) vehicle.insuranceExpiry = req.body.insuranceExpiry || null;
        if (req.body.registrationExpiry !== undefined) vehicle.registrationExpiry = req.body.registrationExpiry || null;

        vehicle.updatedBy = req.user.id;
        await vehicle.save();

        res.status(200).json({
            success: true,
            message: 'Vehicle updated successfully',
            data: vehicle
        });

    } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating vehicle'
        });
    }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin only)
const deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        await vehicle.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Vehicle deleted successfully'
        });

    } catch (error) {
        console.error('Delete vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting vehicle'
        });
    }
};

// @desc    Assign vehicle to driver
// @route   PUT /api/vehicles/:id/assign
// @access  Private (Admin/Manager)
const assignVehicleToDriver = async (req, res) => {
    try {
        const { driverId } = req.body;

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'Driver ID is required'
            });
        }

        // Check if driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        // Check if vehicle exists
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        // Check if vehicle is already assigned
        if (vehicle.assignedTo) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle is already assigned to another driver'
            });
        }

        // Assign vehicle to driver
        vehicle.assignedTo = driverId;
        vehicle.updatedBy = req.user.id;
        await vehicle.save();

        // Also update driver's currentVehicle
        driver.currentVehicle = vehicle._id;
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Vehicle assigned to driver successfully',
            data: {
                vehicle: {
                    _id: vehicle._id,
                    company: vehicle.company,
                    model: vehicle.model,
                    vehicleNumber: vehicle.vehicleNumber
                },
                driver: {
                    _id: driver._id,
                    name: driver.name,
                    employeeId: driver.employeeId
                }
            }
        });

    } catch (error) {
        console.error('Assign vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while assigning vehicle'
        });
    }
};

// @desc    Unassign vehicle from driver
// @route   PUT /api/vehicles/:id/unassign
// @access  Private (Admin/Manager)
const unassignVehicleFromDriver = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        if (!vehicle.assignedTo) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle is not assigned to any driver'
            });
        }

        // Update driver's currentVehicle
        await Driver.findByIdAndUpdate(vehicle.assignedTo, {
            $unset: { currentVehicle: 1 }
        });

        // Unassign vehicle
        vehicle.assignedTo = null;
        vehicle.updatedBy = req.user.id;
        await vehicle.save();

        res.status(200).json({
            success: true,
            message: 'Vehicle unassigned successfully',
            data: vehicle
        });

    } catch (error) {
        console.error('Unassign vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while unassigning vehicle'
        });
    }
};

// @desc    Get vehicles by status
// @route   GET /api/vehicles/status/:status
// @access  Private
const getVehiclesByStatus = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ status: req.params.status })
            .populate('assignedTo', 'name employeeId')
            .select('company model vehicleNumber status meterReading assignedTo');

        res.status(200).json({
            success: true,
            count: vehicles.length,
            data: vehicles
        });

    } catch (error) {
        console.error('Get vehicles by status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching vehicles'
        });
    }
};

// @desc    Get available vehicles (not assigned)
// @route   GET /api/vehicles/available
// @access  Private
const getAvailableVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ 
            assignedTo: null,
            status: 'active'
        }).select('company model vehicleNumber meterReading');

        res.status(200).json({
            success: true,
            count: vehicles.length,
            data: vehicles
        });

    } catch (error) {
        console.error('Get available vehicles error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching available vehicles'
        });
    }
};

module.exports = {
    addVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
    assignVehicleToDriver,
    unassignVehicleFromDriver,
    getVehiclesByStatus,
    getAvailableVehicles
};