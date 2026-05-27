/**
 * flashMiddleware.js
 *
 * Implementa mensajes flash almacenados en sesión en lugar de query params en la URL.
 *
 * Ventajas sobre ?error=... en la URL:
 *  - Los mensajes no aparecen en la barra de dirección (no se expone info al usuario).
 *  - No se pueden manipular ni repetir recargando la página (POST-Redirect-GET seguro).
 *  - Desaparecen automáticamente tras el primer render (consumo único).
 *
 * Uso en controladores:
 *   req.flash('success', 'Operación exitosa.');
 *   req.flash('error', 'Algo salió mal.');
 *   res.redirect('/dashboard');
 *
 * En las vistas (vía res.locals inyectados por este middleware):
 *   <%= locals.success %>
 *   <%= locals.error %>
 */

/**
 * Inicializa req.flash() y vuelca los mensajes pendientes a res.locals
 * para que estén disponibles en el render actual (consumo único).
 */
exports.flashMiddleware = (req, res, next) => {
  // Inicializar el store de flash en sesión si no existe
  if (!req.session.flash) {
    req.session.flash = {};
  }

  /**
   * Escribe un mensaje flash en la sesión.
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {string} message
   */
  req.flash = (type, message) => {
    if (!req.session.flash) req.session.flash = {};
    req.session.flash[type] = message;
  };

  // BUG 3 FIX: Capturar snapshot de los mensajes pendientes ANTES de limpiar.
  // Se clona el objeto para no perder mensajes escritos en este mismo request.
  const pending = { ...req.session.flash };

  // Exponer en res.locals (disponibles en la vista del siguiente render)
  res.locals.success = pending.success || null;
  res.locals.error   = pending.error   || null;
  res.locals.info    = pending.info    || null;

  // Limpiar solo los mensajes que fueron consumidos (no los nuevos del request actual)
  delete req.session.flash.success;
  delete req.session.flash.error;
  delete req.session.flash.info;

  next();
};