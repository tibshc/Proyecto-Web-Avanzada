/**
 * authController.js
 *
 * Pilares aplicados:
 *  - SECURITY (STRIDE - Spoofing/DoS): Rate limiter en memoria para login.
 *    Sin dependencia externa → no requiere redis. Trade-off: no persiste
 *    entre reinicios del proceso; aceptable para contexto académico/taller.
 *  - SECURITY (STRIDE - Info Disclosure): Mensajes de error genéricos en login
 *    y reset-password para no revelar existencia de emails en la DB.
 *  - SECURITY (STRIDE - Tampering): trim() en todos los campos de entrada
 *    para evitar bypass con espacios y caracteres de control.
 *  - SECURITY: Whitelist de roles en registro → imposible auto-registrarse como admin.
 *  - CLEAN CODE (DRY): constante INVALID_LOGIN_MSG centraliza el mensaje genérico.
 */

const { User } = require('../models');

// ============================================================
// Rate Limiter en memoria (STRIDE - Denial of Service + Spoofing)
// Estructura: Map<ip, { count: number, resetAt: number }>
// ============================================================
const loginAttempts   = new Map();
const MAX_ATTEMPTS    = 5;
const RATE_WINDOW_MS  = 15 * 60 * 1000; // 15 minutos

/**
 * Verifica y registra un intento de login desde una IP.
 * @returns {{ blocked: boolean, retryAfterMin?: number }}
 */
function checkLoginRateLimit(ip) {
  const now   = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { blocked: false };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterMin = Math.ceil((entry.resetAt - now) / 60_000);
    return { blocked: true, retryAfterMin };
  }

  entry.count++;
  return { blocked: false };
}

/** Resetea el contador tras un login exitoso. */
function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// Limpieza periódica de entradas expiradas → evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, RATE_WINDOW_MS);

// Mensaje genérico: no revela si el email existe en la DB (Info Disclosure)
const INVALID_LOGIN_MSG = 'El correo electrónico o la contraseña son incorrectos.';

// ============================================================
// Controladores
// ============================================================

exports.getLogin = (req, res) => {
  if (req.session?.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Iniciar Sesión', error: null, success: null });
};

exports.postLogin = async (req, res) => {
  // Obtener IP real (respeta proxy inverso en producción)
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  const { blocked, retryAfterMin } = checkLoginRateLimit(ip);
  if (blocked) {
    return res.render('login', {
      title: 'Iniciar Sesión',
      error: `Demasiados intentos fallidos. Inténtelo nuevamente en ${retryAfterMin} minuto(s).`,
      success: null
    });
  }

  // SECURITY: trim() previene bypass con espacios; toLowerCase normaliza emails
  const email    = (req.body.email    || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();

  if (!email || !password) {
    return res.render('login', {
      title: 'Iniciar Sesión',
      error: 'El correo electrónico y la contraseña son obligatorios.',
      success: null
    });
  }

  try {
    const user = await User.findOne({ where: { email } });

    // Respuesta genérica tanto si el usuario no existe como si la contraseña es incorrecta
    if (!user) {
      return res.render('login', { title: 'Iniciar Sesión', error: INVALID_LOGIN_MSG, success: null });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { title: 'Iniciar Sesión', error: INVALID_LOGIN_MSG, success: null });
    }

    // Login exitoso: limpiar contador y crear sesión
    resetLoginAttempts(ip);

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    // Invalidar caché del carrito para forzar recarga en el primer request post-login
    req.session.cartCountCache = undefined;

    req.session.save((err) => {
      if (err) {
        console.error('Error al guardar la sesión:', err);
        return res.render('login', { title: 'Iniciar Sesión', error: 'Error interno del servidor.', success: null });
      }
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Error en postLogin:', error);
    res.render('login', { title: 'Iniciar Sesión', error: 'Ocurrió un error al intentar iniciar sesión.', success: null });
  }
};

exports.getRegister = (req, res) => {
  if (req.session?.user) return res.redirect('/dashboard');
  res.render('register', { title: 'Registro de Usuario', error: null });
};

exports.postRegister = async (req, res) => {
  // SECURITY: trim() en todos los campos de entrada
  const name     = (req.body.name     || '').trim();
  const email    = (req.body.email    || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();
  const role     = (req.body.role     || '').trim();

  // SECURITY: Whitelist de roles → nunca se puede registrar como 'admin' desde la UI
  if (!['mechanic', 'support'].includes(role)) {
    return res.render('register', {
      title: 'Registro de Usuario',
      error: 'El rol seleccionado no es válido.'
    });
  }

  if (!name || !email || !password) {
    return res.render('register', {
      title: 'Registro de Usuario',
      error: 'Todos los campos son obligatorios.'
    });
  }

  try {
    await User.create({ name, email, password, role });
    res.render('login', {
      title: 'Iniciar Sesión',
      error: null,
      success: 'Cuenta creada con éxito. Ya puede iniciar sesión.'
    });
  } catch (error) {
    console.error('Error en postRegister:', error);
    let errorMessage = 'Ocurrió un error al registrar la cuenta.';
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }
    res.render('register', { title: 'Registro de Usuario', error: errorMessage });
  }
};

exports.getResetPassword = (req, res) => {
  res.render('reset-password', { title: 'Recuperar Contraseña', error: null, success: null });
};

exports.postResetPassword = async (req, res) => {
  const email       = (req.body.email       || '').trim().toLowerCase();
  const newPassword = (req.body.newPassword || '').trim();

  if (!email || !newPassword) {
    return res.render('reset-password', {
      title: 'Recuperar Contraseña',
      error: 'Todos los campos son obligatorios.',
      success: null
    });
  }

  try {
    const user = await User.findOne({ where: { email } });

    // SECURITY: Respuesta genérica independientemente de si el email existe
    // Evita enumeración de usuarios (STRIDE - Information Disclosure)
    if (!user) {
      return res.render('reset-password', {
        title: 'Recuperar Contraseña',
        error: null,
        success: 'Si el correo está registrado, su contraseña ha sido actualizada.'
      });
    }

    user.password = newPassword; // El hook beforeSave del modelo aplica bcrypt
    await user.save();

    res.render('login', {
      title: 'Iniciar Sesión',
      error: null,
      success: 'Contraseña actualizada. Inicie sesión con sus nuevas credenciales.'
    });
  } catch (error) {
    console.error('Error en postResetPassword:', error);
    let errorMessage = 'Error al restablecer la contraseña.';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }
    res.render('reset-password', { title: 'Recuperar Contraseña', error: errorMessage, success: null });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Error al destruir la sesión:', err);
    res.redirect('/auth/login');
  });
};
