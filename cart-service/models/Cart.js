const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

module.exports = sequelize.define('Cart', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'completed'), defaultValue: 'active', allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, allowNull: false }
}, { tableName: 'carts' });
