const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const { Designation, Location } = require('../models/Ledger');
const mongoose = require('mongoose');

const getFilePath = (file) => {
  if (!file) return null;
  return `/uploads/${file.filename}`;
};

// ─────────────────────────────────────────────────────────────
// @desc    Add a new driver
// @route   POST /api/drivers
// @access  Private
// ─────────────────────────────────────────────────────────────
const addDriver = async (req, res) => {
  try {
    const {
      firstName, lastName, cnic, phoneNumber, employeeId, department,
      designation, location, allocatedVehicle, dateOfAllotment,
      licenseNumber, licenseExpiry, joiningDate, status,
    } = req.body;

    console.log('=== ADD DRIVER ===');
    console.log('allocatedVehicle:', allocatedVehicle);
    console.log('dateOfAllotment:', dateOfAllotment);

    // Validation
    const required = { firstName, lastName, cnic, phoneNumber, employeeId,
      department, designation, location, licenseNumber, licenseExpiry };
    
    for (const [field, value] of Object.entries(required)) {
      if (!value || String(value).trim() === '') {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }

    // Check duplicates
    const existing = await Driver.findOne({
      $or: [{ employeeId }, { licenseNumber }, { cnic }],
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Driver already exists' });
    }

    // Convert designation/location IDs to names
    let designationName = designation;
    if (designation && designation.match(/^[0-9a-fA-F]{24}$/)) {
      const desDoc = await Designation.findById(designation);
      if (desDoc) designationName = desDoc.name;
    }
    
    let locationName = location;
    if (location && location.match(/^[0-9a-fA-F]{24}$/)) {
      const locDoc = await Location.findById(location);
      if (locDoc) locationName = locDoc.name;
    }

    // Handle files
    const profilePicturePath = req.files?.profilePicture ? getFilePath(req.files.profilePicture[0]) : null;
    const uploadedDocs = req.files?.documents ? req.files.documents.map((file) => ({
      name: file.originalname,
      url: getFilePath(file),
      uploadedAt: new Date(),
    })) : [];

    // Create driver
    const driverData = {
      firstName: firstName.trim(), lastName: lastName.trim(), cnic: cnic.trim(),
      phoneNumber: phoneNumber.trim(), employeeId: employeeId.trim(), department: department.trim(),
      designation: designationName, location: locationName,
      allocatedVehicle: allocatedVehicle || null, dateOfAllotment: dateOfAllotment || null,
      licenseNumber: licenseNumber.trim(), licenseExpiry,
      joiningDate: joiningDate || new Date(), status: status || 'available',
      profilePicture: profilePicturePath, documents: uploadedDocs,
      createdBy: req.user.id,
    };

    const driver = await Driver.create(driverData);
    console.log('Driver created:', driver._id);

    // ── UPDATE VEHICLE ASSIGNMENT ──
    if (allocatedVehicle && allocatedVehicle !== 'null' && allocatedVehicle !== '') {
      try {
        const vehicle = await Vehicle.findById(allocatedVehicle);
        if (!vehicle) {
          return res.status(400).json({ success: false, message: 'Vehicle not found' });
        }
        
        // Assign vehicle to this driver
        vehicle.assignedTo = driver._id;
        vehicle.updatedBy = req.user.id;
        await vehicle.save();
        console.log(`✅ Vehicle ${allocatedVehicle} assigned to driver ${driver._id}`);
      } catch (vehicleError) {
        console.error('❌ Vehicle assignment error:', vehicleError);
        return res.status(500).json({ success: false, message: 'Failed to assign vehicle', error: vehicleError.message });
      }
    }

    // Return driver with populated vehicle
    const populatedDriver = await Driver.findById(driver._id).populate('allocatedVehicle', 'company model vehicleNumber registrationNumber');

    res.status(201).json({ success: true, message: 'Driver added successfully', data: populatedDriver });
  } catch (error) {
    console.error('Add driver error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Update driver
// @route   PUT /api/drivers/:id
// @access  Private
// ─────────────────────────────────────────────────────────────
const updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const oldVehicleId = driver.allocatedVehicle?.toString();
    const newVehicleId = req.body.allocatedVehicle;

    console.log('=== UPDATE DRIVER ===');
    console.log('Driver ID:', driver._id);
    console.log('Old Vehicle ID:', oldVehicleId);
    console.log('New Vehicle ID:', newVehicleId);

    // Update basic fields
    const textFields = ['firstName', 'lastName', 'cnic', 'phoneNumber', 'department',
      'licenseNumber', 'licenseExpiry', 'joiningDate', 'status'];
    textFields.forEach(field => {
      if (req.body[field] !== undefined) driver[field] = req.body[field];
    });
    
    if (req.body.dateOfAllotment !== undefined) driver.dateOfAllotment = req.body.dateOfAllotment || null;
    
    // Handle designation
    if (req.body.designation) {
      let desName = req.body.designation;
      if (req.body.designation.match(/^[0-9a-fA-F]{24}$/)) {
        const desDoc = await Designation.findById(req.body.designation);
        if (desDoc) desName = desDoc.name;
      }
      driver.designation = desName;
    }
    
    // Handle location
    if (req.body.location) {
      let locName = req.body.location;
      if (req.body.location.match(/^[0-9a-fA-F]{24}$/)) {
        const locDoc = await Location.findById(req.body.location);
        if (locDoc) locName = locDoc.name;
      }
      driver.location = locName;
    }
    
    driver.allocatedVehicle = newVehicleId || null;

    // ── HANDLE VEHICLE ASSIGNMENT CHANGES ──
    try {
      // Unassign old vehicle
      if (oldVehicleId && oldVehicleId !== newVehicleId) {
        const oldVehicle = await Vehicle.findById(oldVehicleId);
        if (oldVehicle) {
          oldVehicle.assignedTo = null;
          oldVehicle.updatedBy = req.user.id;
          await oldVehicle.save();
          console.log(`✅ Vehicle ${oldVehicleId} unassigned from driver`);
        }
      }
      
      // Assign new vehicle
      if (newVehicleId && newVehicleId !== 'null' && newVehicleId !== '') {
        const newVehicle = await Vehicle.findById(newVehicleId);
        if (newVehicle) {
          // Check if vehicle is already assigned to another driver
          if (newVehicle.assignedTo && newVehicle.assignedTo.toString() !== driver._id.toString()) {
            return res.status(400).json({
              success: false,
              message: 'This vehicle is already assigned to another driver'
            });
          }
          newVehicle.assignedTo = driver._id;
          newVehicle.updatedBy = req.user.id;
          await newVehicle.save();
          console.log(`✅ Vehicle ${newVehicleId} assigned to driver ${driver._id}`);
        } else {
          return res.status(400).json({
            success: false,
            message: 'Vehicle not found'
          });
        }
      }
    } catch (vehicleError) {
      console.error('❌ Vehicle assignment error:', vehicleError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update vehicle assignment', 
        error: vehicleError.message 
      });
    }

    // Handle profile picture
    if (req.files?.profilePicture) {
      driver.profilePicture = getFilePath(req.files.profilePicture[0]);
    }

    // Handle documents
    if (req.files?.documents) {
      const newDocs = req.files.documents.map((file) => ({
        name: file.originalname,
        url: getFilePath(file),
        uploadedAt: new Date(),
      }));
      driver.documents = [...driver.documents, ...newDocs];
    }

    driver.updatedBy = req.user.id;
    await driver.save();

    // Return populated driver
    const populatedDriver = await Driver.findById(driver._id).populate('allocatedVehicle', 'company model vehicleNumber registrationNumber');

    res.status(200).json({ success: true, message: 'Driver updated successfully', data: populatedDriver });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Delete driver
// @route   DELETE /api/drivers/:id
// @access  Private
// ─────────────────────────────────────────────────────────────
const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Unassign vehicle if allocated
    if (driver.allocatedVehicle) {
      const vehicle = await Vehicle.findById(driver.allocatedVehicle);
      if (vehicle) {
        vehicle.assignedTo = null;
        vehicle.updatedBy = req.user.id;
        await vehicle.save();
        console.log(`✅ Vehicle ${driver.allocatedVehicle} unassigned from driver`);
      }
    }

    await driver.deleteOne();
    res.status(200).json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Private
// ─────────────────────────────────────────────────────────────
const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find()
      .populate('allocatedVehicle', 'company model vehicleNumber registrationNumber status assignedTo')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get single driver
// @route   GET /api/drivers/:id
// @access  Private
// ─────────────────────────────────────────────────────────────
const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('allocatedVehicle', 'company model vehicleNumber registrationNumber status assignedTo');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get drivers by status
// @route   GET /api/drivers/status/:status
// @access  Private
// ─────────────────────────────────────────────────────────────
const getDriversByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['available', 'on trip', 'off duty', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const drivers = await Driver.find({ status }).populate('allocatedVehicle', 'company model vehicleNumber');
    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    console.error('Get drivers by status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Update driver status
// @route   PATCH /api/drivers/:id/status
// @access  Private
// ─────────────────────────────────────────────────────────────
const updateDriverStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'on trip', 'off duty', 'suspended'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user.id },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, message: 'Status updated', data: driver });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    TEST: Manually assign vehicle to driver
// @route   POST /api/drivers/test-assign
// @access  Private
// ─────────────────────────────────────────────────────────────
const testAssignVehicle = async (req, res) => {
  try {
    const { vehicleId, driverId } = req.body;
    
    console.log('=== TEST ASSIGNMENT ===');
    console.log('Vehicle ID:', vehicleId);
    console.log('Driver ID:', driverId);
    
    // Update vehicle
    const vehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { assignedTo: driverId },
      { new: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    
    console.log('Vehicle after update:', {
      _id: vehicle._id,
      assignedTo: vehicle.assignedTo
    });
    
    res.status(200).json({
      success: true,
      message: 'Vehicle assigned successfully',
      data: vehicle
    });
  } catch (error) {
    console.error('Test assign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  addDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getDriversByStatus,
  updateDriverStatus,
  testAssignVehicle,
};