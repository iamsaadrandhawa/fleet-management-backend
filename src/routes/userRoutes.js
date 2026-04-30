const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    hardDeleteUser,
    updateUserPassword,
    getUsersByRole,
    getUserStats,
    bulkUpdateStatus
} = require('../controllers/userController');

// All routes are protected
router.use(protect);

// User management routes
router.route('/')
    .get(authorize('admin', 'manager'), getAllUsers)
    .post(authorize('admin'), createUser);

// Statistics
router.get('/stats', authorize('admin', 'manager'), getUserStats);

// Users by role
router.get('/role/:role', authorize('admin', 'manager'), getUsersByRole);

// Bulk operations
router.patch('/bulk/status', authorize('admin'), bulkUpdateStatus);

// User specific routes
router.route('/:id')
    .get(authorize('admin', 'manager'), getUserById)
    .put(authorize('admin'), updateUser)
    .delete(authorize('admin'), deleteUser);

// Hard delete
router.delete('/:id/hard', authorize('admin'), hardDeleteUser);

// Password management
router.put('/:id/password', authorize('admin'), updateUserPassword);

module.exports = router;