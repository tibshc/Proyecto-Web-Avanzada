const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Ver sala de chat en tiempo real
router.get('/', isAuthenticated, chatController.getChat);

module.exports = router;
