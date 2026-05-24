const express = require('express');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('./models');
require('dotenv').config();

// Importación de Rutas
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// 1. Configuración del Motor de Plantillas (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 2. Middlewares de Lectura y Archivos Estáticos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 3. Configuración de Sesiones Seguras con Almacenamiento en PostgreSQL
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'Sessions', // Tabla donde Sequelize guardará las sesiones de usuario
  checkExpirationInterval: 15 * 60 * 1000, // Intervalo para limpiar sesiones expiradas (15 min)
  expiration: 24 * 60 * 60 * 1000 // Tiempo de vida de la sesión (24 horas)
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret_128937',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true solo en https
    httpOnly: true, // Protege contra vulnerabilidades XSS
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Sincronizar el almacenamiento de sesiones en la DB
sessionStore.sync();

// Middleware Global para pasar variables locales a todas las vistas EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// 4. Definición y Montaje de Rutas
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/chat', chatRoutes);

// Ruta Raíz: Redirige automáticamente al panel principal
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Manejo de Error 404 (No Encontrado)
app.use((req, res, next) => {
  res.status(404).render('login', {
    title: 'Página no Encontrada',
    error: 'La ruta solicitada no existe o no tiene permisos de acceso.',
    success: null
  });
});

// Manejo de Errores Globales del Servidor
app.use((err, req, res, next) => {
  console.error('Error no controlado en la aplicación:', err.stack);
  res.status(500).send('Hubo un error interno en el servidor. Por favor, contacte a soporte técnico.');
});

module.exports = app;
