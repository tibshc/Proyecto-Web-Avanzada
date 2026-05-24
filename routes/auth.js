const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de Login
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Rutas de Registro
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// Rutas de Recuperación de Contraseña
router.get('/reset-password', authController.getResetPassword);
router.post('/reset-password', authController.postResetPassword);

// Ruta de Logout
router.get('/logout', authController.logout);

module.exports = router;
