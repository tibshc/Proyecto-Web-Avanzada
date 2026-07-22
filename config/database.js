const { Sequelize } = require('sequelize');
require('dotenv').config();

// Inicialización de Sequelize con las variables de entorno de PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'repuestos_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true, // Agrega de forma automática createdAt y updatedAt
      underscored: true // Convierte camelCase a snake_case en las columnas de la DB
    }
  }
);

// Función auxiliar para verificar la conexión a la base de datos
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida con éxito a la base de datos PostgreSQL.');
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error.message);
    throw error; // BUG 1 FIX: re-lanzar para que server.js pueda hacer process.exit(1)
  }
};

module.exports = {
  sequelize,
  testConnection
};
