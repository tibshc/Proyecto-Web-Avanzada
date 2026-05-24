/**
 * Renderiza la sala de chat en tiempo real.
 */
exports.getChat = (req, res) => {
  res.render('chat', {
    title: 'Soporte Técnico - Consultas de Compatibilidad',
    user: req.session.user
  });
};
