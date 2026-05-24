const { sequelize, User, Product } = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🔄 Conectando a la base de datos para sembrado...');
    await sequelize.authenticate();
    
    // Sincronizar modelos (crea tablas si no existen)
    await sequelize.sync({ force: false });

    console.log('🌱 Sembrando datos iniciales...');

    // 1. Sembrado de Usuarios (Las contraseñas se encriptarán automáticamente por el hook beforeSave)
    const usersCount = await User.count();
    if (usersCount === 0) {
      console.log('👥 Insertando usuarios de prueba...');
      await User.bulkCreate([
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
      ], { validate: true, individualHooks: true }); // individualHooks asegura que se ejecute beforeSave (bcrypt)
      console.log('✅ Usuarios de prueba creados.');
    } else {
      console.log('ℹ️ Los usuarios ya se encuentran registrados en la base de datos.');
    }

    // 2. Sembrado de Repuestos Pesados (Productos)
    const productsCount = await Product.count();
    if (productsCount === 0) {
      console.log('📦 Insertando catálogo inicial de repuestos...');
      await Product.bulkCreate([
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
    } else {
      console.log('ℹ️ El catálogo de repuestos ya se encuentra poblado.');
    }

    console.log('🎉 Sembrado de base de datos finalizado con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al sembrar los datos de prueba:', error);
    process.exit(1);
  }
};

seedDatabase();
