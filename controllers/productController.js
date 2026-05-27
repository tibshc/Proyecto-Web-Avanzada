const { Product } = require('../models');

const PRODUCTS_PER_PAGE = 8;
const VALID_CATEGORIES = ['chasis', 'motor', 'frenos', 'otros'];

/**
 * Helper: Calcula estadísticas del inventario en un único pase O(n).
 *
 * Problema anterior: O(1 reduce) + O(4 filter) + O(4 category filter) = 9 iteraciones
 * sobre el mismo array en memoria.
 * Solución: un solo reduce que acumula todos los contadores simultáneamente → O(n).
 * Ganancia estimada: ~6x menos iteraciones sobre el dataset.
 */
const computeStats = async () => {
  const allProducts = await Product.findAll({
    attributes: ['price', 'stock', 'category']
  });

  const stats = allProducts.reduce((acc, p) => {
    acc.total++;
    acc.totalValue += parseFloat(p.price) * p.stock;

    if      (p.stock === 0) acc.outOfStock++;
    else if (p.stock <= 5)  acc.lowStock++;

    // byCategory usa el valor dinámico de p.category (extensible sin hardcodear)
    acc.byCategory[p.category] = (acc.byCategory[p.category] || 0) + 1;

    return acc;
  }, { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0, byCategory: {} });

  stats.totalValue = stats.totalValue.toFixed(2);
  return stats;
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
  // SECURITY: trim() en campos string para prevenir bypass con espacios
  const sku           = (req.body.sku           || '').trim();
  const name          = (req.body.name          || '').trim();
  const category      = (req.body.category      || '').trim();
  const brand         = (req.body.brand         || '').trim();
  const compatibility = (req.body.compatibility || '').trim();
  const torque_nm     = (req.body.torque_nm     || '').trim();
  const dimensions    = (req.body.dimensions    || '').trim();
  const weight_kg     = (req.body.weight_kg     || '').trim();
  const { durabilityKm, stock, price } = req.body;

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

    // F4: Notificar a todos los clientes del dashboard via Socket.IO
    const io = req.app.get('io');
    if (io) io.emit('product_update', { type: 'created', productName: name });

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
  // SECURITY: trim() en campos string
  const name          = (req.body.name          || '').trim();
  const category      = (req.body.category      || '').trim();
  const brand         = (req.body.brand         || '').trim();
  const compatibility = (req.body.compatibility || '').trim();
  const torque_nm     = (req.body.torque_nm     || '').trim();
  const dimensions    = (req.body.dimensions    || '').trim();
  const weight_kg     = (req.body.weight_kg     || '').trim();
  const { durabilityKm, stock, price } = req.body;

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

    const productName = product.name; // Capturar nombre antes de eliminar
    await product.destroy();

    // F4: Notificar a todos los clientes del dashboard via Socket.IO
    const io = req.app.get('io');
    if (io) io.emit('product_update', { type: 'deleted', productName });

    res.redirect('/dashboard?success=' + encodeURIComponent('Repuesto eliminado del catálogo con éxito.'));
  } catch (error) {
    console.error('Error al eliminar repuesto:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Error al eliminar el repuesto del catálogo.'));
  }
};
