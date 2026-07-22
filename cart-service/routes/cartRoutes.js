const express = require('express');
const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/cartController');

const router = express.Router();
router.use(auth);
router.get('/', controller.getCart);
router.post('/items', controller.addItem);
router.put('/items/:id', controller.updateItem);
router.delete('/items/:id', controller.removeItem);
router.post('/checkout', controller.checkout);

module.exports = router;
