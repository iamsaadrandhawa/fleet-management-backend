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

console.log('🔄 Loading user routes...');

// All routes are protected
router.use(protect);

// User management routes
router.route('/')
    .get(authorize('Admin', 'Manager'), getAllUsers)
    .post(authorize('Admin'), createUser);

// Statistics
router.get('/stats', authorize('Admin', 'Manager'), getUserStats);

// Users by role
router.get('/role/:role', authorize('Admin', 'Manager'), getUsersByRole);

// Bulk operations
router.patch('/bulk/status', authorize('Admin'), bulkUpdateStatus);

// User specific routes
router.route('/:id')
    .get(authorize('Admin', 'Manager'), getUserById)
    .put(authorize('Admin'), updateUser)
    .delete(authorize('Admin'), deleteUser); // Soft delete

// Hard delete
router.delete('/:id/hard', authorize('Admin'), hardDeleteUser);

// Password management
router.put('/:id/password', authorize('Admin'), updateUserPassword);

console.log('✅ User routes loaded with endpoints:', {
    'GET /': 'Get all users',
    'POST /': 'Create user',
    'GET /stats': 'Get user statistics',
    'GET /role/:role': 'Get users by role',
    'PATCH /bulk/status': 'Bulk update status',
    'GET /:id': 'Get user by ID',
    'PUT /:id': 'Update user',
    'DELETE /:id': 'Soft delete user',
    'DELETE /:id/hard': 'Hard delete user',
    'PUT /:id/password': 'Update password'
});

module.exports = router;