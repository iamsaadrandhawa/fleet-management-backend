const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    // Vehicle Information
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    vehicleNumber: {
        type: String,
        required: true
    },
    
    // Maintenance Type
    maintenanceType: {
        type: String,
        enum: ['Regular Service', 'Repair', 'Emergency', 'Accident', 'Tire Change', 'Oil Change', 'Brake Service', 'Engine Repair', 'Electrical', 'AC Service', 'Other'],
        required: true
    },
    
    // Schedule
    scheduledDate: {
        type: Date,
        required: true
    },
    completedDate: Date,
    
    // Details
    description: {
        type: String,
        required: true
    },
    odometerReading: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Costs
    estimatedCost: {
        type: Number,
        min: 0,
        default: 0
    },
    actualCost: {
        type: Number,
        min: 0,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Partially Paid'],
        default: 'Pending'
    },
    
    // Service Provider
    serviceProvider: {
        name: String,
        contact: String,
        address: String,
        phone: String
    },
    
    // Parts Used
    partsUsed: [{
        name: String,
        partNumber: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number
    }],
    
    // Labor
    laborHours: {
        type: Number,
        default: 0
    },
    laborRate: {
        type: Number,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Delayed'],
        default: 'Scheduled'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Emergency'],
        default: 'Medium'
    },
    
    // Documents
    documents: [{
        name: String,
        fileUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Notes
    notes: String,
    technicianNotes: String,
    
    // Warranty
    warrantyInfo: {
        covered: {
            type: Boolean,
            default: false
        },
        claimNumber: String,
        expiryDate: Date
    },
    
    // Next Maintenance
    nextMaintenanceDue: {
        date: Date,
        odometer: Number,
        description: String
    },
    
    // Audit
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

// Indexes
maintenanceSchema.index({ vehicle: 1, scheduledDate: -1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);