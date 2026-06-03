// routes/ledgerRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  roleController,
  designationController,
  locationController,
  makeController,
  vehicleCategoryController,
  fuelTypeController,
  transmissionController,
  getAllLedgers,
  getAllLedgersWithInactive,
  requireTabAccess,
  requirePermission
} = require('../controllers/ledgerController');

// All routes require authentication
router.use(protect);

// ==================== UTILITY ENDPOINTS ====================
// Get current user's role permissions (accessible to all authenticated users)
router.get('/my-permissions', roleController.getMyPermissions);

// Check specific permission for a role (admin only)
router.get('/roles/:id/check-permissions', authorize('admin'), roleController.checkPermissions);

// ==================== GET ALL LEDGERS ====================
// Apply tab access check for ledgers section
router.get('/all', requireTabAccess('ledgers'), getAllLedgers);
router.get('/all/include-inactive', authorize('admin'), requireTabAccess('ledgers'), getAllLedgersWithInactive);

// ==================== ROLES (Ledger) ====================
// Routes with tab access check
router.get('/roles', requireTabAccess('ledgers'), roleController.getAll);
router.get('/roles/active', requireTabAccess('ledgers'), roleController.getAllActive);
router.get('/roles/all', authorize('admin'), requireTabAccess('ledgers'), roleController.getAllWithInactive);
router.get('/roles/:id', requireTabAccess('ledgers'), roleController.getById);

// Admin only routes with permission checks
router.post('/roles', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('create'), 
  roleController.create
);

router.put('/roles/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  roleController.update
);

router.delete('/roles/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('delete'), 
  roleController.delete
);

router.put('/roles/:id/soft', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  roleController.softDelete
);

router.put('/roles/:id/restore', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  roleController.restore
);

// ==================== DESIGNATIONS (Ledger) ====================
router.get('/designations', requireTabAccess('ledgers'), designationController.getAll);
router.get('/designations/all', authorize('admin'), requireTabAccess('ledgers'), designationController.getAllWithInactive);
router.get('/designations/:id', requireTabAccess('ledgers'), designationController.getById);

router.post('/designations', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('create'), 
  designationController.create
);

router.put('/designations/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  designationController.update
);

router.delete('/designations/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('delete'), 
  designationController.delete
);

router.put('/designations/:id/soft', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  designationController.softDelete
);

router.put('/designations/:id/restore', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  designationController.restore
);

// ==================== LOCATIONS (Ledger) ====================
router.get('/locations', requireTabAccess('ledgers'), locationController.getAll);
router.get('/locations/all', authorize('admin'), requireTabAccess('ledgers'), locationController.getAllWithInactive);
router.get('/locations/:id', requireTabAccess('ledgers'), locationController.getById);

router.post('/locations', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('create'), 
  locationController.create
);

router.put('/locations/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  locationController.update
);

router.delete('/locations/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('delete'), 
  locationController.delete
);

router.put('/locations/:id/soft', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  locationController.softDelete
);

router.put('/locations/:id/restore', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  locationController.restore
);

// ==================== MAKES (Ledger) ====================
router.get('/makes', requireTabAccess('ledgers'), makeController.getAll);
router.get('/makes/all', authorize('admin'), requireTabAccess('ledgers'), makeController.getAllWithInactive);
router.get('/makes/:id', requireTabAccess('ledgers'), makeController.getById);

router.post('/makes', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('create'), 
  makeController.create
);

router.put('/makes/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  makeController.update
);

router.delete('/makes/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('delete'), 
  makeController.delete
);

router.put('/makes/:id/soft', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  makeController.softDelete
);

router.put('/makes/:id/restore', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  makeController.restore
);

// ==================== VEHICLE CATEGORIES (Ledger) ====================
router.get('/vehicle-categories', requireTabAccess('ledgers'), vehicleCategoryController.getAll);
router.get('/vehicle-categories/all', authorize('admin'), requireTabAccess('ledgers'), vehicleCategoryController.getAllWithInactive);
router.get('/vehicle-categories/:id', requireTabAccess('ledgers'), vehicleCategoryController.getById);

router.post('/vehicle-categories', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('create'), 
  vehicleCategoryController.create
);

router.put('/vehicle-categories/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  vehicleCategoryController.update
);

router.delete('/vehicle-categories/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('delete'), 
  vehicleCategoryController.delete
);

router.put('/vehicle-categories/:id/soft', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  vehicleCategoryController.softDelete
);

router.put('/vehicle-categories/:id/restore', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  vehicleCategoryController.restore
);

// ==================== FUEL TYPES (Ledger) ====================
router.get('/fuel-types', requireTabAccess('ledgers'), fuelTypeController.getAll);
router.get('/fuel-types/all', authorize('admin'), requireTabAccess('ledgers'), fuelTypeController.getAllWithInactive);
router.get('/fuel-types/:id', requireTabAccess('ledgers'), fuelTypeController.getById);

router.post('/fuel-types', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('create'), 
  fuelTypeController.create
);

router.put('/fuel-types/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  fuelTypeController.update
);

router.delete('/fuel-types/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('delete'), 
  fuelTypeController.delete
);

router.put('/fuel-types/:id/soft', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  fuelTypeController.softDelete
);

router.put('/fuel-types/:id/restore', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  fuelTypeController.restore
);

// ==================== TRANSMISSIONS (Ledger) ====================
router.get('/transmissions', requireTabAccess('ledgers'), transmissionController.getAll);
router.get('/transmissions/all', authorize('admin'), requireTabAccess('ledgers'), transmissionController.getAllWithInactive);
router.get('/transmissions/:id', requireTabAccess('ledgers'), transmissionController.getById);

router.post('/transmissions', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('create'), 
  transmissionController.create
);

router.put('/transmissions/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  transmissionController.update
);

router.delete('/transmissions/:id', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('delete'), 
  transmissionController.delete
);

router.put('/transmissions/:id/soft', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  transmissionController.softDelete
);

router.put('/transmissions/:id/restore', 
  authorize('admin'), 
  requireTabAccess('ledgers'), 
  requirePermission('update'), 
  transmissionController.restore
);

module.exports = router;