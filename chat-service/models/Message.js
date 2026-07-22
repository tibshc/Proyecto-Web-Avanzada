const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

module.exports = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  sender: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  channel: { type: DataTypes.STRING, allowNull: false, defaultValue: 'support' },
  text: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'messages', timestamps: true });
