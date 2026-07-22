const express = require('express');
const router = express.Router();
const { register, login, me, forgotPassword, resetPassword } = require('../controllers/authController');
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET).user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// @route   POST /auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST /auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', login);
router.get('/me', authenticate, me);

// @route   POST /auth/forgot-password
// @desc    Request password reset token
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST /auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', resetPassword);

module.exports = router;
