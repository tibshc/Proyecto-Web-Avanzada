const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Ver carrito e historial de compras
router.get('/', isAuthenticated, cartController.getCart);

// Agregar artículo al carrito
router.post('/add', isAuthenticated, cartController.addToCart);

// Actualizar cantidad de un artículo
router.post('/update/:id', isAuthenticated, cartController.updateCartItem);

// Eliminar un artículo del carrito
router.post('/remove/:id', isAuthenticated, cartController.removeFromCart);

// Completar la compra (Checkout)
router.post('/checkout', isAuthenticated, cartController.checkout);

module.exports = router;
