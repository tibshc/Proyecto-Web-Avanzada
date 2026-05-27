/**
 * productController.js
 *
 * Mejoras implementadas:
 *  - FEATURE: Búsqueda server-side por nombre, SKU, marca y compatibilidad
 *    usando Op.iLike de Sequelize (case-insensitive en PostgreSQL).
 *    Problema anterior: el filtro solo operaba sobre los 8 productos de la
 *    página actual (client-side). Ahora busca en toda la base de datos.
 *  - REFACTOR (DRY): Lógica de validación numérica extraída a validateProductBody().
 *    Eliminada duplicación entre createProduct y updateProduct (~30 líneas).
 *  - FLASH: Reemplazados los redirect con ?error/success en la URL por req.flash()
 *    → mensajes no visibles en la barra de dirección, no repetibles con F5.
 *  - CLEAN CODE: Extraído buildWhereClause() para separar lógica de filtrado.
 */
const { Op } = require('sequelize');
const { Product } = require('../models');

const PRODUCTS_PER_PAGE = 8;
const VALID_CATEGORIES  = ['chasis', 'motor', 'frenos', 'otros'];

// ============================================================
// Helpers privados
// ============================================================

/**
 * Construye la cláusula WHERE de Sequelize según los filtros activos.
 * @param {string|null} category - Categoría validada o null.
 * @param {string}      search   - Término de búsqueda (puede ser vacío).
 * @returns {object} Cláusula where para findAndCountAll.
 */
const buildWhereClause = (category, search) => {
  const where = {};

  if (category) {
    where.category = category;
  }

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { name:          { [Op.iLike]: pattern } },
      { sku:           { [Op.iLike]: pattern } },
      { brand:         { [Op.iLike]: pattern } },
      { compatibility: { [Op.iLike]: pattern } }
    ];
  }

  return where;
};

/**
 * Calcula estadísticas del inventario en un único pase O(n).
 * Solo se invoca para roles admin/support.
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

    acc.byCategory[p.category] = (acc.byCategory[p.category] || 0) + 1;

    return acc;
  }, { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0, byCategory: {} });

  stats.totalValue = stats.totalValue.toFixed(2);
  return stats;
};

/**
 * Valida y parsea los campos numéricos y de texto del body de un producto.
 * DRY: evita duplicar la misma lógica en createProduct y updateProduct.
 *
 * @returns {{ valid: boolean, errorMsg?: string, data?: object }}
 */
const validateProductBody = (body) => {
  const sku           = (body.sku           || '').trim();
  const name          = (body.name          || '').trim();
  const category      = (body.category      || '').trim();
  const brand         = (body.brand         || '').trim();
  const compatibility = (body.compatibility || '').trim();
  const torque_nm     = (body.torque_nm     || '').trim();
  const dimensions    = (body.dimensions    || '').trim();
  const weight_kg     = (body.weight_kg     || '').trim();

  const parsedStock      = parseInt(body.stock,        10);
  const parsedPrice      = parseFloat(body.price);
  const parsedDurability = parseInt(body.durabilityKm, 10);

  if (isNaN(parsedStock) || parsedStock < 0) {
    return { valid: false, errorMsg: 'El stock debe ser un número entero no negativo.' };
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return { valid: false, errorMsg: 'El precio debe ser un valor numérico positivo.' };
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return { valid: false, errorMsg: 'La categoría seleccionada no es válida.' };
  }

  return {
    valid: true,
    data: {
      sku,
      name,
      category,
      brand,
      compatibility,
      technicalSpecs: {
        torque_nm:  torque_nm  || 'N/A',
        dimensions: dimensions || 'N/A',
        weight_kg:  weight_kg  || 'N/A'
      },
      durabilityKm: isNaN(parsedDurability) ? 100000 : parsedDurability,
      stock: parsedStock,
      price: parsedPrice
    }
  };
};

// ============================================================
// Controladores
// ============================================================

/**
 * Obtiene los repuestos (paginados, filtrados y buscados) y renderiza el Dashboard.
 * Soporta: ?page=N  ?category=X  ?search=texto
 *
 * MEJORA: el parámetro ?search ahora se envía a la DB (Op.iLike) en lugar de
 * filtrarse en el cliente sobre los 8 resultados de la página actual.
 */
exports.getAllProducts = async (req, res) => {
  const page           = Math.max(1, parseInt(req.query.page, 10) || 1);
  const rawCategory    = req.query.category || null;
  const activeCategory = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : null;
  // Sanitizar el término de búsqueda: recortar espacios y limitar longitud
  const search = (req.query.search || '').trim().substring(0, 100);

  const where = buildWhereClause(activeCategory, search);

  try {
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']], // BUG 5 FIX: camelCase para Sequelize underscored:true
      limit:  PRODUCTS_PER_PAGE,
      offset: (page - 1) * PRODUCTS_PER_PAGE
    });

    const totalPages  = Math.max(1, Math.ceil(count / PRODUCTS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    let stats = null;
    const { role } = req.session.user;
    if (role === 'admin' || role === 'support') {
      stats = await computeStats();
    }

    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products,
      user:            req.session.user,
      // Flash messages consumidos por flashMiddleware (ya en res.locals),
      // pero también mantenemos compatibilidad con los que vienen de render directo.
      error:           res.locals.error   || null,
      success:         res.locals.success || null,
      currentPage,
      totalPages,
      totalCount:      count,
      currentCategory: activeCategory,
      currentSearch:   search,
      stats
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.render('dashboard', {
      title: 'Catálogo de Repuestos',
      products:        [],
      user:            req.session.user,
      error:           'Error al cargar el inventario de repuestos.',
      success:         null,
      currentPage:     1,
      totalPages:      1,
      totalCount:      0,
      currentCategory: null,
      currentSearch:   '',
      stats:           null
    });
  }
};

/**
 * Crea un nuevo repuesto.
 * REFACTOR: usa validateProductBody() — eliminada duplicación con updateProduct.
 * FLASH: usa req.flash() en lugar de ?error= en la URL.
 */
exports.createProduct = async (req, res) => {
  const validation = validateProductBody(req.body);

  if (!validation.valid) {
    req.flash('error', validation.errorMsg);
    return res.redirect('/dashboard');
  }

  try {
    await Product.create(validation.data);

    const io = req.app.get('io');
    if (io) io.emit('product_update', { type: 'created', productName: validation.data.name });

    req.flash('success', 'Repuesto registrado con éxito en el catálogo.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al crear repuesto:', error);
    let errorMessage = 'Error al registrar el repuesto.';
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }
    req.flash('error', errorMessage);
    res.redirect('/dashboard');
  }
};

/**
 * Actualiza un repuesto existente.
 * REFACTOR: usa validateProductBody() — sin duplicación de código.
 * FLASH: usa req.flash() en lugar de ?error= en la URL.
 */
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const validation = validateProductBody(req.body);

  if (!validation.valid) {
    req.flash('error', validation.errorMsg);
    return res.redirect('/dashboard');
  }

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      req.flash('error', 'Repuesto no encontrado.');
      return res.redirect('/dashboard');
    }

    // Excluir SKU del update (no debe modificarse tras la creación)
    const { sku, ...updateData } = validation.data;
    await product.update(updateData);

    req.flash('success', 'Repuesto actualizado correctamente.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al actualizar repuesto:', error);
    let errorMessage = 'Error al actualizar el repuesto.';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = error.errors.map(e => e.message).join('. ');
    }
    req.flash('error', errorMessage);
    res.redirect('/dashboard');
  }
};

/**
 * Elimina un repuesto del inventario.
 * FLASH: usa req.flash() en lugar de ?error= en la URL.
 */
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      req.flash('error', 'Repuesto no encontrado.');
      return res.redirect('/dashboard');
    }

    const productName = product.name;
    await product.destroy();

    const io = req.app.get('io');
    if (io) io.emit('product_update', { type: 'deleted', productName });

    req.flash('success', 'Repuesto eliminado del catálogo con éxito.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error al eliminar repuesto:', error);
    req.flash('error', 'Error al eliminar el repuesto del catálogo.');
    res.redirect('/dashboard');
  }
};