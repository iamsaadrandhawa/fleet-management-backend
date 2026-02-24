const AuditLog = require('../models/AuditLog');

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
            status 
        } = req.query;

        const query = {};

        if (user) query.user = user;
        if (module) query.module = module;
        if (action) query.action = action;
        if (status) query.status = status;
        
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

// @desc    Get audit logs summary/stats
// @route   GET /api/audit-logs/stats/summary
// @access  Private (Admin only)
const getAuditStats = async (req, res) => {
    try {
        const stats = await AuditLog.aggregate([
            {
                $group: {
                    _id: null,
                    totalLogs: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' },
                    actions: { $push: '$action' },
                    modules: { $push: '$module' }
                }
            },
            {
                $project: {
                    totalLogs: 1,
                    uniqueUsersCount: { $size: '$uniqueUsers' },
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
        ]);

        // Get recent activity
        const recentActivity = await AuditLog.find()
            .populate('user', 'name email')
            .sort({ timestamp: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            data: {
                summary: stats[0] || { totalLogs: 0 },
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

module.exports = {
    getAuditLogs,
    getAuditLogById,
    getAuditStats,
    getUserActivity
};