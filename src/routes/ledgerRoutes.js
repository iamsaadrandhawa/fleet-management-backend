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
  getAllLedgersWithInactive
} = require('../controllers/ledgerController');

// All routes require authentication
router.use(protect);

// ==================== GET ALL LEDGERS ====================
router.get('/all', getAllLedgers);
router.get('/all/include-inactive', authorize('admin'), getAllLedgersWithInactive);

// ==================== ROLES (Ledger) ====================
router.get('/roles', roleController.getAll);
router.get('/roles/all', authorize('admin'), roleController.getAllWithInactive);
router.get('/roles/:id', roleController.getById);
router.post('/roles', authorize('admin'), roleController.create);
router.put('/roles/:id', authorize('admin'), roleController.update);
router.delete('/roles/:id', authorize('admin'), roleController.delete); // Hard delete (permanent)
router.put('/roles/:id/soft', authorize('admin'), roleController.softDelete); // Soft delete (deactivate)
router.put('/roles/:id/restore', authorize('admin'), roleController.restore); // Restore

// ==================== DESIGNATIONS (Ledger) ====================
router.get('/designations', designationController.getAll);
router.get('/designations/all', authorize('admin'), designationController.getAllWithInactive);
router.get('/designations/:id', designationController.getById);
router.post('/designations', authorize('admin'), designationController.create);
router.put('/designations/:id', authorize('admin'), designationController.update);
router.delete('/designations/:id', authorize('admin'), designationController.delete);
router.put('/designations/:id/soft', authorize('admin'), designationController.softDelete);
router.put('/designations/:id/restore', authorize('admin'), designationController.restore);

// ==================== LOCATIONS (Ledger) ====================
router.get('/locations', locationController.getAll);
router.get('/locations/all', authorize('admin'), locationController.getAllWithInactive);
router.get('/locations/:id', locationController.getById);
router.post('/locations', authorize('admin'), locationController.create);
router.put('/locations/:id', authorize('admin'), locationController.update);
router.delete('/locations/:id', authorize('admin'), locationController.delete);
router.put('/locations/:id/soft', authorize('admin'), locationController.softDelete);
router.put('/locations/:id/restore', authorize('admin'), locationController.restore);

// ==================== MAKES (Ledger) ====================
router.get('/makes', makeController.getAll);
router.get('/makes/all', authorize('admin'), makeController.getAllWithInactive);
router.get('/makes/:id', makeController.getById);
router.post('/makes', authorize('admin'), makeController.create);
router.put('/makes/:id', authorize('admin'), makeController.update);
router.delete('/makes/:id', authorize('admin'), makeController.delete);
router.put('/makes/:id/soft', authorize('admin'), makeController.softDelete);
router.put('/makes/:id/restore', authorize('admin'), makeController.restore);

// ==================== VEHICLE CATEGORIES (Ledger) ====================
router.get('/vehicle-categories', vehicleCategoryController.getAll);
router.get('/vehicle-categories/all', authorize('admin'), vehicleCategoryController.getAllWithInactive);
router.get('/vehicle-categories/:id', vehicleCategoryController.getById);
router.post('/vehicle-categories', authorize('admin'), vehicleCategoryController.create);
router.put('/vehicle-categories/:id', authorize('admin'), vehicleCategoryController.update);
router.delete('/vehicle-categories/:id', authorize('admin'), vehicleCategoryController.delete);
router.put('/vehicle-categories/:id/soft', authorize('admin'), vehicleCategoryController.softDelete);
router.put('/vehicle-categories/:id/restore', authorize('admin'), vehicleCategoryController.restore);

// ==================== FUEL TYPES (Ledger) ====================
router.get('/fuel-types', fuelTypeController.getAll);
router.get('/fuel-types/all', authorize('admin'), fuelTypeController.getAllWithInactive);
router.get('/fuel-types/:id', fuelTypeController.getById);
router.post('/fuel-types', authorize('admin'), fuelTypeController.create);
router.put('/fuel-types/:id', authorize('admin'), fuelTypeController.update);
router.delete('/fuel-types/:id', authorize('admin'), fuelTypeController.delete);
router.put('/fuel-types/:id/soft', authorize('admin'), fuelTypeController.softDelete);
router.put('/fuel-types/:id/restore', authorize('admin'), fuelTypeController.restore);

// ==================== TRANSMISSIONS (Ledger) ====================
router.get('/transmissions', transmissionController.getAll);
router.get('/transmissions/all', authorize('admin'), transmissionController.getAllWithInactive);
router.get('/transmissions/:id', transmissionController.getById);
router.post('/transmissions', authorize('admin'), transmissionController.create);
router.put('/transmissions/:id', authorize('admin'), transmissionController.update);
router.delete('/transmissions/:id', authorize('admin'), transmissionController.delete);
router.put('/transmissions/:id/soft', authorize('admin'), transmissionController.softDelete);
router.put('/transmissions/:id/restore', authorize('admin'), transmissionController.restore);

module.exports = router;