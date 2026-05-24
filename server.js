const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const { sequelize } = require('./models');
const { testConnection } = require('./config/database');

require('dotenv').config();
const PORT = process.env.PORT || 3000;

// 1. Crear el Servidor HTTP a partir de Express
const server = http.createServer(app);

// 2. Inicializar Socket.IO sobre el mismo servidor HTTP
const io = socketIo(server);

// Configuración de Eventos de Socket.IO en Tiempo Real
io.on('connection', (socket) => {
  console.log(`🔌 Nuevo cliente conectado: ${socket.id}`);

  // Recibir mensajes de chat desde el cliente
  socket.on('chat_message', (messageData) => {
    // Validar mensaje entrante
    if (messageData && messageData.text.trim()) {
      // Re-transmitir el mensaje a TODOS los clientes conectados en la sala
      io.emit('message', messageData);
    }
  });

  // Evento al desconectarse un cliente
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// 3. Inicializar Base de Datos y Servidor
const startServer = async () => {
  try {
    // Verificar conexión física a PostgreSQL
    await testConnection();

    // Sincronizar todos los Modelos con PostgreSQL (Crea las tablas automáticamente si no existen)
    // Usamos force: false para no borrar los datos existentes.
    // Usamos alter: true para aplicar cambios menores a las tablas sin borrar registros.
    console.log('🔄 Sincronizando modelos con la base de datos...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Base de datos sincronizada correctamente.');

    // Iniciar la escucha del servidor HTTP + Socket.IO
    server.listen(PORT, () => {
      console.log(`===========================================================`);
      console.log(`🚀 SERVIDOR EJECUTÁNDOSE EN: http://localhost:${PORT}`);
      console.log(`🛠️  Modo: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===========================================================`);
    });
  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();
