const { User } = require('../models');

/**
 * Muestra la vista de inicio de sesión.
 */
exports.getLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Iniciar Sesión', error: null, success: null });
};

/**
 * Procesa el inicio de sesión.
 */
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.render('login', {
        title: 'Iniciar Sesión',
        error: 'El correo electrónico o la contraseña son incorrectos.',
        success: null
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', {
        title: 'Iniciar Sesión',
        error: 'El correo electrónico o la contraseña son incorrectos.',
        success: null
      });
    }

    // Guardar información del usuario en la sesión
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    req.session.save((err) => {
      if (err) {
        console.error('Error al guardar la sesión:', err);
        return res.render('login', {
          title: 'Iniciar Sesión',
          error: 'Error interno en el servidor.',
          success: null
        });
      }
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Error en postLogin:', error);
    res.render('login', {
      title: 'Iniciar Sesión',
      error: 'Ocurrió un error al intentar iniciar sesión. Inténtelo de nuevo.',
      success: null
    });
  }
};

/**
 * Muestra la vista de registro.
 */
exports.getRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Registro de Usuario', error: null });
};

/**
 * Procesa el registro de nuevos usuarios (mecánicos o soporte técnico).
 */
exports.postRegister = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Validar si el rol es válido
    if (!['mechanic', 'support'].includes(role)) {
      return res.render('register', {
        title: 'Registro de Usuario',
        error: 'El rol seleccionado no es válido. Debe elegir entre Mecánico o Soporte Técnico.'
      });
    }

    await User.create({
      name,
      email,
      password,
      role
    });

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
    res.render('register', {
      title: 'Registro de Usuario',
      error: errorMessage
    });
  }
};

/**
 * Muestra la vista de recuperación de contraseña.
 */
exports.getResetPassword = (req, res) => {
  res.render('reset-password', { title: 'Recuperar Contraseña', error: null, success: null });
};

/**
 * Simula el envío de correo o procesa el cambio de contraseña.
 */
exports.postResetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.render('reset-password', {
        title: 'Recuperar Contraseña',
        error: 'No se encontró ninguna cuenta registrada con este correo electrónico.',
        success: null
      });
    }

    // Actualizar la contraseña del usuario (se encripta en el hook beforeSave)
    user.password = newPassword;
    await user.save();

    res.render('login', {
      title: 'Iniciar Sesión',
      error: null,
      success: 'Su contraseña ha sido actualizada con éxito. Inicie sesión con sus nuevas credenciales.'
    });
  } catch (error) {
    console.error('Error en postResetPassword:', error);
    let errorMessage = 'Error al restablecer la contraseña.';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }
    res.render('reset-password', {
      title: 'Recuperar Contraseña',
      error: errorMessage,
      success: null
    });
  }
};

/**
 * Cierra la sesión del usuario.
 */
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al destruir la sesión:', err);
    }
    res.redirect('/auth/login');
  });
};
