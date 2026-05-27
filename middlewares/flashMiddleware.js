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

  // Consumir y exponer en res.locals (disponibles en la vista del siguiente render)
  const pending = req.session.flash || {};
  res.locals.success = pending.success || null;
  res.locals.error   = pending.error   || null;
  res.locals.info    = pending.info    || null;

  // Limpiar flash de la sesión tras consumir (son de un solo uso)
  req.session.flash = {};

  next();
};