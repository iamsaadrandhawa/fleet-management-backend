const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({

    // ── Who ──────────────────────────────────────────────────
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,   // false: LOGIN logs are created BEFORE a user is authenticated
        default: null
    },
    userEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    userRole: {
        type: String,
        required: true,
        default: 'USER'
    },

    // ── What ─────────────────────────────────────────────────
    action: {
        type: String,
        required: true,
        enum: [
            'CREATE',
            'READ',
            'UPDATE',
            'DELETE',
            'LOGIN',
            'LOGOUT',
            'ASSIGN',
            'UNASSIGN',
            'UPLOAD',
            'DOWNLOAD',
            'EXPORT',
            'STATUS_CHANGE',
            'PASSWORD_CHANGE',
            'PROFILE_UPDATE'
        ]
    },

    // ── Where (module) ───────────────────────────────────────
    module: {
        type: String,
        required: true,
        enum: [
            'USER',
            'DRIVER',
            'VEHICLE',
            'MAINTENANCE',
            'ROLE',
            'AUTH',
            'SYSTEM',
            'LEDGER'        // ← added: covers ledger routes
        ]
    },

    // ── Target ───────────────────────────────────────────────
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel',
        default: null
    },
    targetModel: {
        type: String,
      enum: ['User', 'Driver', 'Vehicle', 'Maintenance', 'Role', 'Designation', 'Location', 'Make', 'FuelType', 'Transmission', null],
        default: null
    },
    targetName: {
        type: String,
        default: null
    },

    // ── Change diff (for UPDATE actions) ─────────────────────
    changes: {
        before: { type: mongoose.Schema.Types.Mixed, default: null },
        after:  { type: mongoose.Schema.Types.Mixed, default: null },
        fields: { type: [String], default: [] }
    },

    // ── Request context ───────────────────────────────────────
    requestInfo: {
        method:    { type: String, default: null },
        url:       { type: String, default: null },
        ip:        { type: String, default: null },
        userAgent: { type: String, default: null }
    },

    // ── Outcome ───────────────────────────────────────────────
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILED', 'PENDING'],
        default: 'SUCCESS'
    },
    description:  { type: String, default: null },
    errorMessage: { type: String, default: null },

    // ── Time ─────────────────────────────────────────────────
    timestamp: {
        type: Date,
        default: Date.now
    },

    // ── Extra payload ─────────────────────────────────────────
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }

}, {
    timestamps: true   // adds createdAt + updatedAt
});

// ── Indexes ───────────────────────────────────────────────────
// Compound query indexes (most useful first)
auditLogSchema.index({ user: 1,       timestamp: -1 });
auditLogSchema.index({ userEmail: 1,  timestamp: -1 });
auditLogSchema.index({ module: 1,     action: 1,     timestamp: -1 });
auditLogSchema.index({ module: 1,     action: 1 });
auditLogSchema.index({ status: 1,     timestamp: -1 });

// Single-field lookup indexes
auditLogSchema.index({ targetId: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ userEmail: 1 });

// TTL — auto-delete logs older than 90 days (7,776,000 seconds)
// NOTE: MongoDB checks this every ~60 seconds, not instantly.
// To change retention, update expireAfterSeconds and run:
//   db.auditlogs.dropIndex('timestamp_1_ttl')
//   then restart the app so Mongoose re-creates it.
auditLogSchema.index(
    { timestamp: 1 },
    { expireAfterSeconds: 7776000, name: 'timestamp_1_ttl' }
);

// ── Static helpers ────────────────────────────────────────────

/**
 * Manual cleanup — useful for admin "purge old logs" actions.
 * The TTL index handles automatic cleanup, but this lets you
 * trigger it on-demand or with a custom retention window.
 *
 * @param {number} daysToKeep  Default 90
 */
auditLogSchema.statics.cleanupOldLogs = async function (daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const result = await this.deleteMany({ timestamp: { $lt: cutoffDate } });
    console.log(`[AuditLog] Cleaned up ${result.deletedCount} logs older than ${daysToKeep} days`);
    return result;
};

/**
 * Quick stats for dashboard — returns totals, success rate, top actions.
 */
auditLogSchema.statics.quickStats = async function () {
    const [row] = await this.aggregate([
        {
            $group: {
                _id: null,
                total:        { $sum: 1 },
                failed:       { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
                uniqueUsers:  { $addToSet: '$userEmail' },
            }
        },
        {
            $project: {
                total: 1,
                failed: 1,
                uniqueUsers: { $size: '$uniqueUsers' },
                successRate: {
                    $cond: [
                        { $eq: ['$total', 0] },
                        100,
                        {
                            $round: [
                                { $multiply: [{ $divide: [{ $subtract: ['$total', '$failed'] }, '$total'] }, 100] },
                                1
                            ]
                        }
                    ]
                }
            }
        }
    ]);
    return row || { total: 0, failed: 0, uniqueUsers: 0, successRate: 100 };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);