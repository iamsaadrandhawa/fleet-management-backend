const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

// @desc    Create audit log
// @route   POST /api/audit-logs
// @access  Private
const createAuditLog = async (req, res) => {
    try {
        const logData = {
            user: req.body.userId || req.body.user || req.user?.id,
            userEmail: req.body.userEmail || req.user?.email,
            userRole: req.body.userRole || req.user?.role,
            action: req.body.action,
            module: req.body.module,
            targetId: req.body.targetId,
            targetModel: req.body.targetModel,
            targetName: req.body.targetName,
            changes: req.body.changes || {},
            requestInfo: {
                method: req.body.requestInfo?.method || req.method,
                url: req.body.requestInfo?.url || req.originalUrl,
                ip: req.ip || req.body.requestInfo?.ip,
                userAgent: req.body.requestInfo?.userAgent || req.get('User-Agent')
            },
            status: req.body.status || 'SUCCESS',
            description: req.body.description,
            errorMessage: req.body.errorMessage,
            metadata: req.body.metadata
        };

        const log = await AuditLog.create(logData);
        
        res.status(201).json({
            success: true,
            data: log
        });
    } catch (error) {
        console.error('Create audit log error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private (Admin only)
const getAuditLogs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            user, 
            module, 
            action, 
            startDate, 
            endDate,
            status,
            search
        } = req.query;

        const query = {};

        if (user) query.user = user;
        if (module) query.module = module;
        if (action) query.action = action;
        if (status) query.status = status;
        
        if (search) {
            query.$or = [
                { userEmail: { $regex: search, $options: 'i' } },
                { targetName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query)
            .populate('user', 'name email role')
            .populate('targetId')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ timestamp: -1 });

        const total = await AuditLog.countDocuments(query);

        res.status(200).json({
            success: true,
            count: logs.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: logs
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get audit log by ID
// @route   GET /api/audit-logs/:id
// @access  Private (Admin only)
const getAuditLogById = async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate('user', 'name email role')
            .populate('targetId');

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }

        res.status(200).json({
            success: true,
            data: log
        });

    } catch (error) {
        console.error('Get audit log error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete audit log (Admin only)
// @route   DELETE /api/audit-logs/:id
// @access  Private (Admin only)
const deleteAuditLog = async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }

        await log.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Audit log deleted successfully'
        });

    } catch (error) {
        console.error('Delete audit log error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Bulk delete audit logs (Admin only)
// @route   DELETE /api/audit-logs/bulk
// @access  Private (Admin only)
const bulkDeleteAuditLogs = async (req, res) => {
    try {
        const { logIds, deleteAll, olderThan, action, module } = req.body;

        let query = {};

        if (deleteAll) {
            query = {};
        } else if (logIds && logIds.length > 0) {
            query = { _id: { $in: logIds } };
        } else if (olderThan) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThan);
            query = { timestamp: { $lt: cutoffDate } };
        } else if (action) {
            query = { action };
        } else if (module) {
            query = { module };
        }

        if (Object.keys(query).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please specify deletion criteria'
            });
        }

        const result = await AuditLog.deleteMany(query);

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} audit logs deleted successfully`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('Bulk delete audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get audit logs summary/stats
// @route   GET /api/audit-logs/stats/summary
// @access  Private (Admin only)
const getAuditStats = async (req, res) => {
    try {
        const [stats, dailyActivity] = await Promise.all([
            AuditLog.aggregate([
                {
                    $group: {
                        _id: null,
                        totalLogs: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$user' },
                        actions: { $push: '$action' },
                        modules: { $push: '$module' },
                        failedActions: {
                            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        totalLogs: 1,
                        uniqueUsersCount: { $size: '$uniqueUsers' },
                        failedActions: 1,
                        successRate: {
                            $multiply: [
                                {
                                    $divide: [
                                        { $subtract: ['$totalLogs', '$failedActions'] },
                                        '$totalLogs'
                                    ]
                                },
                                100
                            ]
                        },
                        actionStats: {
                            CREATE: { $size: { $filter: { input: '$actions', as: 'a', cond: { $eq: ['$$a', 'CREATE'] } } } },
                            UPDATE: { $size: { $filter: { input: '$actions', as: 'a', cond: { $eq: ['$$a', 'UPDATE'] } } } },
                            DELETE: { $size: { $filter: { input: '$actions', as: 'a', cond: { $eq: ['$$a', 'DELETE'] } } } },
                            LOGIN: { $size: { $filter: { input: '$actions', as: 'a', cond: { $eq: ['$$a', 'LOGIN'] } } } }
                        },
                        moduleStats: {
                            USER: { $size: { $filter: { input: '$modules', as: 'm', cond: { $eq: ['$$m', 'USER'] } } } },
                            DRIVER: { $size: { $filter: { input: '$modules', as: 'm', cond: { $eq: ['$$m', 'DRIVER'] } } } },
                            VEHICLE: { $size: { $filter: { input: '$modules', as: 'm', cond: { $eq: ['$$m', 'VEHICLE'] } } } },
                            MAINTENANCE: { $size: { $filter: { input: '$modules', as: 'm', cond: { $eq: ['$$m', 'MAINTENANCE'] } } } }
                        }
                    }
                }
            ]),
            AuditLog.aggregate([
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: -1 } },
                { $limit: 30 }
            ])
        ]);

        const recentActivity = await AuditLog.find()
            .populate('user', 'name email')
            .sort({ timestamp: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            data: {
                summary: stats[0] || { totalLogs: 0, successRate: 100, failedActions: 0 },
                dailyActivity,
                recentActivity
            }
        });

    } catch (error) {
        console.error('Audit stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get user activity
// @route   GET /api/audit-logs/user/:userId
// @access  Private (Admin only)
const getUserActivity = async (req, res) => {
    try {
        const logs = await AuditLog.find({ user: req.params.userId })
            .populate('targetId')
            .sort({ timestamp: -1 })
            .limit(100);

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });

    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Export audit logs
// @route   GET /api/audit-logs/export/csv
// @access  Private (Admin only)
const exportAuditLogs = async (req, res) => {
    try {
        const { startDate, endDate, format = 'csv' } = req.query;
        
        let query = {};
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query)
            .populate('user', 'name email')
            .sort({ timestamp: -1 });

        if (format === 'csv') {
            const csvHeaders = ['Timestamp', 'User Email', 'Action', 'Module', 'Target', 'Status', 'Description', 'IP Address'];
            const csvRows = logs.map(log => [
                log.timestamp.toISOString(),
                log.userEmail,
                log.action,
                log.module,
                log.targetName || 'N/A',
                log.status,
                log.description || 'N/A',
                log.requestInfo?.ip || 'N/A'
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
            return res.send(csvContent);
        }

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });

    } catch (error) {
        console.error('Export audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    createAuditLog,
    getAuditLogs,
    getAuditLogById,
    deleteAuditLog,
    bulkDeleteAuditLogs,
    getAuditStats,
    getUserActivity,
    exportAuditLogs
};