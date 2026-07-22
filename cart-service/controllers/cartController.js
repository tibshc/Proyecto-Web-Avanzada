const axios = require('axios');
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
    res.json({ message: 'Order completed', orderId: cart.id, total: cart.total });
  } catch (error) {
    await Promise.all(reserved.map((item) => inventory().post(`/${item.partId}/release`, { quantity: item.quantity }, { headers: auth(req) }).catch(() => null)));
    res.status(error.response?.status || 502).json({ message: error.response?.data?.message || 'Checkout failed' });
  }
};

module.exports = { getCart, addItem, removeItem, checkout };
