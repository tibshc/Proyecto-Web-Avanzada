const Part = require('../models/Part');

const sampleParts = [
  { name: 'Filtro de aceite Volvo FH16', description: 'Filtro compatible con motores D13 y D16.', price: 28.90, stock: 42 },
  { name: 'Pastillas de freno Scania R500', description: 'Juego delantero para sistema de freno pesado.', price: 146.50, stock: 18 },
  { name: 'Correa de distribucion Mercedes Actros', description: 'Correa reforzada para motor OM 471.', price: 89.99, stock: 25 },
  { name: 'Bomba de agua Iveco Stralis', description: 'Bomba de refrigeracion con junta incluida.', price: 174.75, stock: 11 },
  { name: 'Amortiguador delantero MAN TGX', description: 'Amortiguador hidraulico para eje delantero.', price: 215.00, stock: 9 },
  { name: 'Kit de embrague Hino 500', description: 'Disco, plato y collarin para transmision manual.', price: 389.90, stock: 7 },
  { name: 'Alternador DAF XF', description: 'Alternador de 24V y 100A.', price: 312.40, stock: 6 },
  { name: 'Bateria 12V 180Ah', description: 'Bateria de alto rendimiento para vehiculos pesados.', price: 268.00, stock: 14 },
  { name: 'Radiador de motor Kenworth T800', description: 'Radiador de aluminio para servicio pesado.', price: 645.00, stock: 4 },
  { name: 'Sensor de presion de aceite', description: 'Sensor universal para motores diesel.', price: 32.80, stock: 31 },
  { name: 'Termostato Cummins ISX', description: 'Termostato de 82 grados con sello.', price: 54.60, stock: 16 },
  { name: 'Manguera de turbo Scania', description: 'Manguera de silicona reforzada de alta temperatura.', price: 72.25, stock: 21 },
  { name: 'Rodamiento de rueda trasera', description: 'Rodamiento sellado para eje trasero.', price: 118.00, stock: 12 },
  { name: 'Bomba de combustible Volvo', description: 'Bomba de alimentacion para sistema diesel.', price: 229.90, stock: 8 },
  { name: 'Filtro de aire Renault Trucks', description: 'Elemento filtrante para admision de motor.', price: 41.35, stock: 35 },
  { name: 'Cruceta de cardan universal', description: 'Cruceta reforzada para linea de transmision.', price: 67.90, stock: 19 },
  { name: 'Compresor de aire Bendix', description: 'Compresor para sistema neumatico de frenos.', price: 780.00, stock: 3 },
  { name: 'Valvula EGR Mercedes Actros', description: 'Valvula de recirculacion de gases de escape.', price: 415.80, stock: 5 },
  { name: 'Espejo lateral derecho', description: 'Espejo calefactable para cabina de camion.', price: 96.00, stock: 10 },
  { name: 'Kit de filtros de servicio', description: 'Kit con filtros de aceite, aire y combustible.', price: 132.50, stock: 13 }
];

const seedParts = async () => {
  const existingParts = await Part.findAll({ attributes: ['name'] });
  const existingNames = new Set(existingParts.map((part) => part.name));
  const missingParts = sampleParts.filter((part) => !existingNames.has(part.name));
  if (missingParts.length === 0) return;

  await Part.bulkCreate(missingParts);
  console.log(`Seed completado: ${missingParts.length} repuestos insertados`);
};

module.exports = seedParts;
