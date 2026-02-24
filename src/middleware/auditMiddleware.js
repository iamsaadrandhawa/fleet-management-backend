const AuditService = require('../services/auditService');

// Middleware to automatically log all requests
const auditMiddleware = async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    const startTime = Date.now();

    // Override send function to capture response
    res.send = function(body) {
        res.responseBody = body;
        res.send = originalSend;
        return originalSend.call(this, body);
    };

    // Log after response is sent
    res.on('finish', async () => {
        const duration = Date.now() - startTime;
        
        // Skip logging for GET requests to reduce noise (optional)
        if (req.method === 'GET' && res.statusCode < 400) {
            return;
        }

        // Only log failed requests or important actions
        if (res.statusCode >= 400 || ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            try {
                await AuditService.log({
                    userId: req.user?.id || 'SYSTEM',
                    userEmail: req.user?.email || 'system@internal',
                    userRole: req.user?.role || 'SYSTEM',
                    action: req.method,
                    module: req.baseUrl.split('/').pop()?.toUpperCase() || 'API',
                    description: `${req.method} ${req.originalUrl} - ${res.statusCode}`,
                    status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
                    requestInfo: {
                        method: req.method,
                        url: req.originalUrl,
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                        duration: duration
                    },
                    metadata: {
                        statusCode: res.statusCode,
                        query: req.query,
                        params: req.params
                    }
                });
            } catch (error) {
                console.error('Audit middleware error:', error);
            }
        }
    });

    next();
};

module.exports = auditMiddleware;