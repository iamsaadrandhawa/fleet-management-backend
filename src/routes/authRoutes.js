const express = require('express');
const router = express.Router();

// Import controllers
const { 
    register, 
    login, 
    getProfile, 
    updateProfile 
} = require('../controllers/authController');

// Import middleware
const { protect } = require('../middleware/auth');
const { 
    registerValidation, 
    loginValidation, 
    validateRequest 
} = require('../middleware/validation');

// Public routes
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;