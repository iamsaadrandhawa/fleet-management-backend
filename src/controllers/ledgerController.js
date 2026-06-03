// controllers/ledgerController.js
const {
  Role,
  Designation,
  Location,
  Make,
  VehicleCategory,
  FuelType,
  Transmission
} = require('../models/Ledger');
const AuditService = require('../services/auditService');

// Permission checking function for CRUD operations
const checkRolePermission = async (req, action) => {
  try {
    const userRoleId = req.user?.roleId;
    
    if (!userRoleId) {
      return { allowed: false, message: 'User role not found' };
    }
    
    const role = await Role.findById(userRoleId);
    if (!role) {
      return { allowed: false, message: 'Role not found' };
    }
    
    const hasPermission = role.permissions && role.permissions[action] === true;
    
    if (!hasPermission) {
      return { allowed: false, message: `You don't have permission to ${action} resources` };
    }
    
    return { allowed: true, role };
  } catch (error) {
    return { allowed: false, message: error.message };
  }
};

// Check tab access permission
const checkTabAccess = async (req, tabId) => {
  try {
    const userRoleId = req.user?.roleId;
    
    if (!userRoleId) {
      return { allowed: false, message: 'User role not found' };
    }
    
    const role = await Role.findById(userRoleId);
    if (!role) {
      return { allowed: false, message: 'Role not found' };
    }
    
    const hasAccess = role.tabPermissions && role.tabPermissions[tabId] === true;
    
    if (!hasAccess) {
      return { allowed: false, message: `You don't have access to this section` };
    }
    
    return { allowed: true, role };
  } catch (error) {
    return { allowed: false, message: error.message };
  }
};

// Generic CRUD generator with role-based permissions
const createCRUD = (Model, modelName, skipPermissionCheck = false) => ({
  // Get all
  getAll: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'read');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const items = await Model.find({ status: 'active' }).sort({ name: 1 });
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get all including inactive (for admin)
  getAllWithInactive: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'read');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const items = await Model.find({}).sort({ name: 1 });
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get by ID
  getById: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'read');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const item = await Model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create
  create: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'create');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const item = new Model(req.body);
      await item.save();
      
      // Audit log for other ledger types (non-role)
      if (modelName !== 'Role') {
        await AuditService.logCreate(
          req,
          modelName.toUpperCase(),
          item._id,
          item.name,
          { code: item.code, description: item.description }
        );
      }
      
      res.status(201).json({ success: true, data: item, message: `${modelName} created successfully` });
    } catch (error) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, message: `${modelName} already exists` });
      } else {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  },

  // Update
  update: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'update');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const originalItem = await Model.findById(req.params.id);
      if (!originalItem) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }
      
      const beforeData = {
        name: originalItem.name,
        code: originalItem.code,
        description: originalItem.description,
        status: originalItem.status
      };
      
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );
      
      const afterData = {
        name: item.name,
        code: item.code,
        description: item.description,
        status: item.status
      };
      
      // Calculate changed fields
      const changedFields = [];
      if (beforeData.name !== afterData.name) changedFields.push('name');
      if (beforeData.code !== afterData.code) changedFields.push('code');
      if (beforeData.description !== afterData.description) changedFields.push('description');
      if (beforeData.status !== afterData.status) changedFields.push('status');
      
      // Audit log for other ledger types
      if (modelName !== 'Role' && changedFields.length > 0) {
        await AuditService.logUpdate(
          req,
          modelName.toUpperCase(),
          item._id,
          item.name,
          beforeData,
          afterData,
          changedFields
        );
      }
      
      res.json({ success: true, data: item, message: `${modelName} updated successfully` });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Delete (hard delete - permanent removal)
  delete: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'delete');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const item = await Model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }
      
      const itemData = {
        name: item.name,
        code: item.code,
        description: item.description,
        status: item.status
      };
      
      await Model.findByIdAndDelete(req.params.id);
      
      // Audit log for other ledger types
      if (modelName !== 'Role') {
        await AuditService.logDelete(
          req,
          modelName.toUpperCase(),
          req.params.id,
          item.name,
          { deletedData: itemData }
        );
      }
      
      res.json({ success: true, message: `${modelName} permanently deleted` });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Soft delete (set status to inactive)
  softDelete: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'update');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const originalItem = await Model.findById(req.params.id);
      if (!originalItem) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }
      
      const beforeData = { status: originalItem.status };
      
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { status: 'inactive', updatedAt: Date.now() },
        { new: true }
      );
      
      const afterData = { status: item.status };
      
      // Audit log for other ledger types
      if (modelName !== 'Role') {
        await AuditService.logUpdate(
          req,
          modelName.toUpperCase(),
          item._id,
          item.name,
          beforeData,
          afterData,
          ['status']
        );
      }
      
      res.json({ success: true, message: `${modelName} deactivated successfully`, data: item });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Restore (set status to active)
  restore: async (req, res) => {
    if (!skipPermissionCheck) {
      const permission = await checkRolePermission(req, 'update');
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.message });
      }
    }
    
    try {
      const originalItem = await Model.findById(req.params.id);
      if (!originalItem) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }
      
      const beforeData = { status: originalItem.status };
      
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { status: 'active', updatedAt: Date.now() },
        { new: true }
      );
      
      const afterData = { status: item.status };
      
      // Audit log for other ledger types
      if (modelName !== 'Role') {
        await AuditService.logUpdate(
          req,
          modelName.toUpperCase(),
          item._id,
          item.name,
          beforeData,
          afterData,
          ['status']
        );
      }
      
      res.json({ success: true, message: `${modelName} restored successfully`, data: item });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// Role-specific controllers with tab permissions support and audit logs
const roleController = {
  // Get all roles
  getAll: async (req, res) => {
    try {
      const roles = await Role.find({}).sort({ name: 1 });
      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get active roles only
  getAllActive: async (req, res) => {
    try {
      const roles = await Role.find({ status: 'active' }).sort({ name: 1 });
      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get all including inactive
  getAllWithInactive: async (req, res) => {
    try {
      const roles = await Role.find({}).sort({ name: 1 });
      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get role by ID
  getById: async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }
      res.json({ success: true, data: role });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // CREATE role with audit log
  create: async (req, res) => {
    try {
      const { name, code, description, permissions, tabPermissions } = req.body;
      
      console.log('📝 Creating role:', { name, code });
      
      const role = new Role({
        name,
        code,
        description,
        permissions: permissions || { create: false, read: false, update: false, delete: false },
        tabPermissions: tabPermissions || {
          dashboard: false,
          'add-driver': false,
          'add-vehicle': false,
          'driver-list': false,
          'vehicle-list': false,
          users: false,
          ledgers: false,
          settings: false
        },
        status: 'active'
      });
      
      await role.save();
      
      // Create audit log for role creation
      await AuditService.logCreate(
        req,
        'ROLE',
        role._id,
        role.name,
        {
          code: role.code,
          permissions: role.permissions,
          tabPermissions: role.tabPermissions,
          description: role.description
        }
      );
      
      console.log('✅ Role created with audit log');
      
      res.status(201).json({ 
        success: true, 
        data: role, 
        message: 'Role created successfully' 
      });
    } catch (error) {
      console.error('Error creating role:', error);
      if (error.code === 11000) {
        res.status(409).json({ success: false, message: 'Role already exists' });
      } else {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  },

  // UPDATE role with audit log
  update: async (req, res) => {
    try {
      const { name, code, description, permissions, tabPermissions, status } = req.body;
      
      // Get original role BEFORE update
      const originalRole = await Role.findById(req.params.id);
      if (!originalRole) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }
      
      // Store original data for audit
      const beforeData = {
        name: originalRole.name,
        code: originalRole.code,
        description: originalRole.description,
        permissions: { ...originalRole.permissions },
        tabPermissions: { ...originalRole.tabPermissions },
        status: originalRole.status
      };
      
      // Update fields
      if (name) originalRole.name = name;
      if (code) originalRole.code = code;
      if (description) originalRole.description = description;
      if (status) originalRole.status = status;
      
      if (permissions) {
        originalRole.permissions = {
          ...originalRole.permissions,
          ...permissions
        };
      }
      
      if (tabPermissions) {
        originalRole.tabPermissions = {
          ...originalRole.tabPermissions,
          ...tabPermissions
        };
      }
      
      originalRole.updatedAt = Date.now();
      await originalRole.save();
      
      // Store after data for audit
      const afterData = {
        name: originalRole.name,
        code: originalRole.code,
        description: originalRole.description,
        permissions: originalRole.permissions,
        tabPermissions: originalRole.tabPermissions,
        status: originalRole.status
      };
      
      // Calculate changed fields
      const changedFields = [];
      
      if (beforeData.name !== afterData.name) changedFields.push('name');
      if (beforeData.code !== afterData.code) changedFields.push('code');
      if (beforeData.description !== afterData.description) changedFields.push('description');
      if (beforeData.status !== afterData.status) changedFields.push('status');
      
      // Check permission changes
      const permFields = ['create', 'read', 'update', 'delete'];
      permFields.forEach(field => {
        if (beforeData.permissions[field] !== afterData.permissions[field]) {
          changedFields.push(`permissions.${field}`);
        }
      });
      
      // Check tab permission changes
      const tabFields = ['dashboard', 'add-driver', 'add-vehicle', 'driver-list', 'vehicle-list', 'users', 'ledgers', 'settings'];
      tabFields.forEach(field => {
        if (beforeData.tabPermissions[field] !== afterData.tabPermissions[field]) {
          changedFields.push(`tabPermissions.${field}`);
        }
      });
      
      // Create audit log for update if changes exist
      if (changedFields.length > 0) {
        await AuditService.logUpdate(
          req,
          'ROLE',
          originalRole._id,
          originalRole.name,
          beforeData,
          afterData,
          changedFields
        );
        console.log('✅ Role updated with audit log, changes:', changedFields);
      } else {
        console.log('ℹ️ No changes detected, skipping audit log');
      }
      
      res.json({ 
        success: true, 
        data: originalRole, 
        message: 'Role updated successfully' 
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // DELETE role (hard delete) with audit log
  delete: async (req, res) => {
    try {
      // Get role BEFORE deletion for audit
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }
      
      // Store data for audit
      const roleData = {
        name: role.name,
        code: role.code,
        description: role.description,
        permissions: { ...role.permissions },
        tabPermissions: { ...role.tabPermissions },
        status: role.status
      };
      
      console.log('🗑️ Deleting role:', role.name);
      
      // Delete the role
      await Role.findByIdAndDelete(req.params.id);
      
      // Create audit log for deletion
      await AuditService.logDelete(
        req,
        'ROLE',
        req.params.id,
        role.name,
        {
          deletedData: roleData,
          deletedAt: new Date().toISOString()
        }
      );
      
      console.log('✅ Role deleted with audit log');
      
      res.json({ 
        success: true, 
        message: 'Role deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Soft delete with audit log
  softDelete: async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }
      
      const beforeData = {
        name: role.name,
        code: role.code,
        status: role.status
      };
      
      role.status = 'inactive';
      role.updatedAt = Date.now();
      await role.save();
      
      const afterData = {
        name: role.name,
        code: role.code,
        status: role.status
      };
      
      // Create audit log for soft delete
      await AuditService.logUpdate(
        req,
        'ROLE',
        role._id,
        role.name,
        beforeData,
        afterData,
        ['status']
      );
      
      console.log('✅ Role soft deleted with audit log');
      
      res.json({ 
        success: true, 
        message: 'Role deactivated successfully', 
        data: role 
      });
    } catch (error) {
      console.error('Error soft deleting role:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Restore role with audit log
  restore: async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }
      
      const beforeData = {
        name: role.name,
        code: role.code,
        status: role.status
      };
      
      role.status = 'active';
      role.updatedAt = Date.now();
      await role.save();
      
      const afterData = {
        name: role.name,
        code: role.code,
        status: role.status
      };
      
      // Create audit log for restore
      await AuditService.logUpdate(
        req,
        'ROLE',
        role._id,
        role.name,
        beforeData,
        afterData,
        ['status']
      );
      
      console.log('✅ Role restored with audit log');
      
      res.json({ 
        success: true, 
        message: 'Role restored successfully', 
        data: role 
      });
    } catch (error) {
      console.error('Error restoring role:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get current user's role permissions
  getMyPermissions: async (req, res) => {
    try {
      const userRoleId = req.user?.roleId;
      
      if (!userRoleId) {
        return res.status(404).json({ success: false, message: 'User role not found' });
      }
      
      const role = await Role.findById(userRoleId);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }
      
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
          permissions: role.permissions,
          tabPermissions: role.tabPermissions,
          accessibleTabs: accessibleTabs
        }
      });
    } catch (error) {
      console.error('Error getting permissions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Check role permissions
  checkPermissions: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, tabId } = req.query;
      
      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }
      
      let hasAccess = false;
      let permissionType = null;
      
      if (action) {
        hasAccess = role.permissions && role.permissions[action] === true;
        permissionType = 'crud';
      } else if (tabId) {
        hasAccess = role.tabPermissions && role.tabPermissions[tabId] === true;
        permissionType = 'tab';
      }
      
      res.json({
        success: true,
        hasAccess,
        permissionType,
        role: {
          id: role._id,
          name: role.name
        }
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Get all ledgers grouped together (only active)
const getAllLedgers = async (req, res) => {
  const tabAccess = await checkTabAccess(req, 'ledgers');
  if (!tabAccess.allowed) {
    return res.status(403).json({ success: false, message: tabAccess.message });
  }
  
  const permission = await checkRolePermission(req, 'read');
  if (!permission.allowed) {
    return res.status(403).json({ success: false, message: permission.message });
  }
  
  try {
    const [roles, designations, locations, makes, vehicleCategories, fuelTypes, transmissions] = await Promise.all([
      Role.find({ status: 'active' }).sort({ name: 1 }),
      Designation.find({ status: 'active' }).sort({ name: 1 }),
      Location.find({ status: 'active' }).sort({ name: 1 }),
      Make.find({ status: 'active' }).sort({ name: 1 }),
      VehicleCategory.find({ status: 'active' }).sort({ name: 1 }),
      FuelType.find({ status: 'active' }).sort({ name: 1 }),
      Transmission.find({ status: 'active' }).sort({ name: 1 })
    ]);
    
    res.json({
      success: true,
      data: {
        roles,
        designations,
        locations,
        makes,
        vehicleCategories,
        fuelTypes,
        transmissions
      }
    });
  } catch (error) {
    console.error('Error fetching all ledgers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all ledgers including inactive (for admin)
const getAllLedgersWithInactive = async (req, res) => {
  const tabAccess = await checkTabAccess(req, 'ledgers');
  if (!tabAccess.allowed) {
    return res.status(403).json({ success: false, message: tabAccess.message });
  }
  
  const permission = await checkRolePermission(req, 'read');
  if (!permission.allowed) {
    return res.status(403).json({ success: false, message: permission.message });
  }
  
  try {
    const [roles, designations, locations, makes, vehicleCategories, fuelTypes, transmissions] = await Promise.all([
      Role.find({}).sort({ name: 1 }),
      Designation.find({}).sort({ name: 1 }),
      Location.find({}).sort({ name: 1 }),
      Make.find({}).sort({ name: 1 }),
      VehicleCategory.find({}).sort({ name: 1 }),
      FuelType.find({}).sort({ name: 1 }),
      Transmission.find({}).sort({ name: 1 })
    ]);
    
    res.json({
      success: true,
      data: {
        roles,
        designations,
        locations,
        makes,
        vehicleCategories,
        fuelTypes,
        transmissions
      }
    });
  } catch (error) {
    console.error('Error fetching all ledgers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Middleware for tab access protection
const requireTabAccess = (tabId) => {
  return async (req, res, next) => {
    const tabAccess = await checkTabAccess(req, tabId);
    if (!tabAccess.allowed) {
      return res.status(403).json({ success: false, message: tabAccess.message });
    }
    next();
  };
};

// Middleware for CRUD permission protection
const requirePermission = (action) => {
  return async (req, res, next) => {
    const permission = await checkRolePermission(req, action);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, message: permission.message });
    }
    next();
  };
};

module.exports = {
  // Role controller with full features
  roleController,
  
  // Other ledger controllers
  designationController: createCRUD(Designation, 'Designation'),
  locationController: createCRUD(Location, 'Location'),
  makeController: createCRUD(Make, 'Make'),
  vehicleCategoryController: createCRUD(VehicleCategory, 'Vehicle Category'),
  fuelTypeController: createCRUD(FuelType, 'Fuel Type'),
  transmissionController: createCRUD(Transmission, 'Transmission'),
  
  // Get all ledgers at once
  getAllLedgers,
  getAllLedgersWithInactive,
  
  // Middleware for permission checking
  requireTabAccess,
  requirePermission,
  
  // Utility functions
  checkRolePermission,
  checkTabAccess
};