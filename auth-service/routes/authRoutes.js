const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// @route   POST /auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST /auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', login);

module.exports = router;
