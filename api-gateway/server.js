require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Configuración de Prometheus (Métricas)
const promBundle = require('express-prom-bundle');
const metricsMiddleware = promBundle({
  includeMethod: true, 
  includePath: true, 
  promClient: {
    collectDefaultMetrics: {}
  }
});
app.use(metricsMiddleware);


// Configuración de microservicios
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:5000',
  chat: process.env.CHAT_SERVICE_URL || 'http://localhost:6000',
  monolith: process.env.MONOLITH_URL || 'http://localhost:3001',
};

// Rutas Proxy para Auth Service (Público)
app.use('/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: { '^/auth': '/auth' },
  onError: (err, req, res) => res.status(500).json({ message: 'Auth Service unavailable.' })
}));

// Rutas Proxy para Inventory Service (Protegido con JWT)
app.use('/api/inventory', authMiddleware, createProxyMiddleware({
  target: services.inventory,
  changeOrigin: true,
  pathRewrite: { '^/api/inventory': '/' },
  onError: (err, req, res) => res.status(500).json({ message: 'Inventory Service unavailable.' })
}));

// Rutas Proxy para Chat Service (Protegido con JWT y soporte WebSocket)
app.use('/api/chat', authMiddleware, createProxyMiddleware({
  target: services.chat,
  changeOrigin: true,
  ws: true, // Habilitar proxy para WebSockets
  pathRewrite: { '^/api/chat': '/' },
  onError: (err, req, res) => res.status(500).json({ message: 'Chat Service unavailable.' })
}));

// Proxy genérico para las demás rutas al Monolito Legado
app.use('/', createProxyMiddleware({
  target: services.monolith,
  changeOrigin: true,
  onError: (err, req, res) => res.status(500).json({ message: 'Monolith service unavailable.' })
}));

// Servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});

// Importante: Escuchar el evento 'upgrade' en el servidor HTTP para pasar las conexiones WS al proxy
server.on('upgrade', (req, socket, head) => {
  // El proxy-middleware interceptará automáticamente si matchean la ruta
});
