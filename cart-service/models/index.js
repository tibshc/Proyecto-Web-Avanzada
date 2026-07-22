const { sequelize } = require('../config/db');
const Cart = require('./Cart');
const CartItem = require('./CartItem');

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

module.exports = { sequelize, Cart, CartItem };
