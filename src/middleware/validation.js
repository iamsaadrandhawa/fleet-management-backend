const { body, validationResult } = require('express-validator');

// Validation result handler
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// User registration validation
const registerValidation = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
        .trim(),
    
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
    
    body('role')
        .optional()
        .isIn(['Admin', 'Fleet Manager', 'Driver', 'Viewer']).withMessage('Invalid role')
];

// Login validation
const loginValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
];

// Vehicle validation
const vehicleValidation = [
    body('make').notEmpty().withMessage('Make is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('year')
        .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
        .withMessage('Please enter a valid year'),
    body('vin').notEmpty().withMessage('VIN is required'),
    body('registrationNumber').notEmpty().withMessage('Registration number is required')
];

// Driver validation
const driverValidation = [
    body('licenseNumber').notEmpty().withMessage('License number is required'),
    body('licenseType').isIn(['Class A', 'Class B', 'Class C', 'Motorcycle', 'Other']).withMessage('Invalid license type'),
    body('licenseExpiryDate').isISO8601().withMessage('Valid expiry date is required')
];

// Maintenance validation
const maintenanceValidation = [
    body('vehicle').notEmpty().withMessage('Vehicle ID is required'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
    body('serviceType').isIn(['regular service', 'repair', 'emergency', 'inspection']).withMessage('Invalid service type'),
    body('description').notEmpty().withMessage('Description is required'),
    body('mileage').isInt({ min: 0 }).withMessage('Valid mileage is required')
];

module.exports = {
    validateRequest,
    registerValidation,
    loginValidation,
    vehicleValidation,
    driverValidation,
    maintenanceValidation
};