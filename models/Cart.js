const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id' // Mapeo a columna snake_case en la DB
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active',
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
    validate: {
      min: 0.00
    }
  }
}, {
  tableName: 'carts' // Nombre explícito de la tabla en snake_case
});

module.exports = Cart;
