const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { isAuthenticated, authorizeRoles } = require('../middlewares/authMiddleware');

// Ver catálogo de repuestos (Acceso para cualquier usuario autenticado: admin, mechanic, support)
router.get('/', isAuthenticated, productController.getAllProducts);

// Crear nuevo repuesto (Solo Admin y Soporte Técnico pueden registrar piezas)
router.post('/products', isAuthenticated, authorizeRoles(['admin', 'support']), productController.createProduct);

// Actualizar un repuesto existente
router.post('/products/edit/:id', isAuthenticated, authorizeRoles(['admin', 'support']), productController.updateProduct);

// Eliminar un repuesto del catálogo (Solo Admin puede eliminar permanentemente)
router.post('/products/delete/:id', isAuthenticated, authorizeRoles(['admin']), productController.deleteProduct);

module.exports = router;
