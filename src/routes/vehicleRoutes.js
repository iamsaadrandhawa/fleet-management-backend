const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    addVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
    assignVehicleToDriver,
    unassignVehicleFromDriver,
    getVehiclesByStatus,
    getAvailableVehicles
} = require('../controllers/vehicleController');

// All routes are protected
router.use(protect);

// Vehicle management routes
router.route('/')
    .post(authorize('admin', 'manager'), addVehicle)
    .get(authorize('admin', 'manager', 'dispatcher'), getAllVehicles);

router.get('/available', authorize('admin', 'manager', 'dispatcher'), getAvailableVehicles);
router.get('/status/:status', authorize('admin', 'manager', 'dispatcher'), getVehiclesByStatus);

// Assignment routes
router.put('/:id/assign', authorize('admin', 'manager'), assignVehicleToDriver);
router.put('/:id/unassign', authorize('admin', 'manager'), unassignVehicleFromDriver);

router.route('/:id')
    .get(authorize('admin', 'manager', 'dispatcher'), getVehicleById)
    .put(authorize('admin', 'manager'), updateVehicle)
    .delete(authorize('admin'), deleteVehicle);

module.exports = router;