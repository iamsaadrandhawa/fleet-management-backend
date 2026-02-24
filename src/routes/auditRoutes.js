const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getAuditLogs,
    getAuditLogById,
    getAuditStats,
    getUserActivity
} = require('../controllers/auditController');

router.use(protect);
router.use(authorize('Admin')); // Only admins can view audit logs

router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);
router.get('/user/:userId', getUserActivity);
router.get('/:id', getAuditLogById);

module.exports = router;