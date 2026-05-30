const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    // Vehicle Information
    company: {
        type: String,
        required: [true, 'Vehicle company is required'],
        trim: true
    },
    model: {
        type: String,
        required: [true, 'Vehicle model is required'],
        trim: true
    },
    year: {
        type: Number,
        required: [true, 'Year is required'],
        min: [1900, 'Year must be at least 1900'],
        max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    
    // Registration Details
    vehicleNumber: {
        type: String,
        required: [true, 'Vehicle number is required'],
        unique: true,  // This already creates an index
        trim: true
    },
    registrationNumber: {
        type: String,
        required: [true, 'Registration number is required'],
        unique: true,  // This already creates an index
        trim: true
    },
    
    // Mileage
    meterReading: {
        type: Number,
        required: [true, 'Meter reading is required'],
        min: 0,
        default: 0
    },
    
    // Purchase Details
    purchaseDate: {
        type: Date,
        required: false,
        default: null
    },
    purchasePrice: {
        type: Number,
        required: false,
        min: 0,
        default: 0
    },
    
    // Vehicle Specifications
    color: {
        type: String,
        trim: true
    },
    fuelType: {
        type: String,
        enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'],
        required: [true, 'Fuel type is required']
    },
    transmission: {
        type: String,
        enum: ['Manual', 'Automatic', 'CVT', 'AMT'],
        required: false,
        default: 'Manual'
    },
    seatingCapacity: {
        type: Number,
        required: false,
        min: 1,
        max: 100,
        default: 4
    },
    engineNumber: {
        type: String,
        trim: true,
        required: [true, 'Engine number is required']
    },
    chassisNumber: {
        type: String,
        trim: true,
        required: [true, 'Chassis number is required']
    },
    
    // Insurance and Expiry
    insuranceExpiry: {
        type: Date,
        required: false,
        default: null
    },
    registrationExpiry: {
        type: Date,
        required: false,
        default: null
    },
    
    // Status and Assignment
    status: {
        type: String,
        enum: ['active', 'inactive', 'in maintenance', 'out of service'],
        default: 'active'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        default: null
    },
    
    // Additional Info
    notes: {
        type: String,
        trim: true
    },
    
    // Vehicle Category
    vehicleCategory: {
        type: String,
        required: false,
        trim: true,
        default: 'Car'
    },
    
    // Audit Fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Only create indexes for NON-unique fields that need performance optimization
// Remove duplicate indexes - unique indexes are already created by 'unique: true'
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ assignedTo: 1 });
vehicleSchema.index({ fuelType: 1 });
vehicleSchema.index({ year: -1 }); // For sorting by year
vehicleSchema.index({ createdAt: -1 }); // For sorting by creation date

// Compound index for common queries
vehicleSchema.index({ status: 1, assignedTo: 1 });
vehicleSchema.index({ company: 1, model: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);