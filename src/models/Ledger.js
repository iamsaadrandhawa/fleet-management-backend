// src/models/Ledger.js
const mongoose = require('mongoose');

// Role Schema
const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
    permissions: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    }
}, { timestamps: true });

// Designation Schema
const designationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] }
}, { timestamps: true });

// Location Schema
const locationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] }
}, { timestamps: true });

// Make Schema
const makeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, trim: true },
    country: { type: String, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] }
}, { timestamps: true });

// Vehicle Category Schema
const vehicleCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] }
}, { timestamps: true });

// Fuel Type Schema
const fuelTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] }
}, { timestamps: true });

// Transmission Schema
const transmissionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] }
}, { timestamps: true });

// Helper method
roleSchema.methods.hasPermission = function(action) {
    const actions = ['create', 'read', 'update', 'delete'];
    if (!actions.includes(action)) return false;
    return this.permissions?.[action] === true;
};

// ✅ SIMPLIFIED - No pre-save middleware at all
// Just create the models directly
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
const Designation = mongoose.models.Designation || mongoose.model('Designation', designationSchema);
const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
const Make = mongoose.models.Make || mongoose.model('Make', makeSchema);
const VehicleCategory = mongoose.models.VehicleCategory || mongoose.model('VehicleCategory', vehicleCategorySchema);
const FuelType = mongoose.models.FuelType || mongoose.model('FuelType', fuelTypeSchema);
const Transmission = mongoose.models.Transmission || mongoose.model('Transmission', transmissionSchema);

console.log('✅ Ledger models loaded');

module.exports = {
    Role,
    Designation,
    Location,
    Make,
    VehicleCategory,
    FuelType,
    Transmission
};