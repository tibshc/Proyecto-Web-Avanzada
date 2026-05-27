/**
 * authMiddleware.js
 * Middlewares de autenticación y autorización para el sistema de repuestos.
 *
 * Pilares aplicados:
 *  - SECURITY (STRIDE): Spoofing → isAuthenticated evita acceso sin sesión.
 *  - SECURITY (STRIDE): Elevation of Privilege → authorizeRoles usa redirect en
 *    lugar de renderizar dashboard con estado vacío (previa vulnerabilidad).
 *  - SECURITY (STRIDE): Elevation of Privilege → ensureCartItemOwnership previene
 *    IDOR (Insecure Direct Object Reference): usuario A no puede modificar carrito B.
 *  - PERFORMANCE: ensureCartItemOwnership hace UN solo findByPk con includes y
 *    almacena en req.cartItem — los controladores lo reutilizan sin segunda consulta.
 *  - SOLID (SRP): cada middleware tiene una única responsabilidad.
 */

/**
 * Verifica que el usuario tenga una sesión activa.
 * Si no, redirige al login sin exponer la ruta intentada.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.session?.user) return next();
  res.redirect('/auth/login');
};

/**
 * RBAC: restringe acceso a roles específicos.
 * Fix de seguridad: reemplaza el render de dashboard con products:[] vacío
 * por un redirect con mensaje. Evita romper la vista EJS que espera
 * variables de paginación (currentPage, totalPages, stats, etc.).
 *
 * @param {string[]} roles - Lista de roles permitidos (whitelist).
 */
exports.authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.session?.user || !roles.includes(req.session.user.role)) {
      return res.status(403).redirect(
        '/dashboard?error=' + encodeURIComponent('No tiene permisos para realizar esta acción.')
      );
    }
    next();
  };
};

/**
 * IDOR Protection: verifica que el CartItem pertenece al carrito del usuario en sesión.
 *
 * Problema anterior: POST /cart/update/:id y /cart/remove/:id tomaban el :id
 * directamente sin verificar propiedad → usuario A podía manipular carrito de B
 * con solo conocer el UUID del CartItem.
 *
 * Solución (PERFORMANCE + SECURITY):
 *  1. Un solo findByPk con includes (Cart + Product) para verificar propiedad.
 *  2. El item cargado se pasa como req.cartItem → los controladores lo reutilizan
 *     sin hacer una segunda consulta a la DB (elimina N+1 en update y remove).
 *
 * @sets {CartItem} req.cartItem - El item verificado con Cart y Product asociados.
 */
exports.ensureCartItemOwnership = async (req, res, next) => {
  const { CartItem, Cart, Product } = require('../models');
  const { id } = req.params;
  const userId = req.session?.user?.id;

  if (!id || !userId) {
    // BUG 4 FIX: usar req.flash() en lugar de ?error= en la URL
    req.flash('error', 'Solicitud no válida.');
    return res.redirect('/cart');
  }

  try {
    const item = await CartItem.findByPk(id, {
      include: [
        { model: Cart,    as: 'cart'    }, // Necesario para verificar propiedad y recalcular total
        { model: Product, as: 'product' }  // Necesario para validar stock en updateCartItem
      ]
    });

    if (!item) {
      req.flash('error', 'Artículo no encontrado.');
      return res.redirect('/cart');
    }

    // IDOR check: el carrito del item debe pertenecer al usuario autenticado
    if (item.cart.userId !== userId) {
      // Log de intento sospechoso para auditoría (STRIDE - Repudiation)
      console.warn(`[SECURITY] Intento de IDOR bloqueado: user=${userId} intentó acceder a cartItem=${id} de user=${item.cart.userId}`);
      req.flash('error', 'Acceso no autorizado.');
      return res.redirect('/cart');
    }

    req.cartItem = item; // Pasar al siguiente middleware/controlador sin re-query
    next();
  } catch (err) {
    console.error('Error en ensureCartItemOwnership:', err);
    req.flash('error', 'Error al verificar el artículo.');
    res.redirect('/cart');
  }
};
