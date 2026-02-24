const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    createMaintenance,
    getAllMaintenance,
    getMaintenanceById,
    updateMaintenance,
    deleteMaintenance,
    getMaintenanceStats
} = require('../controllers/maintenanceController');

router.use(protect);

router.route('/')
    .post(authorize('Admin', 'Manager'), createMaintenance)
    .get(authorize('Admin', 'Manager', 'Dispatcher'), getAllMaintenance);

router.get('/stats', authorize('Admin', 'Manager'), getMaintenanceStats);

router.route('/:id')
    .get(authorize('Admin', 'Manager', 'Dispatcher'), getMaintenanceById)
    .put(authorize('Admin', 'Manager'), updateMaintenance)
    .delete(authorize('Admin'), deleteMaintenance);

module.exports = router;