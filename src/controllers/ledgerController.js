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

// Permission checking function
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
    
    return { allowed: true };
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
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );
      if (!item) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
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
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
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
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { status: 'inactive', updatedAt: Date.now() },
        { new: true }
      );
      if (!item) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
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
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { status: 'active', updatedAt: Date.now() },
        { new: true }
      );
      if (!item) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }
      res.json({ success: true, message: `${modelName} restored successfully`, data: item });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// Get all ledgers grouped together (only active)
const getAllLedgers = async (req, res) => {
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

// Create all controllers (Role is a ledger too, but skip permission check for Role itself)
module.exports = {
  // Role controller (skip permission check to avoid circular dependency)
  roleController: createCRUD(Role, 'Role', true),
  
  // Other ledger controllers (with permission checks)
  designationController: createCRUD(Designation, 'Designation'),
  locationController: createCRUD(Location, 'Location'),
  makeController: createCRUD(Make, 'Make'),
  vehicleCategoryController: createCRUD(VehicleCategory, 'Vehicle Category'),
  fuelTypeController: createCRUD(FuelType, 'Fuel Type'),
  transmissionController: createCRUD(Transmission, 'Transmission'),
  
  // Get all ledgers at once
  getAllLedgers,
  getAllLedgersWithInactive
};