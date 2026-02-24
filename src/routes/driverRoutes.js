const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    addDriver,
    getAllDrivers,
    getDriverById,
    updateDriver,
    deleteDriver,
    getDriversByStatus,
    updateDriverStatus
} = require('../controllers/driverController');

// All routes are protected
router.use(protect);

// Driver management routes
router.route('/')
    .post(authorize('Admin', 'Manager'), addDriver)
    .get(authorize('Admin', 'Manager', 'Dispatcher'), getAllDrivers);

router.get('/status/:status', authorize('Admin', 'Manager', 'Dispatcher'), getDriversByStatus);
router.patch('/:id/status', authorize('Admin', 'Manager'), updateDriverStatus);

router.route('/:id')
    .get(authorize('Admin', 'Manager', 'Dispatcher'), getDriverById)
    .put(authorize('Admin', 'Manager'), updateDriver)
    .delete(authorize('Admin'), deleteDriver);

module.exports = router;