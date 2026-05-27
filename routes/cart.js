const express = require('express');
const router  = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated, ensureCartItemOwnership } = require('../middlewares/authMiddleware');

// Ver carrito e historial de compras
router.get('/', isAuthenticated, cartController.getCart);

// Agregar artículo al carrito
router.post('/add', isAuthenticated, cartController.addToCart);

// Actualizar cantidad de un artículo
// ensureCartItemOwnership: verifica propiedad (IDOR) + precarga CartItem+Cart+Product
router.post('/update/:id', isAuthenticated, ensureCartItemOwnership, cartController.updateCartItem);

// Eliminar un artículo del carrito
// ensureCartItemOwnership: verifica propiedad (IDOR) + precarga CartItem+Cart
router.post('/remove/:id', isAuthenticated, ensureCartItemOwnership, cartController.removeFromCart);

// Completar la compra (Checkout)
router.post('/checkout', isAuthenticated, cartController.checkout);

module.exports = router;
