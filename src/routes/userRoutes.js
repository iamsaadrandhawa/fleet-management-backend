// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const {
    getAvailableRoles,
    getAvailableDesignations,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,        // Hard delete
    deactivateUser,    // Soft delete
    getUserStats,
    getUsersByRole,
    bulkUpdateStatus,
    bulkAssignRole
} = require('../controllers/userController');

// All routes require authentication
router.use(protect);

// Get available data for dropdowns
router.get('/available-roles', checkPermission('read'), getAvailableRoles);
router.get('/available-designations', checkPermission('read'), getAvailableDesignations);

// User statistics
router.get('/stats', checkPermission('read'), getUserStats);

// Bulk operations
router.patch('/bulk/status', checkPermission('update'), bulkUpdateStatus);
router.patch('/bulk/role', checkPermission('update'), bulkAssignRole);

// Get users by role
router.get('/role/:roleId', checkPermission('read'), getUsersByRole);

// Password update
router.put('/:id/password', checkPermission('update'), updateUserPassword);

// ✅ IMPORTANT: Specific routes MUST come before generic routes
// DELETE ROUTES - Put these BEFORE the generic /:id routes
router.delete('/:id/hard', checkPermission('delete'), deleteUser);      // Hard delete (permanent)
router.delete('/:id/soft', checkPermission('delete'), deactivateUser);  // Soft delete (deactivate)

// Standard CRUD operations - Generic routes come LAST
router.get('/', checkPermission('read'), getAllUsers);
router.post('/', checkPermission('create'), createUser);
router.get('/:id', checkPermission('read'), getUserById);
router.put('/:id', checkPermission('update'), updateUser);
router.delete('/:id', checkPermission('delete'), deactivateUser);       // Default soft delete - MUST BE LAST

module.exports = router;