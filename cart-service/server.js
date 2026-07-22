require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const promBundle = require('express-prom-bundle');
const { sequelize } = require('./models');
const { connectDB } = require('./config/db');
const cartRoutes = require('./routes/cartRoutes');

const app = express();
const PORT = process.env.PORT || 7000;
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(promBundle({ includeMethod: true, includePath: true, promClient: { collectDefaultMetrics: {} } }));
app.get('/health/live', (req, res) => res.json({ status: 'ok', service: 'cart-service' }));
app.get('/health/ready', async (req, res) => {
  try { await sequelize.authenticate(); res.json({ status: 'ready', service: 'cart-service' }); }
  catch { res.status(503).json({ status: 'not-ready', service: 'cart-service' }); }
});
app.use('/', cartRoutes);

(async () => {
  await connectDB();
  await sequelize.sync();
  app.listen(PORT, () => console.log(`Cart Service running on port ${PORT}`));
})().catch((error) => { console.error('Cart service startup failed', error); process.exit(1); });
