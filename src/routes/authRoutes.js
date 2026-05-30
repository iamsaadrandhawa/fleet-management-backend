// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { login } = require('../controllers/authController'); // Make sure this path is correct

// Validation rules
const validateLogin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

// Login route
router.post('/login', validateLogin, login);

module.exports = router;