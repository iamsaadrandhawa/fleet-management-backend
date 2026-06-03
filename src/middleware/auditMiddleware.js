// middleware/auditMiddleware.js
const auditMiddleware = async (req, res, next) => {
    const startTime = Date.now();
    
    // For update operations, capture the original data
    let originalData = null;
    if (req.method === 'PUT' || req.method === 'PATCH') {
        const Role = require('../models/Ledger').Role;
        if (req.params.id) {
            try {
                originalData = await Role.findById(req.params.id);
            } catch (err) {
                console.error('Error fetching original data:', err);
            }
        }
    }

    res.on('finish', async () => {
        try {
            const duration = Date.now() - startTime;
            const segment = getRouteSegment(req);

            // Skip audit-logs route
            if (segment === 'audit-logs' || segment === 'logs') return;
            
            // Skip successful GETs
            if (req.method === 'GET' && res.statusCode < 400) return;
            
            // Only log mutating methods OR error responses
            const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
            const isError = res.statusCode >= 400;
            if (!isMutating && !isError) return;

            const action = METHOD_TO_ACTION[req.method] || 'READ';
            const module = ROUTE_TO_MODULE[segment] || 'SYSTEM';

            // Get response body if available
            let responseBody = res.responseData;
            let changes = {};
            
            // Calculate changes for update operations
            if (req.method === 'PUT' && originalData && responseBody?.data) {
                const afterData = responseBody.data;
                
                // Compare and track changes
                if (originalData.name !== afterData.name) {
                    changes.name = { from: originalData.name, to: afterData.name };
                }
                if (originalData.code !== afterData.code) {
                    changes.code = { from: originalData.code, to: afterData.code };
                }
                if (originalData.description !== afterData.description) {
                    changes.description = { from: originalData.description, to: afterData.description };
                }
                
                // Check permission changes
                const permFields = ['create', 'read', 'update', 'delete'];
                permFields.forEach(field => {
                    if (originalData.permissions?.[field] !== afterData.permissions?.[field]) {
                        changes[`permissions.${field}`] = { 
                            from: originalData.permissions?.[field], 
                            to: afterData.permissions?.[field] 
                        };
                    }
                });
                
                // Check tab permission changes
                const tabFields = ['dashboard', 'add-driver', 'add-vehicle', 'driver-list', 'vehicle-list', 'users', 'ledgers', 'settings'];
                tabFields.forEach(field => {
                    if (originalData.tabPermissions?.[field] !== afterData.tabPermissions?.[field]) {
                        changes[`tabPermissions.${field}`] = { 
                            from: originalData.tabPermissions?.[field], 
                            to: afterData.tabPermissions?.[field] 
                        };
                    }
                });
            }
            
            // For create operations, capture the created data
            if (req.method === 'POST' && responseBody?.data) {
                changes = {
                    created: {
                        name: responseBody.data.name,
                        code: responseBody.data.code,
                        permissions: responseBody.data.permissions,
                        tabPermissions: responseBody.data.tabPermissions
                    }
                };
            }
            
            // For delete operations, capture the deleted data
            if (req.method === 'DELETE' && originalData) {
                changes = {
                    deleted: {
                        name: originalData.name,
                        code: originalData.code,
                        permissions: originalData.permissions,
                        tabPermissions: originalData.tabPermissions
                    }
                };
            }

            const userId = req.user?.id || req.user?._id || null;
            const userEmail = req.user?.email || 'anonymous@system';
            const userRole = req.user?.role || req.user?.roleName || 'SYSTEM';

            await AuditService.log({
                userId,
                userEmail,
                userRole,
                action,
                module,
                status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
                description: changes ? `${action} ${module}` : `${req.method} ${req.originalUrl} → ${res.statusCode}`,
                errorMessage: isError ? `HTTP ${res.statusCode} on ${req.method} ${req.originalUrl}` : null,
                targetId: req.params.id || responseBody?.data?._id,
                targetModel: module === 'ROLE' ? 'Role' : null,
                targetName: responseBody?.data?.name || originalData?.name,
                changes: changes,
                metadata: {
                    statusCode: res.statusCode,
                    duration,
                    method: req.method,
                    url: req.originalUrl,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
        } catch (err) {
            console.error('[AuditMiddleware] Failed to log request:', err.message);
        }
    });

    next();
};