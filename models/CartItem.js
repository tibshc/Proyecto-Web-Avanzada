const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  cartId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'cart_id'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'product_id'
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'La cantidad mínima es 1 artículo' }
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
    validate: {
      min: 0.00
    },
    comment: 'Precio congelado al momento de añadir/comprar'
  }
}, {
  tableName: 'cart_items'
});

module.exports = CartItem;
