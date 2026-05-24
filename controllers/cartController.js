const { sequelize, Cart, CartItem, Product } = require('../models');

/**
 * Helper para recalcular el precio total acumulado del carrito
 */
const recalculateCartTotal = async (cart, transaction = null) => {
  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    transaction
  });

  let total = 0.00;
  for (const item of items) {
    total += parseFloat(item.price) * item.quantity;
  }

  cart.total = total;
  await cart.save({ transaction });
};

/**
 * Helper para obtener o crear el carrito activo de un usuario
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
 * Muestra el carrito activo actual y el historial de compras finalizadas
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Obtener o crear carrito activo
    const activeCart = await getOrCreateActiveCart(userId);

    // Obtener los detalles del carrito activo junto con la información del repuesto
    const cartItems = await CartItem.findAll({
      where: { cartId: activeCart.id },
      include: [{ model: Product, as: 'product' }],
      order: [['createdAt', 'ASC']]
    });

    // Obtener el historial de compras anteriores (carritos completados)
    const orderHistory = await Cart.findAll({
      where: { userId, status: 'completed' },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }]
      }],
      order: [['updatedAt', 'DESC']]
    });

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
 * Agrega un repuesto al carrito de compras
 */
exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const qtyToAdd = parseInt(quantity) || 1;
  const userId = req.session.user.id;

  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.redirect('/dashboard?error=El repuesto solicitado no existe.');
    }

    // 1. Obtener/crear carrito activo
    const cart = await getOrCreateActiveCart(userId);

    // 2. Verificar si el item ya está en el carrito
    let cartItem = await CartItem.findOne({
      where: { cartId: cart.id, productId }
    });

    const currentQty = cartItem ? cartItem.quantity : 0;
    const finalQty = currentQty + qtyToAdd;

    // 3. Validar contra el stock disponible
    if (finalQty > product.stock) {
      return res.redirect(`/dashboard?error=Stock insuficiente. Solo quedan ${product.stock} unidades de "${product.name}".`);
    }

    // 4. Crear o actualizar item
    if (cartItem) {
      cartItem.quantity = finalQty;
      cartItem.price = product.price; // Congelar precio al actual por si cambió
      await cartItem.save();
    } else {
      await CartItem.create({
        cartId: cart.id,
        productId,
        quantity: qtyToAdd,
        price: product.price
      });
    }

    // 5. Recalcular total del carrito
    await recalculateCartTotal(cart);

    res.redirect('/cart?success=Se añadió el repuesto al carrito con éxito.');
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    res.redirect('/dashboard?error=Error interno al agregar el repuesto.');
  }
};

/**
 * Modifica la cantidad de un artículo en el carrito
 */
exports.updateCartItem = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const newQty = parseInt(quantity);

  if (isNaN(newQty) || newQty < 1) {
    return res.redirect('/cart?error=La cantidad debe ser un número mayor o igual a 1.');
  }

  try {
    const cartItem = await CartItem.findByPk(id, {
      include: [{ model: Product, as: 'product' }, { model: Cart, as: 'cart' }]
    });

    if (!cartItem) {
      return res.redirect('/cart?error=No se encontró el artículo en el carrito.');
    }

    // Validar stock disponible
    if (newQty > cartItem.product.stock) {
      return res.redirect(`/cart?error=No es posible asignar ${newQty} unidades. Stock máximo disponible: ${cartItem.product.stock}.`);
    }

    cartItem.quantity = newQty;
    // Congelar precio al actual del catálogo
    cartItem.price = cartItem.product.price;
    await cartItem.save();

    // Recalcular total del carrito
    await recalculateCartTotal(cartItem.cart);

    res.redirect('/cart?success=Cantidad actualizada.');
  } catch (error) {
    console.error('Error al actualizar artículo del carrito:', error);
    res.redirect('/cart?error=Error al actualizar la cantidad.');
  }
};

/**
 * Elimina un artículo del carrito de compras
 */
exports.removeFromCart = async (req, res) => {
  const { id } = req.params;

  try {
    const cartItem = await CartItem.findByPk(id, {
      include: [{ model: Cart, as: 'cart' }]
    });

    if (!cartItem) {
      return res.redirect('/cart?error=No se encontró el artículo.');
    }

    const cart = cartItem.cart;
    await cartItem.destroy();

    // Recalcular total
    await recalculateCartTotal(cart);

    res.redirect('/cart?success=Repuesto removido del carrito.');
  } catch (error) {
    console.error('Error al eliminar artículo del carrito:', error);
    res.redirect('/cart?error=Error al remover el repuesto.');
  }
};

/**
 * Realiza el Checkout / Finalización de la Compra (Operación Transaccional)
 */
exports.checkout = async (req, res) => {
  const userId = req.session.user.id;

  try {
    // Ejecutar todo el proceso en una transacción controlada de base de datos
    await sequelize.transaction(async (t) => {
      // 1. Buscar carrito activo con sus artículos y productos
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

      // 2. Procesar y validar stock de cada producto
      for (const item of cart.items) {
        const product = item.product;

        // Comprobación de stock físico
        if (item.quantity > product.stock) {
          throw new Error(`Stock insuficiente para "${product.name}". Solicitado: ${item.quantity}, Disponible: ${product.stock}`);
        }

        // Deducir stock
        product.stock -= item.quantity;
        await product.save({ transaction: t });

        // Congelar precio en la transacción por consistencia histórica
        item.price = product.price;
        await item.save({ transaction: t });
      }

      // 3. Completar compra del carrito
      cart.status = 'completed';
      await cart.save({ transaction: t });

      // 4. Crear un nuevo carrito activo vacío para el usuario
      await Cart.create({
        userId,
        status: 'active',
        total: 0.00
      }, { transaction: t });
    });

    res.redirect('/cart?success=¡Compra finalizada con éxito! Su pedido de repuestos ha sido procesado.');
  } catch (error) {
    console.error('Error en proceso de Checkout transaccional:', error.message);
    res.redirect(`/cart?error=${encodeURIComponent(error.message || 'Error al procesar la compra.')}`);
  }
};
