const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Who performed the action
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    },
    
    // What action was performed
    action: {
        type: String,
        required: true,
        enum: [
            'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
            'ASSIGN', 'UNASSIGN', 'UPLOAD', 'DOWNLOAD', 'EXPORT',
            'STATUS_CHANGE', 'PASSWORD_CHANGE', 'PROFILE_UPDATE'
        ]
    },
    
    // On which entity/module
    module: {
        type: String,
        required: true,
        enum: ['USER', 'DRIVER', 'VEHICLE', 'MAINTENANCE', 'ROLE', 'AUTH', 'SYSTEM']
    },
    
    // Target details
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel'
    },
    targetModel: {
        type: String,
        enum: ['User', 'Driver', 'Vehicle', 'Maintenance']
    },
    targetName: String,
    
    // Before and after state (for UPDATE actions)
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
        fields: [String]
    },
    
    // Request details
    requestInfo: {
        method: String,
        url: String,
        ip: String,
        userAgent: String
    },
    
    // Status and details
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILED', 'PENDING'],
        default: 'SUCCESS'
    },
    description: String,
    errorMessage: String,
    
    // Time
    timestamp: {
        type: Date,
        default: Date.now
    },
    
    // Additional metadata
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

// Indexes for faster queries
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, action: 1 });
auditLogSchema.index({ targetId: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ userEmail: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);