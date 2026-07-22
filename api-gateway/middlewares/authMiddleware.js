const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // En WebSockets (Socket.io) el token a veces viene en la query, 
  // pero el proxy-middleware lo intercepta a nivel HTTP Upgrade.
  // Buscaremos el token en el Header Authorization o en req.query.token
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    // Verificamos el token usando la misma clave que el Auth Service
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_jwt_key_for_auth_service');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
