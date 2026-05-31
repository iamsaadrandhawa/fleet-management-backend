const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    // ── Personal Information ─────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    cnic: {
      type: String,
      required: [true, 'CNIC is required'],
      unique: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },

    // ── Profile Image ────────────────────────────────────────
    profilePicture: {
      type: String,
      default: null,
    },

    // ── Employment Details ───────────────────────────────────
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
    },
    
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },

    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },

    // ── Location ─────────────────────────────────────────────
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    // ── Vehicle Allocation ───────────────────────────────────
    allocatedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    dateOfAllotment: {
      type: Date,
      default: null,
    },

    // ── License Information ──────────────────────────────────
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
      required: [true, 'License expiry date is required'],
    },

    // ── Documents ────────────────────────────────────────────
    documents: [
      {
        name: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ── Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ['available', 'on trip', 'off duty', 'suspended'],
      default: 'available',
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },

    // ── Audit Fields ─────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { 
    timestamps: true 
  }
);

// NO pre-save hook needed since we don't have fullName

module.exports = mongoose.model('Driver', driverSchema);