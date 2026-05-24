const { Product } = require('../models');

/**
 * Obtiene todos los repuestos y renderiza el Dashboard.
 */
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['created_at', 'DESC']] });
    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products,
      user: req.session.user,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products: [],
      user: req.session.user,
      error: 'Error al cargar el inventario de repuestos.',
      success: null
    });
  }
};

/**
 * Crea un nuevo repuesto.
 */
exports.createProduct = async (req, res) => {
  const {
    sku,
    name,
    category,
    brand,
    compatibility,
    torque_nm,
    dimensions,
    weight_kg,
    durabilityKm,
    stock,
    price
  } = req.body;

  // Estructurar especificaciones técnicas en formato JSON
  const technicalSpecs = {
    torque_nm: torque_nm || 'N/A',
    dimensions: dimensions || 'N/A',
    weight_kg: weight_kg || 'N/A'
  };

  try {
    await Product.create({
      sku,
      name,
      category,
      brand,
      compatibility,
      technicalSpecs,
      durabilityKm: parseInt(durabilityKm) || 100000,
      stock: parseInt(stock) || 0,
      price: parseFloat(price) || 0.00
    });

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al crear repuesto:', error);
    const products = await Product.findAll({ order: [['created_at', 'DESC']] });
    let errorMessage = 'Error al registrar el repuesto.';
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }

    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products,
      user: req.session.user,
      error: errorMessage,
      success: null
    });
  }
};

/**
 * Actualiza un repuesto existente.
 */
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    category,
    brand,
    compatibility,
    torque_nm,
    dimensions,
    weight_kg,
    durabilityKm,
    stock,
    price
  } = req.body;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).send('Repuesto no encontrado');
    }

    // Actualizar campos
    product.name = name;
    product.category = category;
    product.brand = brand;
    product.compatibility = compatibility;
    product.durabilityKm = parseInt(durabilityKm) || product.durabilityKm;
    product.stock = parseInt(stock) || 0;
    product.price = parseFloat(price) || 0.00;

    // Actualizar JSON de especificaciones
    product.technicalSpecs = {
      torque_nm: torque_nm || 'N/A',
      dimensions: dimensions || 'N/A',
      weight_kg: weight_kg || 'N/A'
    };

    await product.save();
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al actualizar repuesto:', error);
    const products = await Product.findAll({ order: [['created_at', 'DESC']] });
    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products,
      user: req.session.user,
      error: 'Error al actualizar el repuesto.',
      success: null
    });
  }
};

/**
 * Elimina un repuesto del inventario.
 */
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).send('Repuesto no encontrado');
    }

    await product.destroy();
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al eliminar repuesto:', error);
    const products = await Product.findAll({ order: [['created_at', 'DESC']] });
    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products,
      user: req.session.user,
      error: 'Error al eliminar el repuesto del catálogo.',
      success: null
    });
  }
};
