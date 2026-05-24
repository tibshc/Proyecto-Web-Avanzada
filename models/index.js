const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Cart = require('./Cart');
const CartItem = require('./CartItem');

// ==========================================
// ASOCIACIONES Y RELACIONES ENTRE MODELOS
// ==========================================

// Relación: User <-> Cart (1 a N)
User.hasMany(Cart, { foreignKey: 'userId', as: 'carts' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relación: Cart <-> CartItem (1 a N)
Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

// Relación: Product <-> CartItem (1 a N)
Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = {
  sequelize,
  User,
  Product,
  Cart,
  CartItem
};
