const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/authController');
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

module.exports = router;
