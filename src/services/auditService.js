const AuditLog = require('../models/AuditLog');

class AuditService {
    
    // Main method to log any action
    static async log(data) {
        try {
            const logData = {
                user: data.userId,
                userEmail: data.userEmail,
                userRole: data.userRole,
                action: data.action,
                module: data.module,
                targetId: data.targetId,
                targetModel: data.targetModel,
                targetName: data.targetName,
                changes: data.changes || {},
                requestInfo: {
                    method: data.method,
                    url: data.url,
                    ip: data.ip,
                    userAgent: data.userAgent
                },
                status: data.status || 'SUCCESS',
                description: data.description,
                errorMessage: data.errorMessage,
                metadata: data.metadata
            };

            const log = await AuditLog.create(logData);
            console.log(`📝 Audit Log Created: ${data.action} on ${data.module}`);
            return log;
        } catch (error) {
            console.error('Audit Log Error:', error);
            // Don't throw - we don't want audit log failures to break main operations
        }
    }

    // Convenience methods for common actions
    static async logCreate(req, module, targetId, targetName, metadata = {}) {
        return this.log({
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'CREATE',
            module: module,
            targetId: targetId,
            targetModel: this.getModelName(module),
            targetName: targetName,
            description: `Created new ${module.toLowerCase()}: ${targetName}`,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            metadata: metadata
        });
    }

    static async logUpdate(req, module, targetId, targetName, before, after, fields = []) {
        return this.log({
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'UPDATE',
            module: module,
            targetId: targetId,
            targetModel: this.getModelName(module),
            targetName: targetName,
            changes: { before, after, fields },
            description: `Updated ${module.toLowerCase()}: ${targetName}`,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    }

    static async logDelete(req, module, targetId, targetName, metadata = {}) {
        return this.log({
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'DELETE',
            module: module,
            targetId: targetId,
            targetModel: this.getModelName(module),
            targetName: targetName,
            description: `Deleted ${module.toLowerCase()}: ${targetName}`,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            metadata: metadata
        });
    }

    static async logLogin(req, user, status = 'SUCCESS', errorMessage = null) {
        return this.log({
            userId: user._id || user.id,
            userEmail: user.email,
            userRole: user.role || 'N/A',
            action: 'LOGIN',
            module: 'AUTH',
            description: status === 'SUCCESS' ? 'User logged in' : 'Failed login attempt',
            status: status,
            errorMessage: errorMessage,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    }

    static async logAssign(req, module, targetId, targetName, assignedTo, assignedToName) {
        return this.log({
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ASSIGN',
            module: module,
            targetId: targetId,
            targetModel: this.getModelName(module),
            targetName: targetName,
            description: `Assigned ${module.toLowerCase()} ${targetName} to ${assignedToName}`,
            metadata: { assignedTo, assignedToName },
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    }

    static getModelName(module) {
        const map = {
            'USER': 'User',
            'DRIVER': 'Driver',
            'VEHICLE': 'Vehicle',
            'ROLE': 'Role',
            'LEDGER': 'Ledger'
        };
        return map[module] || module;
    }
}

module.exports = AuditService;