const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    // Personal Information
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    // photo: {
    //     type: String,
    //     default: null
    // },
    
    // Employment Details
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        unique: true,
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },

    // Contact Information
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },

    // License Information
    licenseNumber: {
        type: String,
        required: [true, 'License number is required'],
        unique: true,
        trim: true
    },

    // Location
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['available', 'on trip', 'off duty', 'suspended'],
        default: 'available'
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

module.exports = mongoose.model('Driver', driverSchema);