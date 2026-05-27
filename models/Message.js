const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El mensaje no puede estar vacío' }
    }
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El remitente es obligatorio' }
    }
  },
  role: {
    type: DataTypes.ENUM('mechanic', 'support', 'admin'),
    defaultValue: 'mechanic',
    allowNull: false
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['created_at'] } // Índice para ordenar por fecha
  ]
});

module.exports = Message;
