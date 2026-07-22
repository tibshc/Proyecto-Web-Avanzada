require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize, connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.get('/health/live', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));
app.get('/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready', service: 'auth-service' });
  } catch {
    res.status(503).json({ status: 'not-ready', service: 'auth-service' });
  }
});

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


// Rutas (El API Gateway enrutará a /auth, por lo que aquí podemos recibir /)
app.use('/', authRoutes);

// Conectar a DB y arrancar servidor
const startServer = async () => {
  await connectDB();
  
  // Sincronizar modelos con la DB
  await sequelize.sync(); // Usar { force: true } solo en desarrollo para reiniciar tablas
  console.log('✅ Auth Models synchronized with PostgreSQL DB');

  app.listen(PORT, () => {
    console.log(`🔐 Auth Service running on port ${PORT}`);
  });
};

startServer();
