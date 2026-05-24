const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

// Aquí se pueden declarar las asociaciones/relaciones entre los modelos si se requieren en el futuro.
// Por ejemplo:
// User.hasMany(AuditLog);
// AuditLog.belongsTo(User);

module.exports = {
  sequelize,
  User,
  Product
};
