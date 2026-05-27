const { Product } = require('../models');

const PRODUCTS_PER_PAGE = 8;
const VALID_CATEGORIES = ['chasis', 'motor', 'frenos', 'otros'];

/**
 * Helper: Calcula estadísticas del inventario completo para admin y support.
 */
const computeStats = async () => {
  const allProducts = await Product.findAll({
    attributes: ['price', 'stock', 'category']
  });

  const totalValue = allProducts.reduce(
    (sum, p) => sum + parseFloat(p.price) * p.stock,
    0
  );

  return {
    total: allProducts.length,
    lowStock: allProducts.filter(p => p.stock > 0 && p.stock <= 5).length,
    outOfStock: allProducts.filter(p => p.stock === 0).length,
    totalValue: totalValue.toFixed(2),
    byCategory: {
      chasis: allProducts.filter(p => p.category === 'chasis').length,
      motor: allProducts.filter(p => p.category === 'motor').length,
      frenos: allProducts.filter(p => p.category === 'frenos').length,
      otros: allProducts.filter(p => p.category === 'otros').length
    }
  };
};

/**
 * Obtiene los repuestos (paginados y filtrados por categoría) y renderiza el Dashboard.
 * Soporta: ?page=N, ?category=X, ?error=msg, ?success=msg
 */
exports.getAllProducts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const category = req.query.category || null;
  const activeCategory = VALID_CATEGORIES.includes(category) ? category : null;

  const where = {};
  if (activeCategory) {
    where.category = activeCategory;
  }

  try {
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: PRODUCTS_PER_PAGE,
      offset: (page - 1) * PRODUCTS_PER_PAGE
    });

    const totalPages = Math.max(1, Math.ceil(count / PRODUCTS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    // Estadísticas solo para roles privilegiados
    let stats = null;
    const { role } = req.session.user;
    if (role === 'admin' || role === 'support') {
      stats = await computeStats();
    }

    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products,
      user: req.session.user,
      error: req.query.error || null,
      success: req.query.success || null,
      currentPage,
      totalPages,
      totalCount: count,
      currentCategory: activeCategory,
      stats
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products: [],
      user: req.session.user,
      error: 'Error al cargar el inventario de repuestos.',
      success: null,
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      currentCategory: null,
      stats: null
    });
  }
};

/**
 * Crea un nuevo repuesto con validación estricta de tipos numéricos.
 */
exports.createProduct = async (req, res) => {
  const {
    sku, name, category, brand, compatibility,
    torque_nm, dimensions, weight_kg,
    durabilityKm, stock, price
  } = req.body;

  // Validación estricta antes de procesar
  const parsedStock = parseInt(stock, 10);
  const parsedPrice = parseFloat(price);
  const parsedDurability = parseInt(durabilityKm, 10);

  if (isNaN(parsedStock) || parsedStock < 0) {
    return res.redirect('/dashboard?error=' + encodeURIComponent('El stock debe ser un número entero no negativo.'));
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.redirect('/dashboard?error=' + encodeURIComponent('El precio debe ser un valor numérico positivo.'));
  }

  try {
    await Product.create({
      sku,
      name,
      category,
      brand,
      compatibility,
      technicalSpecs: {
        torque_nm: torque_nm || 'N/A',
        dimensions: dimensions || 'N/A',
        weight_kg: weight_kg || 'N/A'
      },
      durabilityKm: isNaN(parsedDurability) ? 100000 : parsedDurability,
      stock: parsedStock,
      price: parsedPrice
    });

    res.redirect('/dashboard?success=' + encodeURIComponent('Repuesto registrado con éxito en el catálogo.'));
  } catch (error) {
    console.error('Error al crear repuesto:', error);
    let errorMessage = 'Error al registrar el repuesto.';
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }
    res.redirect('/dashboard?error=' + encodeURIComponent(errorMessage));
  }
};

/**
 * Actualiza un repuesto existente con validación estricta de tipos numéricos.
 */
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name, category, brand, compatibility,
    torque_nm, dimensions, weight_kg,
    durabilityKm, stock, price
  } = req.body;

  const parsedStock = parseInt(stock, 10);
  const parsedPrice = parseFloat(price);
  const parsedDurability = parseInt(durabilityKm, 10);

  if (isNaN(parsedStock) || parsedStock < 0) {
    return res.redirect('/dashboard?error=' + encodeURIComponent('El stock debe ser un número entero no negativo.'));
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.redirect('/dashboard?error=' + encodeURIComponent('El precio debe ser un valor numérico positivo.'));
  }

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.redirect('/dashboard?error=' + encodeURIComponent('Repuesto no encontrado.'));
    }

    product.name = name;
    product.category = category;
    product.brand = brand;
    product.compatibility = compatibility;
    product.durabilityKm = isNaN(parsedDurability) ? product.durabilityKm : parsedDurability;
    product.stock = parsedStock;
    product.price = parsedPrice;
    product.technicalSpecs = {
      torque_nm: torque_nm || 'N/A',
      dimensions: dimensions || 'N/A',
      weight_kg: weight_kg || 'N/A'
    };

    await product.save();
    res.redirect('/dashboard?success=' + encodeURIComponent('Repuesto actualizado correctamente.'));
  } catch (error) {
    console.error('Error al actualizar repuesto:', error);
    let errorMessage = 'Error al actualizar el repuesto.';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }
    res.redirect('/dashboard?error=' + encodeURIComponent(errorMessage));
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
      return res.redirect('/dashboard?error=' + encodeURIComponent('Repuesto no encontrado.'));
    }

    await product.destroy();
    res.redirect('/dashboard?success=' + encodeURIComponent('Repuesto eliminado del catálogo con éxito.'));
  } catch (error) {
    console.error('Error al eliminar repuesto:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Error al eliminar el repuesto del catálogo.'));
  }
};
