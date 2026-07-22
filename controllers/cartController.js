/**
 * Mejoras implementadas:
 *  - FLASH: Todos los redirect con ?error/success reemplazados por req.flash()
 *    → mensajes no expuestos en la URL, no repetibles al recargar la página.
 *  - SECURITY (STRIDE - EoP): Los controladores update y remove usan
 *    req.cartItem del middleware ensureCartItemOwnership → IDOR imposible.
 *  - PERFORMANCE: Eliminada la segunda query en update/remove (N+1 resuelto).
 *  - PERFORMANCE: Invalidación explícita de req.session.cartCountCache.
 *  - CLEAN CODE (DRY): Constantes de mensajes reutilizadas. Helpers encapsulados.
 *  - SECURITY: parseInt(quantity, 10) con base explícita.
 */

const { sequelize, Cart, CartItem, Product } = require('../models');

/**
 * Helper: Recalcula el total del carrito delegando la suma a PostgreSQL.
 */
const recalculateCartTotal = async (cart, transaction = null) => {
  // BUG 7 FIX: findOne con SUM es incorrecto (LIMIT 1 interfiere con el agregado).
  // Se usa findAll con raw:true para obtener el resultado del SUM correctamente.
  const [result] = await CartItem.findAll({
    where: { cartId: cart.id },
    attributes: [
      [sequelize.fn('SUM', sequelize.literal('CAST(price AS DECIMAL) * quantity')), 'total']
    ],
    raw: true,
    transaction
  });

  cart.total = parseFloat(result?.total) || 0.00;
  await cart.save({ transaction });
};

/**
 * Helper: Obtiene o crea el carrito activo de un usuario.
 */
const getOrCreateActiveCart = async (userId, transaction = null) => {
  let cart = await Cart.findOne({
    where: { userId, status: 'active' },
    transaction
  });

  if (!cart) {
    cart = await Cart.create({ userId, status: 'active', total: 0.00 }, { transaction });
  }

  return cart;
};

/**
 * Muestra el carrito activo y el historial de compras finalizadas.
 */
exports.getCart = async (req, res) => {
  try {
    const userId    = req.session.user.id;
    const activeCart = await getOrCreateActiveCart(userId);

    const [cartItems, orderHistory] = await Promise.all([
      CartItem.findAll({
        where:   { cartId: activeCart.id },
        include: [{ model: Product, as: 'product' }],
        order:   [['createdAt', 'ASC']]
      }),
      Cart.findAll({
        where:   { userId, status: 'completed' },
        include: [{ model: CartItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
        order:   [['updatedAt', 'DESC']]
      })
    ]);

    res.render('cart', {
      title:   'Carrito de Compras',
      cart:    activeCart,
      items:   cartItems,
      history: orderHistory,
      error:   res.locals.error   || null,
      success: res.locals.success || null
    });
  } catch (error) {
    console.error('Error al obtener el carrito:', error);
    res.redirect('/dashboard');
  }
};

/**
 * Agrega un repuesto al carrito de compras.
 */
exports.addToCart = async (req, res) => {
  const { productId } = req.body;
  const qtyToAdd      = Math.max(1, parseInt(req.body.quantity, 10) || 1);
  const userId        = req.session.user.id;

  // CRUD FIX 6: Validar que productId exista antes de consultar la BD
  if (!productId) {
    req.flash('error', 'Producto inválido. No se pudo agregar al carrito.');
    return res.redirect('/dashboard');
  }

  try {
    const product = await Product.findByPk(productId, { attributes: ['id', 'name', 'stock', 'price'] });
    if (!product) {
      req.flash('error', 'El repuesto solicitado no existe.');
      return res.redirect('/dashboard');
    }

    const cart         = await getOrCreateActiveCart(userId);
    const existingItem = await CartItem.findOne({ where: { cartId: cart.id, productId } });

    const currentQty = existingItem ? existingItem.quantity : 0;
    const finalQty   = currentQty + qtyToAdd;

    if (finalQty > product.stock) {
      req.flash('error', `Stock insuficiente. Solo quedan ${product.stock} unidades de "${product.name}".`);
      return res.redirect('/dashboard');
    }

    if (existingItem) {
      existingItem.quantity = finalQty;
      existingItem.price    = product.price;
      await existingItem.save();
    } else {
      await CartItem.create({ cartId: cart.id, productId, quantity: qtyToAdd, price: product.price });
    }

    await recalculateCartTotal(cart);
    req.session.cartCountCache = undefined;

    req.flash('success', 'Se añadió el repuesto al carrito con éxito.');
    res.redirect('/cart');
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    req.flash('error', 'Error interno al agregar el repuesto.');
    res.redirect('/dashboard');
  }
};

/**
 * Modifica la cantidad de un artículo en el carrito.
 * SECURITY: req.cartItem viene del middleware ensureCartItemOwnership (IDOR protegido).
 */
exports.updateCartItem = async (req, res) => {
  const newQty = parseInt(req.body.quantity, 10);

  if (isNaN(newQty) || newQty < 1) {
    req.flash('error', 'La cantidad debe ser un número mayor o igual a 1.');
    return res.redirect('/cart');
  }

  try {
    const cartItem = req.cartItem;
    const product  = cartItem.product;

    if (newQty > product.stock) {
      req.flash('error', `Stock máximo disponible: ${product.stock} unidades.`);
      return res.redirect('/cart');
    }

    cartItem.quantity = newQty;
    cartItem.price    = product.price;
    await cartItem.save();

    await recalculateCartTotal(cartItem.cart);
    req.session.cartCountCache = undefined;

    req.flash('success', 'Cantidad actualizada.');
    res.redirect('/cart');
  } catch (error) {
    console.error('Error al actualizar artículo del carrito:', error);
    req.flash('error', 'Error al actualizar la cantidad.');
    res.redirect('/cart');
  }
};

/**
 * Elimina un artículo del carrito de compras.
 * SECURITY: req.cartItem viene del middleware ensureCartItemOwnership (IDOR protegido).
 */
exports.removeFromCart = async (req, res) => {
  try {
    const cartItem = req.cartItem;
    const cart     = cartItem.cart;

    await cartItem.destroy();
    await recalculateCartTotal(cart);
    req.session.cartCountCache = undefined;

    req.flash('success', 'Repuesto removido del carrito.');
    res.redirect('/cart');
  } catch (error) {
    console.error('Error al eliminar artículo del carrito:', error);
    req.flash('error', 'Error al remover el repuesto.');
    res.redirect('/cart');
  }
};

/**
 * Finaliza la compra (Checkout) en una transacción atómica de PostgreSQL.
 */
exports.checkout = async (req, res) => {
  const userId = req.session.user.id;

  try {
    await sequelize.transaction(async (t) => {
      const cart = await Cart.findOne({
        where:   { userId, status: 'active' },
        include: [{ model: CartItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
        transaction: t
      });

      if (!cart || cart.items.length === 0) {
        throw new Error('El carrito está vacío, no se puede realizar la compra.');
      }

      for (const item of cart.items) {
        const product = item.product;

        if (item.quantity > product.stock) {
          throw new Error(`Stock insuficiente para "${product.name}". Solicitado: ${item.quantity}, Disponible: ${product.stock}`);
        }

        product.stock -= item.quantity;
        await product.save({ transaction: t });

        item.price = product.price;
        await item.save({ transaction: t });
      }

      cart.status = 'completed';
      await cart.save({ transaction: t });

      await Cart.create({ userId, status: 'active', total: 0.00 }, { transaction: t });
    });

    req.session.cartCountCache = 0;
    req.flash('success', '¡Compra finalizada con éxito! Su pedido de repuestos ha sido procesado.');
    res.redirect('/cart');
  } catch (error) {
    console.error('Error en Checkout transaccional:', error.message);
    req.flash('error', error.message || 'Error al procesar la compra.');
    res.redirect('/cart');
  }
};