/**
 * ============================================================
 * AUDIT MIDDLEWARE — middleware/auditMiddleware.js
 * ============================================================
 *
 * Automatically logs every mutating request (POST/PUT/PATCH/DELETE)
 * and any request that returns a 4xx/5xx error.
 *
 * FIXES vs original:
 *  1. action: was sending HTTP method ('POST') — invalid enum.
 *     Now maps  POST→CREATE  PUT/PATCH→UPDATE  DELETE→DELETE.
 *  2. module: was producing 'DRIVERS','VEHICLES' — not in enum.
 *     Now maps plural route segments to singular enum values.
 *  3. Infinite loop: excluded /api/audit-logs from logging itself.
 *  4. res.send override removed — it was capturing body but never
 *     using it, and it breaks res.json(), streaming, and sendFile().
 *  5. userId: was sending the string 'SYSTEM' into an ObjectId field
 *     when no user exists — now sends null instead.
 *  6. Added duration to metadata (kept from original, it's useful).
 * ============================================================
 */

const AuditService = require('../services/auditService');

// ── Maps ──────────────────────────────────────────────────────

/**
 * HTTP method  →  AuditLog action enum
 */
const METHOD_TO_ACTION = {
    POST:   'CREATE',
    PUT:    'UPDATE',
    PATCH:  'UPDATE',
    DELETE: 'DELETE',
    GET:    'READ',
};

/**
 * URL route segment  →  AuditLog module enum
 * Keys are the segment that appears after /api/ in the URL.
 * Add new routes here as your API grows.
 */
const ROUTE_TO_MODULE = {
    'auth':         'AUTH',
    'users':        'USER',
    'user':         'USER',
    'drivers':      'DRIVER',
    'driver':       'DRIVER',
    'vehicles':     'VEHICLE',
    'vehicle':      'VEHICLE',
    'maintenance':  'MAINTENANCE',
    'maintenances': 'MAINTENANCE',
    'roles':        'ROLE',
    'role':         'ROLE',
    'ledgers':      'LEDGER',
    'ledger':       'LEDGER',
    'audit-logs':   'SYSTEM',
    'logs':         'SYSTEM',
};

/**
 * Extracts the first path segment after /api/ from the request URL.
 * e.g. /api/drivers/123/status  →  'drivers'
 */
function getRouteSegment(req) {
    // req.baseUrl is set when middleware is mounted at a sub-path.
    // req.originalUrl is the full path including query string.
    const url = req.baseUrl || req.originalUrl || '';
    // Strip /api/ prefix and take the first segment
    const withoutApi = url.replace(/^\/api\//, '');
    return withoutApi.split('/')[0].split('?')[0].toLowerCase();
}

// ── Middleware ────────────────────────────────────────────────

const auditMiddleware = async (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', async () => {
        try {
            const duration = Date.now() - startTime;
            const segment  = getRouteSegment(req);

            // ── Exclusions ─────────────────────────────────────────
            // 1. Skip audit-logs route to prevent an infinite logging loop.
            if (segment === 'audit-logs' || segment === 'logs') return;

            // 2. Skip successful GETs — high volume, low value.
            if (req.method === 'GET' && res.statusCode < 400) return;

            // 3. Only log mutating methods OR error responses.
            const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
            const isError     = res.statusCode >= 400;
            if (!isMutating && !isError) return;

            // ── Map to valid enum values ────────────────────────────
            const action = METHOD_TO_ACTION[req.method] || 'READ';
            const module = ROUTE_TO_MODULE[segment]     || 'SYSTEM';

            // ── User context ────────────────────────────────────────
            // req.user is populated by the protect middleware.
            // If there's no user (e.g. a failed login attempt), use null
            // for userId so we don't pass a string into an ObjectId field.
            const userId    = req.user?.id    || req.user?._id || null;
            const userEmail = req.user?.email || 'anonymous@system';
            const userRole  = req.user?.role  || req.user?.roleName || 'SYSTEM';

            await AuditService.log({
                userId,
                userEmail,
                userRole,
                action,
                module,
                status:      res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
                description: `${req.method} ${req.originalUrl} → ${res.statusCode}`,
                errorMessage: isError
                    ? `HTTP ${res.statusCode} on ${req.method} ${req.originalUrl}`
                    : null,
                method:    req.method,
                url:       req.originalUrl,
                ip:        req.ip || req.headers['x-forwarded-for'] || null,
                userAgent: req.get('User-Agent') || null,
                metadata: {
                    statusCode: res.statusCode,
                    duration,           // ms
                    query:  req.query,
                    params: req.params,
                }
            });
        } catch (err) {
            // Audit errors must never crash the main request.
            console.error('[AuditMiddleware] Failed to log request:', err.message);
        }
    });

    next();
};

module.exports = auditMiddleware;