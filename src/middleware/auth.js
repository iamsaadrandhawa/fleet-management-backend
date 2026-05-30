// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Role } = require('../models/Ledger'); // Import Role model

// Protect routes - authentication middleware
exports.protect = async (req, res, next) => {
    let token;
    
    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from token
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Only populate roleId if the field exists in the user document
        if (user.roleId) {
            try {
                await user.populate('roleId');
                // Set roleName from populated role for consistency
                if (user.roleId && user.roleId.name) {
                    user.roleName = user.roleId.name;
                }
            } catch (populateError) {
                console.log('Could not populate roleId (field might not exist yet)');
            }
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Authorize roles - role-based authorization (based on role name)
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Get user role from multiple possible sources
        let userRole = req.user.roleName || req.user.role;
        
        // If roleId is populated, get role name from there
        if (!userRole && req.user.roleId) {
            userRole = req.user.roleId.name || req.user.roleId.roleName;
        }
        
        // If still no role, try to get from roleId string (not populated)
        if (!userRole && req.user.roleId && typeof req.user.roleId === 'object') {
            userRole = req.user.roleId.name;
        }
        
        // Debug logging - remove in production
        console.log('=== AUTHORIZE DEBUG ===');
        console.log('User role found:', userRole);
        console.log('Allowed roles:', roles);
        console.log('User object keys:', Object.keys(req.user));
        console.log('=======================');
        
        if (!userRole) {
            return res.status(403).json({
                success: false,
                message: 'User role not found. Please check your user configuration.'
            });
        }
        
        // Convert both to strings and lowercase for case-insensitive comparison
        const userRoleStr = String(userRole).toLowerCase().trim();
        const allowedRolesStr = roles.map(role => String(role).toLowerCase().trim());
        
        const isAuthorized = allowedRolesStr.includes(userRoleStr);
        
        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: `User role "${userRole}" is not authorized to access this route. Allowed roles: ${roles.join(', ')}`
            });
        }
        
        next();
    };
};

// Check CRUD permissions based on role's permission object
exports.checkPermission = (action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            let hasPermission = false;
            
            // Try to get permissions from roleId if available
            if (req.user.roleId) {
                const role = req.user.roleId; // Already populated
                hasPermission = role.permissions && role.permissions[action] === true;
            } 
            // Fallback: if roleId not available but role name is, find role by name
            else if (req.user.roleName || req.user.role) {
                const roleName = req.user.roleName || req.user.role;
                const role = await Role.findOne({ name: roleName });
                if (role) {
                    hasPermission = role.permissions && role.permissions[action] === true;
                    // Cache the roleId for future requests
                    if (role && !req.user.roleId) {
                        req.user.roleId = role._id;
                        await req.user.save();
                    }
                }
            }
            
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `You don't have permission to ${action} resources`
                });
            }
            
            // Attach role permissions to req for later use
            req.userPermissions = req.user.roleId?.permissions || {};
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

// Check specific module permissions (if you need module-level permissions)
exports.checkModulePermission = (module, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            let userRole;
            if (req.user.roleId) {
                userRole = req.user.roleId;
            } else if (req.user.roleName || req.user.role) {
                const roleName = req.user.roleName || req.user.role;
                userRole = await Role.findOne({ name: roleName });
            }
            
            if (!userRole) {
                return res.status(403).json({
                    success: false,
                    message: 'User role not found'
                });
            }
            
            // For module-based permissions (if you extend the schema)
            const hasPermission = userRole.permissions?.[module]?.[action] || false;
            
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `You don't have permission to ${action} ${module}`
                });
            }
            
            next();
        } catch (error) {
            console.error('Module permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking module permissions'
            });
        }
    };
};