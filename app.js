const express = require('express');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize, Cart, CartItem } = require('./models');
require('dotenv').config();

// Importación de Rutas
const authRoutes      = require('./routes/auth');
const dashboardRoutes = require('./routes/product');
const chatRoutes      = require('./routes/chatRoutes');
const cartRoutes      = require('./routes/cart');

const app = express();

// ============================================================
// SECURITY: Hardening de headers HTTP (sin dependencia externa)
// STRIDE → Information Disclosure, XSS, Clickjacking
// ============================================================
app.use((req, res, next) => {
  // Evitar exponer el stack tecnológico (STRIDE - Info Disclosure)
  res.removeHeader('X-Powered-By');

  // Prevenir MIME-sniffing de respuestas
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Bloquear embebido en iframes de terceros (Clickjacking)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Protección XSS legacy para navegadores antiguos
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Controlar información en la cabecera Referer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Deshabilitar acceso a hardware innecesario
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CSP: whitelist de orígenes usados en el proyecto (Tailwind CDN, Unpkg, Google Fonts)
  // 'unsafe-inline' requerido por el CDN de Tailwind y scripts inline de EJS
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
  ].join('; '));

  next();
});

// 1. Configuración del Motor de Plantillas (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 2. Middlewares de Lectura y Archivos Estáticos
// SECURITY: Limitar tamaño del body para prevenir ataques de payload grande (DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 3. Configuración de Sesiones Seguras con Almacenamiento en PostgreSQL
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'Sessions',
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret_128937',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  // SECURITY: Renombrar cookie evita fingerprinting del stack (STRIDE - Info Disclosure)
  name: 'sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // Inaccesible desde JavaScript (STRIDE - Tampering/XSS)
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax' // CSRF mitigation: bloquea envío en peticiones cross-site
  }
}));

sessionStore.sync();

// ============================================================
// PERFORMANCE: Middleware de cart count con caché en sesión
//
// Problema anterior: O(n_requests × 1 DB_query) — cada petición
// de página disparaba 2 queries a PostgreSQL (findOne + sum).
//
// Solución: almacenar el count en req.session.cartCountCache.
// Complejidad: O(1) en cache-hit. Solo hay miss en el primer
// request post-login o tras invalidación explícita en operaciones
// de carrito (add/update/remove/checkout).
//
// Trade-off: el count podría estar desactualizado si el mismo
// usuario actúa desde dos pestañas simultáneas, pero es
// aceptable para este contexto de taller/flota.
// ============================================================
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;

  if (!req.session?.user) {
    res.locals.cartCount = 0;
    return next();
  }

  // Cache hit: evitar round-trip a la DB
  if (typeof req.session.cartCountCache === 'number') {
    res.locals.cartCount = req.session.cartCountCache;
    return next();
  }

  // Cache miss: consultar DB y persistir resultado en sesión
  try {
    const activeCart = await Cart.findOne({
      where: { userId: req.session.user.id, status: 'active' },
      attributes: ['id']
    });

    const count = activeCart
      ? (await CartItem.sum('quantity', { where: { cartId: activeCart.id } }) || 0)
      : 0;

    req.session.cartCountCache = count;
    res.locals.cartCount = count;
  } catch (err) {
    console.error('Error al calcular cantidad del carrito en middleware:', err);
    res.locals.cartCount = 0;
  }

  next();
});

// 4. Definición y Montaje de Rutas
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/chat', chatRoutes);
app.use('/cart', cartRoutes);

// Ruta Raíz
app.get('/', (req, res) => res.redirect('/dashboard'));

// 404 — responde JSON en peticiones de API, HTML en el resto
app.use((req, res) => {
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(404).json({ error: 'Ruta no encontrada.' });
  }
  res.status(404).render('login', {
    title: '404 — Página No Encontrada',
    error: 'La ruta solicitada no existe. Inicie sesión para acceder al sistema.',
    success: null
  });
});

// Error handler global (siempre debe tener 4 parámetros para que Express lo reconozca)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Error no controlado:', err.stack);
  res.status(500).send('Error interno del servidor. Contacte a soporte técnico.');
});

module.exports = app;
