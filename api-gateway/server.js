require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authMiddleware = require('./middlewares/authMiddleware');
const promBundle = require('express-prom-bundle');

const app = express();
const PORT = process.env.PORT || 3000;
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:5000',
  chat: process.env.CHAT_SERVICE_URL || 'http://localhost:6000',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:7000'
};

app.use(cors());
app.use(morgan('dev'));
app.use(promBundle({ includeMethod: true, includePath: true, promClient: { collectDefaultMetrics: {} } }));
app.get('/health/live', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

const proxyOptions = (target, message, pathRewrite) => ({
  target,
  changeOrigin: true,
  ...(pathRewrite ? { pathRewrite } : {}),
  onError: (err, req, res) => res.status(502).json({ message })
});

app.use('/auth', createProxyMiddleware(proxyOptions(services.auth, 'Auth Service unavailable.')));
app.use('/api/inventory', authMiddleware, createProxyMiddleware(proxyOptions(
  services.inventory,
  'Inventory Service unavailable.',
  { '^/api/inventory': '/' }
)));

const chatProxy = createProxyMiddleware({
  ...proxyOptions(services.chat, 'Chat Service unavailable.', { '^/api/chat': '/' }),
  ws: true
});
app.use('/api/chat', authMiddleware, chatProxy);

app.use('/api/cart', authMiddleware, createProxyMiddleware(proxyOptions(
  services.cart,
  'Cart Service unavailable.',
  { '^/api/cart': '/' }
)));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

const server = app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/api/chat')) chatProxy.upgrade(req, socket, head);
});
