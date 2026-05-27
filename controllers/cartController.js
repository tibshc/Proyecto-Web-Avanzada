/**
 * cartController.js
 *
 * Pilares aplicados:
 *  - SECURITY (STRIDE - EoP): Los controladores update y remove ahora usan
 *    req.cartItem del middleware ensureCartItemOwnership → IDOR imposible.
 *  - PERFORMANCE: Eliminada la segunda query en update/remove (N+1 resuelto).
 *    El middleware ya cargó CartItem + Cart + Product con un solo findByPk.
 *  - PERFORMANCE: Invalidación explícita de req.session.cartCountCache tras
 *    cada operación → el middleware de app.js evita re-query a la DB.
 *  - CLEAN CODE (DRY): Constantes de mensajes reutilizadas. Helpers encapsulados.
 *  - SECURITY: parseInt(quantity, 10) con base explícita (evita parsing octal).
 */

const { sequelize, Cart, CartItem, Product } = require('../models');

/**
 * Helper: Recalcula el total acumulado del carrito usando una sola query.
 * Usa SUM de Sequelize en lugar de traer todos los items y sumar en JS.
 *
 * Trade-off: delegamos la suma a PostgreSQL (más eficiente para datasets grandes)
 * vs calcular en Node (solo acceptable con datasets muy pequeños).
 */
const recalculateCartTotal = async (cart, transaction = null) => {
  const result = await CartItem.findOne({
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
    const userId = req.session.user.id;
    const activeCart = await getOrCreateActiveCart(userId);

    const [cartItems, orderHistory] = await Promise.all([
      CartItem.findAll({
        where: { cartId: activeCart.id },
        include: [{ model: Product, as: 'product' }],
        order: [['createdAt', 'ASC']]
      }),
      Cart.findAll({
        where: { userId, status: 'completed' },
        include: [{
          model: CartItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }],
        order: [['updatedAt', 'DESC']]
      })
    ]);

    res.render('cart', {
      title: 'Carrito de Compras',
      cart: activeCart,
      items: cartItems,
      history: orderHistory,
      error: req.query.error || null,
      success: req.query.success || null
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
  const qtyToAdd = Math.max(1, parseInt(req.body.quantity, 10) || 1);
  const userId   = req.session.user.id;

  try {
    const product = await Product.findByPk(productId, { attributes: ['id', 'name', 'stock', 'price'] });
    if (!product) {
      return res.redirect('/dashboard?error=' + encodeURIComponent('El repuesto solicitado no existe.'));
    }

    const cart       = await getOrCreateActiveCart(userId);
    const existingItem = await CartItem.findOne({ where: { cartId: cart.id, productId } });

    const currentQty = existingItem ? existingItem.quantity : 0;
    const finalQty   = currentQty + qtyToAdd;

    if (finalQty > product.stock) {
      return res.redirect(
        '/dashboard?error=' + encodeURIComponent(`Stock insuficiente. Solo quedan ${product.stock} unidades de "${product.name}".`)
      );
    }

    if (existingItem) {
      existingItem.quantity = finalQty;
      existingItem.price    = product.price;
      await existingItem.save();
    } else {
      await CartItem.create({ cartId: cart.id, productId, quantity: qtyToAdd, price: product.price });
    }

    await recalculateCartTotal(cart);

    // Invalidar caché del contador del carrito
    req.session.cartCountCache = undefined;

    res.redirect('/cart?success=' + encodeURIComponent('Se añadió el repuesto al carrito con éxito.'));
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Error interno al agregar el repuesto.'));
  }
};

/**
 * Modifica la cantidad de un artículo en el carrito.
 * SECURITY: req.cartItem viene del middleware ensureCartItemOwnership (IDOR protegido).
 * PERFORMANCE: Reutiliza el item precargado → elimina segunda query a la DB.
 */
exports.updateCartItem = async (req, res) => {
  const newQty = parseInt(req.body.quantity, 10);

  if (isNaN(newQty) || newQty < 1) {
    return res.redirect('/cart?error=' + encodeURIComponent('La cantidad debe ser un número mayor o igual a 1.'));
  }

  try {
    // Propiedad ya verificada por middleware → sin segunda query
    const cartItem = req.cartItem;
    const product  = cartItem.product;

    if (newQty > product.stock) {
      return res.redirect(
        '/cart?error=' + encodeURIComponent(`Stock máximo disponible: ${product.stock} unidades.`)
      );
    }

    cartItem.quantity = newQty;
    cartItem.price    = product.price; // Congelar precio actual del catálogo
    await cartItem.save();

    await recalculateCartTotal(cartItem.cart);

    // Invalidar caché del contador
    req.session.cartCountCache = undefined;

    res.redirect('/cart?success=' + encodeURIComponent('Cantidad actualizada.'));
  } catch (error) {
    console.error('Error al actualizar artículo del carrito:', error);
    res.redirect('/cart?error=' + encodeURIComponent('Error al actualizar la cantidad.'));
  }
};

/**
 * Elimina un artículo del carrito de compras.
 * SECURITY: req.cartItem viene del middleware ensureCartItemOwnership (IDOR protegido).
 */
exports.removeFromCart = async (req, res) => {
  try {
    // Propiedad ya verificada por middleware
    const cartItem = req.cartItem;
    const cart     = cartItem.cart;

    await cartItem.destroy();
    await recalculateCartTotal(cart);

    // Invalidar caché del contador
    req.session.cartCountCache = undefined;

    res.redirect('/cart?success=' + encodeURIComponent('Repuesto removido del carrito.'));
  } catch (error) {
    console.error('Error al eliminar artículo del carrito:', error);
    res.redirect('/cart?error=' + encodeURIComponent('Error al remover el repuesto.'));
  }
};

/**
 * Finaliza la compra (Checkout) en una transacción atómica de PostgreSQL.
 * Garantiza consistencia: o todo se completa o todo se revierte.
 */
exports.checkout = async (req, res) => {
  const userId = req.session.user.id;

  try {
    await sequelize.transaction(async (t) => {
      const cart = await Cart.findOne({
        where: { userId, status: 'active' },
        include: [{
          model: CartItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }],
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

        // Congelar precio histórico al momento del checkout
        item.price = product.price;
        await item.save({ transaction: t });
      }

      cart.status = 'completed';
      await cart.save({ transaction: t });

      await Cart.create({ userId, status: 'active', total: 0.00 }, { transaction: t });
    });

    // Checkout exitoso: carrito nuevo está vacío
    req.session.cartCountCache = 0;

    res.redirect('/cart?success=' + encodeURIComponent('¡Compra finalizada con éxito! Su pedido de repuestos ha sido procesado.'));
  } catch (error) {
    console.error('Error en Checkout transaccional:', error.message);
    res.redirect('/cart?error=' + encodeURIComponent(error.message || 'Error al procesar la compra.'));
  }
};
