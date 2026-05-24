const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { isAuthenticated, authorizeRoles } = require('../middlewares/authMiddleware');

// Ver catálogo de repuestos (Acceso general para usuarios logueados)
router.get('/', isAuthenticated, productController.getAllProducts);

// Crear nuevo repuesto (Admin y Soporte Técnico)
router.post('/products', isAuthenticated, authorizeRoles(['admin', 'support']), productController.createProduct);

// Actualizar un repuesto existente (Admin y Soporte Técnico)
router.post('/products/edit/:id', isAuthenticated, authorizeRoles(['admin', 'support']), productController.updateProduct);

// Eliminar un repuesto del catálogo (Solo Admin)
router.post('/products/delete/:id', isAuthenticated, authorizeRoles(['admin']), productController.deleteProduct);

module.exports = router;
