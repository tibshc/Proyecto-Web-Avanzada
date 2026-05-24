const { sequelize, User, Product, Cart, CartItem } = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🔄 Conectando a la base de datos para sembrado...');
    await sequelize.authenticate();
    
    // Sincronizar todos los modelos forzando la recreación de tablas
    // Esto asegura que se aplique la nueva estructura relacional y llaves foráneas limpia
    console.log('⚠️ Recreando tablas relacionales (force: true)...');
    await sequelize.sync({ force: true });

    console.log('🌱 Sembrando datos iniciales...');

    // 1. Sembrado de Usuarios
    console.log('👥 Creando usuarios de prueba...');
    const users = await User.bulkCreate([
      {
        name: 'Administrador General',
        email: 'admin@repuestos.com',
        password: 'password123',
        role: 'admin'
      },
      {
        name: 'Soporte Técnico Especializado',
        email: 'soporte@repuestos.com',
        password: 'password123',
        role: 'support'
      },
      {
        name: 'Carlos Mecánico Flota',
        email: 'mecanico@repuestos.com',
        password: 'password123',
        role: 'mechanic'
      }
    ], { validate: true, individualHooks: true });
    
    console.log('✅ Usuarios creados.');

    // Encontrar al mecánico Carlos
    const mechanicUser = users.find(u => u.email === 'mecanico@repuestos.com');

    // 2. Sembrado de Repuestos Pesados (Productos)
    console.log('📦 Creando catálogo inicial de repuestos...');
    const products = await Product.bulkCreate([
      {
        sku: 'VOL-D13-PIS01',
        name: 'Pistón de Motor Diésel D13',
        category: 'motor',
        brand: 'Volvo Genuine',
        compatibility: 'Camiones Volvo FH16, Volvo FM13, Volvo FMX',
        durabilityKm: 300000,
        stock: 12,
        price: 450.00,
        technicalSpecs: {
          torque_nm: 'N/A (Componente Interno)',
          dimensions: 'Diámetro 131mm',
          weight_kg: '2.4 kg'
        }
      },
      {
        sku: 'SCA-R500-AMO02',
        name: 'Amortiguador Neumático Cabina Posterior',
        category: 'chasis',
        brand: 'Sachs Heavy Duty',
        compatibility: 'Camiones Scania R500, Scania G450, Buses Scania K410',
        durabilityKm: 150000,
        stock: 25,
        price: 185.50,
        technicalSpecs: {
          torque_nm: '120 Nm (Montaje)',
          dimensions: 'Largo extendido: 420mm',
          weight_kg: '4.8 kg'
        }
      },
      {
        sku: 'MER-HD-DIS03',
        name: 'Disco de Freno Delantero Ventilado 432mm',
        category: 'frenos',
        brand: 'Meritor HD',
        compatibility: 'Camiones Kenworth T800, Peterbilt 389, Mack Anthem',
        durabilityKm: 100000,
        stock: 8,
        price: 320.00,
        technicalSpecs: {
          torque_nm: '210 Nm',
          dimensions: 'Espesor: 45mm, Diámetro: 432mm',
          weight_kg: '22.0 kg'
        }
      },
      {
        sku: 'GEN-TRK-FIL04',
        name: 'Filtro Separador de Agua y Combustible Racor',
        category: 'otros',
        brand: 'Parker Racor',
        compatibility: 'Universal para Flotas Diésel Pesadas (Cummins, Detroit Diesel, Cat)',
        durabilityKm: 30000,
        stock: 50,
        price: 65.00,
        technicalSpecs: {
          torque_nm: 'Ajuste manual',
          dimensions: 'Altura: 280mm',
          weight_kg: '1.1 kg'
        }
      }
    ]);
    console.log('✅ Catálogo de repuestos creado.');

    const pistonProd = products.find(p => p.sku === 'VOL-D13-PIS01');
    const shockProd = products.find(p => p.sku === 'SCA-R500-AMO02');

    // 3. Sembrado Relacional de Carritos e Historial para Carlos
    if (mechanicUser) {
      console.log('🛒 Sembrando carritos e historial de órdenes...');

      // Crear un Carrito Completado (Historial de compra previa)
      const completedCart = await Cart.create({
        userId: mechanicUser.id,
        status: 'completed',
        total: 1085.50
      });

      // Agregar items al carrito completado
      await CartItem.bulkCreate([
        {
          cartId: completedCart.id,
          productId: pistonProd.id,
          quantity: 2,
          price: pistonProd.price
        },
        {
          cartId: completedCart.id,
          productId: shockProd.id,
          quantity: 1,
          price: shockProd.price
        }
      ]);

      // Crear el Carrito Activo Vacío actual para Carlos
      await Cart.create({
        userId: mechanicUser.id,
        status: 'active',
        total: 0.00
      });

      console.log('✅ Carritos e historial de prueba creados.');
    }

    console.log('🎉 Sembrado de base de datos relacional finalizado con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al sembrar los datos relacionales de prueba:', error);
    process.exit(1);
  }
};

seedDatabase();
