require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize, connectDB } = require('./config/db');
const inventoryRoutes = require('./routes/inventoryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

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


// Montamos las rutas (El API Gateway enrutará a /api/inventory, por lo que aquí podemos recibir /)
app.use('/', inventoryRoutes);

const startServer = async () => {
  await connectDB();
  
  await sequelize.sync(); 
  console.log('✅ Inventory Models synchronized with PostgreSQL DB');

  app.listen(PORT, () => {
    console.log(`📦 Inventory Service running on port ${PORT}`);
  });
};

startServer();
