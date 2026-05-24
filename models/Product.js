const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: { msg: 'El SKU debe ser único en el catálogo' },
    validate: {
      notEmpty: { msg: 'El código SKU es obligatorio' }
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El nombre del repuesto es obligatorio' }
    }
  },
  category: {
    type: DataTypes.ENUM('chasis', 'motor', 'frenos', 'otros'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['chasis', 'motor', 'frenos', 'otros']],
        msg: 'La categoría debe ser: chasis, motor, frenos o otros'
      }
    }
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'La marca del repuesto es obligatoria' }
    }
  },
  compatibility: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Modelos de camiones/buses de carga pesada compatibles (ej. Volvo FH16, Scania R500)'
  },
  technicalSpecs: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Especificaciones técnicas estructuradas (ej. torque_nm, dimensiones, peso_kg, material)'
  },
  durabilityKm: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100000,
    validate: {
      isInt: { msg: 'La durabilidad estimada en kilómetros debe ser un número entero' },
      min: { args: [0], msg: 'La durabilidad estimada no puede ser negativa' }
    },
    comment: 'Durabilidad útil estimada en kilómetros bajo condiciones de carga pesada'
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: { msg: 'El stock disponible debe ser un número entero' },
      min: { args: [0], msg: 'El stock no puede ser menor a cero' }
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      isDecimal: { msg: 'El precio debe ser un valor decimal válido' },
      min: { args: [0.00], msg: 'El precio no puede ser menor a cero' }
    }
  }
});

module.exports = Product;
