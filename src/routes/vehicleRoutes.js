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
    .post(authorize('Admin', 'Manager'), addVehicle)
    .get(authorize('Admin', 'Manager', 'Dispatcher'), getAllVehicles);

router.get('/available', authorize('Admin', 'Manager', 'Dispatcher'), getAvailableVehicles);
router.get('/status/:status', authorize('Admin', 'Manager', 'Dispatcher'), getVehiclesByStatus);

// Assignment routes
router.put('/:id/assign', authorize('Admin', 'Manager'), assignVehicleToDriver);
router.put('/:id/unassign', authorize('Admin', 'Manager'), unassignVehicleFromDriver);

router.route('/:id')
    .get(authorize('Admin', 'Manager', 'Dispatcher'), getVehicleById)
    .put(authorize('Admin', 'Manager'), updateVehicle)
    .delete(authorize('Admin'), deleteVehicle);

module.exports = router;