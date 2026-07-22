const axios = require('axios');
const PDFDocument = require('pdfkit');
const { Cart, CartItem } = require('../models');

const inventory = () => axios.create({
  baseURL: process.env.INVENTORY_SERVICE_URL,
  timeout: 3000
});

const auth = (req) => ({ Authorization: req.headers.authorization });

const getActiveCart = (userId) => Cart.findOne({
  where: { userId, status: 'active' },
  include: [{ model: CartItem, as: 'items' }]
});

const createActiveCart = (userId) => Cart.create({ userId, status: 'active', total: 0 });

const refreshTotal = async (cart) => {
  const items = await CartItem.findAll({ where: { cartId: cart.id } });
  cart.total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0).toFixed(2);
  await cart.save();
};

const getCart = async (req, res) => {
  const cart = await getActiveCart(req.user.id) || await createActiveCart(req.user.id);
  const hydrated = await Cart.findByPk(cart.id, { include: [{ model: CartItem, as: 'items' }] });
  res.json(hydrated);
};

const addItem = async (req, res) => {
  const { partId } = req.body;
  const quantity = Number(req.body.quantity || 1);
  if (!partId || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'partId and a positive quantity are required' });
  }

  try {
    const { data: part } = await inventory().get(`/${partId}`, { headers: auth(req) });
    const cart = await getActiveCart(req.user.id) || await createActiveCart(req.user.id);
    const item = await CartItem.findOne({ where: { cartId: cart.id, partId } });
    const finalQuantity = (item?.quantity || 0) + quantity;
    if (finalQuantity > part.stock) return res.status(409).json({ message: 'Insufficient stock' });

    if (item) {
      item.quantity = finalQuantity;
      item.price = part.price;
      item.name = part.name;
      await item.save();
    } else {
      await CartItem.create({ cartId: cart.id, partId, name: part.name, price: part.price, quantity });
    }
    await refreshTotal(cart);
    res.status(201).json(await Cart.findByPk(cart.id, { include: [{ model: CartItem, as: 'items' }] }));
  } catch (error) {
    res.status(error.response?.status || 502).json({ message: error.response?.data?.message || 'Inventory service unavailable' });
  }
};

const removeItem = async (req, res) => {
  const cart = await getActiveCart(req.user.id);
  const item = cart && await CartItem.findOne({ where: { id: req.params.id, cartId: cart.id } });
  if (!item) return res.status(404).json({ message: 'Cart item not found' });
  await item.destroy();
  await refreshTotal(cart);
  res.json(await Cart.findByPk(cart.id, { include: [{ model: CartItem, as: 'items' }] }));
};

const updateItem = async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'Quantity must be a positive integer' });
  }

  const cart = await getActiveCart(req.user.id);
  const item = cart && await CartItem.findOne({ where: { id: req.params.id, cartId: cart.id } });
  if (!item) return res.status(404).json({ message: 'Cart item not found' });

  try {
    const { data: part } = await inventory().get(`/${item.partId}`, { headers: auth(req) });
    if (quantity > part.stock) return res.status(409).json({ message: 'Insufficient stock' });
    item.quantity = quantity;
    item.price = part.price;
    item.name = part.name;
    await item.save();
    await refreshTotal(cart);
    res.json(await Cart.findByPk(cart.id, { include: [{ model: CartItem, as: 'items' }] }));
  } catch (error) {
    res.status(error.response?.status || 502).json({ message: error.response?.data?.message || 'Inventory service unavailable' });
  }
};

const buildInvoicePdf = ({ cart, user }) => new Promise((resolve) => {
  const document = new PDFDocument({ margin: 50 });
  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));

  document.fontSize(22).fillColor('#d85c1d').text('FACTURA DE COMPRA');
  document.moveDown(0.5).fontSize(10).fillColor('#333333')
    .text(`Orden: ${cart.id}`)
    .text(`Fecha: ${new Date().toLocaleString('es-EC')}`)
    .text(`Cliente: ${user.name || user.email || user.id}`)
    .text(`Correo: ${user.email || 'No disponible'}`);
  document.moveDown();
  document.fontSize(11).fillColor('#111111').text('Detalle de productos', { underline: true });
  document.moveDown(0.5);

  cart.items.forEach((item) => {
    const lineTotal = Number(item.price) * item.quantity;
    document.fontSize(10).text(`${item.name} | ${item.quantity} x $${Number(item.price).toFixed(2)} = $${lineTotal.toFixed(2)}`);
  });

  document.moveDown();
  document.fontSize(14).fillColor('#d85c1d').text(`TOTAL: $${Number(cart.total).toFixed(2)}`, { align: 'right' });
  document.moveDown(2).fontSize(9).fillColor('#666666').text('Gracias por su compra. Documento generado por MicroApp.');
  document.end();
});

const checkout = async (req, res) => {
  const cart = await getActiveCart(req.user.id);
  if (!cart || !cart.items?.length) return res.status(400).json({ message: 'Cart is empty' });
  const reserved = [];
  try {
    for (const item of cart.items) {
      await inventory().post(`/${item.partId}/reserve`, { quantity: item.quantity }, { headers: auth(req) });
      reserved.push(item);
    }
    cart.status = 'completed';
    await cart.save();
    await createActiveCart(req.user.id);
    const pdf = await buildInvoicePdf({ cart, user: req.user });
    res.status(200)
      .set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="factura-${cart.id}.pdf"` })
      .send(pdf);
  } catch (error) {
    await Promise.all(reserved.map((item) => inventory().post(`/${item.partId}/release`, { quantity: item.quantity }, { headers: auth(req) }).catch(() => null)));
    res.status(error.response?.status || 502).json({ message: error.response?.data?.message || 'Checkout failed' });
  }
};

module.exports = { getCart, addItem, updateItem, removeItem, checkout };
