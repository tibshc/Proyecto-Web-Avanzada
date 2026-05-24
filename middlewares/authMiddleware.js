/**
 * Middleware para asegurar que el usuario ha iniciado sesión.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

/**
 * Middleware para restringir acceso según el rol del usuario.
 * @param {Array<string>} roles - Lista de roles permitidos.
 */
exports.authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).render('dashboard', {
        title: 'Acceso Denegado',
        products: [],
        user: req.session.user || null,
        error: 'No tiene permisos suficientes para realizar esta acción.',
        success: null
      });
    }
    next();
  };
};
