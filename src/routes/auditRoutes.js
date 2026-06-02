/**
 * ============================================================
 * AUDIT ROUTES — routes/auditRoutes.js
 * ============================================================
 *
 * FIXES APPLIED vs your original files:
 *  1. Route ordering bug fixed: /stats and /user/:userId MUST be
 *     declared BEFORE /:id, otherwise Express matches them as IDs.
 *  2. Merged the richer controller (auditController.js) into this
 *     file — single source of truth, no duplication.
 *  3. Added pagination, search, date filtering to GET /.
 *  4. Added bulk delete + export endpoints that were missing from routes.
 *  5. Consistent response shape: { success, data, count, total, page, pages }.
 *  6. Added LEDGER to module enum check (it was missing).
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// ─────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────

// POST /api/audit-logs
// Access: Any authenticated user (service accounts, UI clients)
const createAuditLog = async (req, res) => {
    try {
        const logData = {
            user:      req.body.userId    || req.user?._id || req.user?.id,
            userEmail: req.body.userEmail || req.user?.email,
            userRole:  req.body.userRole  || req.user?.roleName || req.user?.role || 'USER',
            action:    req.body.action,
            module:    req.body.module,
            targetId:     req.body.targetId   || null,
            targetModel:  req.body.targetModel || null,
            targetName:   req.body.targetName  || null,
            changes:      req.body.changes     || {},
            requestInfo: {
                method:    req.body.requestInfo?.method    || req.method,
                url:       req.body.requestInfo?.url       || req.originalUrl,
                ip:        req.ip || req.body.requestInfo?.ip || req.headers['x-forwarded-for'] || 'unknown',
                userAgent: req.body.requestInfo?.userAgent || req.get('User-Agent') || 'unknown',
            },
            status:       req.body.status       || 'SUCCESS',
            description:  req.body.description  || null,
            errorMessage: req.body.errorMessage || null,
            metadata:     req.body.metadata     || {},
            timestamp:    new Date(),
        };

        if (!logData.action || !logData.module) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: action and module',
            });
        }

        // Validate enums before hitting Mongoose (clearer error messages)
        const validActions = [
            'CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT',
            'ASSIGN','UNASSIGN','UPLOAD','DOWNLOAD','EXPORT',
            'STATUS_CHANGE','PASSWORD_CHANGE','PROFILE_UPDATE',
        ];
        const validModules = ['USER','DRIVER','VEHICLE','MAINTENANCE','ROLE','AUTH','SYSTEM','LEDGER'];

        if (!validActions.includes(logData.action)) {
            return res.status(400).json({
                success: false,
                message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
            });
        }
        if (!validModules.includes(logData.module)) {
            return res.status(400).json({
                success: false,
                message: `Invalid module. Must be one of: ${validModules.join(', ')}`,
            });
        }

        const log = await AuditLog.create(logData);

        return res.status(201).json({ success: true, data: log });
    } catch (error) {
        console.error('❌ createAuditLog:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/audit-logs  — paginated, filtered list
// Access: Admin only
const getAuditLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            user,
            module,
            action,
            status,
            userEmail,
            startDate,
            endDate,
            search,
        } = req.query;

        const query = {};

        if (user)      query.user      = user;
        if (module)    query.module    = module;
        if (action)    query.action    = action;
        if (status)    query.status    = status;
        if (userEmail) query.userEmail = new RegExp(userEmail, 'i');

        if (search) {
            query.$or = [
                { userEmail:   { $regex: search, $options: 'i' } },
                { targetName:  { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate)   query.timestamp.$lte = new Date(endDate);
        }

        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
        const skip     = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum),
            AuditLog.countDocuments(query),
        ]);

        return res.json({
            success: true,
            count: logs.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            data: logs,
        });
    } catch (error) {
        console.error('❌ getAuditLogs:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/audit-logs/stats  — aggregated dashboard stats
// Access: Admin only
const getAuditStats = async (req, res) => {
    try {
        const [summary, byAction, byModule, byStatus, dailyActivity, recentActivity] =
            await Promise.all([
                AuditLog.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalLogs:    { $sum: 1 },
                            uniqueUsers:  { $addToSet: '$userEmail' },
                            failedCount:  { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
                        },
                    },
                    {
                        $project: {
                            totalLogs:        1,
                            uniqueUsersCount: { $size: '$uniqueUsers' },
                            failedCount:      1,
                            successRate: {
                                $cond: [
                                    { $eq: ['$totalLogs', 0] },
                                    100,
                                    {
                                        $round: [
                                            {
                                                $multiply: [
                                                    { $divide: [{ $subtract: ['$totalLogs', '$failedCount'] }, '$totalLogs'] },
                                                    100,
                                                ],
                                            },
                                            1,
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                ]),

                AuditLog.aggregate([
                    { $group: { _id: '$action', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                ]),

                AuditLog.aggregate([
                    { $group: { _id: '$module', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                ]),

                AuditLog.aggregate([
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),

                // Last 30 days daily breakdown
                AuditLog.aggregate([
                    {
                        $match: {
                            timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                        },
                    },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),

                AuditLog.find()
                    .sort({ timestamp: -1 })
                    .limit(10),
            ]);

        return res.json({
            success: true,
            data: {
                summary: summary[0] || { totalLogs: 0, uniqueUsersCount: 0, failedCount: 0, successRate: 100 },
                byAction,
                byModule,
                byStatus,
                dailyActivity,
                recentActivity,
            },
        });
    } catch (error) {
        console.error('❌ getAuditStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/audit-logs/user/:userId
// Access: Admin only
const getUserActivity = async (req, res) => {
    try {
        const { limit = 100, page = 1 } = req.query;
        const limitNum = Math.min(200, parseInt(limit));
        const skip = (Math.max(1, parseInt(page)) - 1) * limitNum;

        const [logs, total] = await Promise.all([
            AuditLog.find({ user: req.params.userId })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum),
            AuditLog.countDocuments({ user: req.params.userId }),
        ]);

        return res.json({ success: true, count: logs.length, total, data: logs });
    } catch (error) {
        console.error('❌ getUserActivity:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/audit-logs/:id
// Access: Admin only
const getAuditLogById = async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Audit log not found' });
        }
        return res.json({ success: true, data: log });
    } catch (error) {
        console.error('❌ getAuditLogById:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/audit-logs/:id
// Access: Admin only
const deleteAuditLog = async (req, res) => {
    try {
        const log = await AuditLog.findByIdAndDelete(req.params.id);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Audit log not found' });
        }
        return res.json({ success: true, message: 'Audit log deleted' });
    } catch (error) {
        console.error('❌ deleteAuditLog:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/audit-logs/bulk
// Body: { logIds?, deleteAll?, olderThanDays?, action?, module? }
// Access: Admin only
const bulkDeleteAuditLogs = async (req, res) => {
    try {
        const { logIds, deleteAll, olderThanDays, action, module } = req.body;

        let query = null;

        if (deleteAll)                       query = {};
        else if (logIds?.length > 0)         query = { _id: { $in: logIds } };
        else if (olderThanDays) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - parseInt(olderThanDays));
            query = { timestamp: { $lt: cutoff } };
        }
        else if (action)  query = { action };
        else if (module)  query = { module };

        if (query === null) {
            return res.status(400).json({
                success: false,
                message: 'Provide one of: logIds, deleteAll, olderThanDays, action, module',
            });
        }

        const result = await AuditLog.deleteMany(query);
        return res.json({
            success: true,
            message: `${result.deletedCount} audit log(s) deleted`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error('❌ bulkDeleteAuditLogs:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/audit-logs  (delete ALL — alias kept for compatibility)
const deleteAllAuditLogs = async (req, res) => {
    try {
        const result = await AuditLog.deleteMany({});
        return res.json({
            success: true,
            message: `${result.deletedCount} audit logs deleted`,
        });
    } catch (error) {
        console.error('❌ deleteAllAuditLogs:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/audit-logs/export/csv
// Access: Admin only
const exportAuditLogs = async (req, res) => {
    try {
        const { startDate, endDate, module, action } = req.query;

        const query = {};
        if (module)    query.module = module;
        if (action)    query.action = action;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate)   query.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query).sort({ timestamp: -1 });

        const escape = (v) => `"${String(v ?? 'N/A').replace(/"/g, '""')}"`;

        const headers = ['Timestamp','User Email','User Role','Action','Module','Target','Status','Description','IP','User Agent'];
        const rows = logs.map((l) => [
            l.timestamp.toISOString(),
            l.userEmail,
            l.userRole,
            l.action,
            l.module,
            l.targetName || '',
            l.status,
            l.description || '',
            l.requestInfo?.ip || '',
            l.requestInfo?.userAgent || '',
        ]);

        const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        return res.send(csv);
    } catch (error) {
        console.error('❌ exportAuditLogs:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────
//
// ⚠️  ORDER MATTERS in Express.
//     Named sub-paths (/stats, /bulk, /user/:id, /export/csv)
//     MUST come before the wildcard /:id route.
//

// Diagnostic — no auth required (remove in production)
router.get('/test', (req, res) => {
    res.json({
        message: 'Audit routes OK',
        timestamp: new Date(),
        endpoints: [
            'GET    /test',
            'POST   /           create log',
            'GET    /           list logs (Admin)',
            'GET    /stats      aggregated stats (Admin)',
            'GET    /user/:uid  user activity (Admin)',
            'GET    /export/csv CSV export (Admin)',
            'DELETE /bulk       bulk delete (Admin)',
            'DELETE /           delete ALL (Admin)',
            'GET    /:id        single log (Admin)',
            'DELETE /:id        single delete (Admin)',
        ],
    });
});

// Any authenticated user can CREATE logs
router.post('/', protect, createAuditLog);

// ── Admin-only ─────────────────────────────────────────────────

// Stats — MUST be before /:id
router.get('/stats', protect, authorize('Admin'), getAuditStats);

// User activity — MUST be before /:id
router.get('/user/:userId', protect, authorize('Admin'), getUserActivity);

// CSV export — MUST be before /:id
router.get('/export/csv', protect, authorize('Admin'), exportAuditLogs);

// List (paginated + filtered)
router.get('/', protect, authorize('Admin'), getAuditLogs);

// Single log by ID — comes LAST among GETs
router.get('/:id', protect, authorize('Admin'), getAuditLogById);

// Bulk delete — MUST be before DELETE /:id
router.delete('/bulk', protect, authorize('Admin'), bulkDeleteAuditLogs);

// Delete all
router.delete('/', protect, authorize('Admin'), deleteAllAuditLogs);

// Single delete by ID — comes LAST among DELETEs
router.delete('/:id', protect, authorize('Admin'), deleteAuditLog);

module.exports = router;