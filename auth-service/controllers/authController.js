const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Name, valid email and password of at least 6 characters are required' });
    }

    // Verificar si el usuario existe
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hashear password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'mechanic'
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const me = async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: ['id', 'name', 'email', 'role'] });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar si el usuario existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verificar password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generar JWT
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// ============================================================
// RESETEO SEGURO DE CONTRASEÑA (2 PASOS)
// ============================================================
// Paso 1: Solicitar token (forgot-password)
// Paso 2: Usar token para cambiar contraseña (reset-password)

/**
 * Paso 1 — Solicitar restablecimiento de contraseña
 * 
 * Genera un token único y lo guarda en la BD con expiración de 1 hora.
 * En producción, este token se enviaría por email.
 * Por seguridad, la respuesta es idéntica exista o no el email.
 * 
 * Ruta: POST /auth/forgot-password
 * Body: { email: string }
 */
const forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es obligatorio.' });
    }

    const user = await User.findOne({ where: { email } });

    if (user) {
      // Generar token seguro aleatorio de 32 bytes → 64 caracteres hex
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Expira en 1 hora
      const resetTokenExpiry = new Date(Date.now() + 3600000);

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      await user.save();

      // ⚠️ En producción esto se enviaría por email.
      // Para el proyecto, devolvemos el token en la respuesta
      // para que se pueda probar el flujo completo.
      console.log(`🔐 Token de restablecimiento para ${email}: ${resetToken}`);
    }

    // Respuesta genérica — no revela si el email existe o no
    return res.json({
      message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      // En desarrollo devolvemos el token para pruebas
      ...(process.env.NODE_ENV !== 'production' && user ? { resetToken: user.resetToken } : {})
    });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * Paso 2 — Restablecer contraseña usando token
 * 
 * Verifica que el token sea válido y no haya expirado,
 * luego actualiza la contraseña y limpia el token.
 * 
 * Ruta: POST /auth/reset-password
 * Body: { token: string, newPassword: string }
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token de restablecimiento requerido.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    // Buscar usuario con token válido y no expirado
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'El token es inválido o ha expirado. Solicita uno nuevo.' });
    }

    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword
};
