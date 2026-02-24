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
        unique: true,
        trim: true
    },
    registrationNumber: {
        type: String,
        required: [true, 'Registration number is required'],
        unique: true,
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
        required: [true, 'Purchase date is required']
    },
    purchasePrice: {
        type: Number,
        required: [true, 'Purchase price is required'],
        min: 0
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
    engineNumber: {
        type: String,
        trim: true
    },
    chassisNumber: {
        type: String,
        trim: true
    },
    
    // Insurance and Expiry
    insuranceExpiry: {
        type: Date,
        required: [true, 'Insurance expiry date is required']
    },
    registrationExpiry: {
        type: Date,
        required: [true, 'Registration expiry date is required']
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



module.exports = mongoose.model('Vehicle', vehicleSchema);