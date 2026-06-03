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
        
        // Get user from token and populate role
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Populate roleId if it exists
        if (user.roleId) {
            try {
                await user.populate('roleId');
                // Set roleName and permissions from populated role
                if (user.roleId) {
                    user.roleName = user.roleId.name;
                    user.rolePermissions = user.roleId.permissions;
                    user.tabPermissions = user.roleId.tabPermissions;
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

// Check tab access permission
exports.checkTabAccess = (tabId) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            let hasAccess = false;
            
            // Try to get tab permissions from roleId if available
            if (req.user.roleId) {
                const role = req.user.roleId; // Already populated
                hasAccess = role.tabPermissions && role.tabPermissions[tabId] === true;
            } 
            // Fallback: if roleId not available but role name is, find role by name
            else if (req.user.roleName || req.user.role) {
                const roleName = req.user.roleName || req.user.role;
                const role = await Role.findOne({ name: roleName });
                if (role) {
                    hasAccess = role.tabPermissions && role.tabPermissions[tabId] === true;
                    // Cache the roleId for future requests
                    if (role && !req.user.roleId) {
                        req.user.roleId = role._id;
                        await req.user.save();
                    }
                }
            }
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: `You don't have access to the "${tabId}" section`
                });
            }
            
            // Attach tab permissions to req for later use
            req.userTabPermissions = req.user.roleId?.tabPermissions || {};
            next();
        } catch (error) {
            console.error('Tab access check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking tab access'
            });
        }
    };
};

// Combined permission check (both CRUD and tab access)
exports.checkFullPermission = (tabId, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            let hasTabAccess = false;
            let hasCrudPermission = false;
            let role = null;
            
            // Get role with permissions
            if (req.user.roleId) {
                role = req.user.roleId;
            } else if (req.user.roleName || req.user.role) {
                const roleName = req.user.roleName || req.user.role;
                role = await Role.findOne({ name: roleName });
                if (role && !req.user.roleId) {
                    req.user.roleId = role._id;
                    await req.user.save();
                }
            }
            
            if (!role) {
                return res.status(403).json({
                    success: false,
                    message: 'User role not found'
                });
            }
            
            // Check tab access
            hasTabAccess = role.tabPermissions && role.tabPermissions[tabId] === true;
            
            // Check CRUD permission
            hasCrudPermission = role.permissions && role.permissions[action] === true;
            
            if (!hasTabAccess) {
                return res.status(403).json({
                    success: false,
                    message: `You don't have access to the "${tabId}" section`
                });
            }
            
            if (!hasCrudPermission) {
                return res.status(403).json({
                    success: false,
                    message: `You don't have permission to ${action} resources in this section`
                });
            }
            
            // Attach permissions to req for later use
            req.userPermissions = role.permissions || {};
            req.userTabPermissions = role.tabPermissions || {};
            next();
        } catch (error) {
            console.error('Full permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

// Get user's accessible tabs (useful for frontend)
exports.getUserAccessibleTabs = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        let role = null;
        
        if (req.user.roleId) {
            role = req.user.roleId;
        } else if (req.user.roleName || req.user.role) {
            const roleName = req.user.roleName || req.user.role;
            role = await Role.findOne({ name: roleName });
        }
        
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }
        
        // Get accessible tabs
        const accessibleTabs = [];
        if (role.tabPermissions) {
            Object.keys(role.tabPermissions).forEach(tabId => {
                if (role.tabPermissions[tabId] === true) {
                    accessibleTabs.push(tabId);
                }
            });
        }
        
        res.json({
            success: true,
            data: {
                roleId: role._id,
                roleName: role.name,
                accessibleTabs,
                tabPermissions: role.tabPermissions,
                crudPermissions: role.permissions
            }
        });
    } catch (error) {
        console.error('Get accessible tabs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching accessible tabs'
        });
    }
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