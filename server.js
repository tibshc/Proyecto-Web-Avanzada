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

// Registrar 'io' en la app para que los controladores puedan emitir eventos globales (F4)
app.set('io', io);

// ============================================================
// Configuración de Eventos de Socket.IO en Tiempo Real
// ============================================================
io.on('connection', (socket) => {
  console.log(`🔌 Nuevo cliente conectado: ${socket.id}`);

  // F5: El cliente del chat solicita unirse a la sala de soporte técnico
  // Solo los clientes de la página /chat emitirán este evento
  socket.on('join_chat_room', () => {
    socket.join('support-room');
    console.log(`💬 Cliente ${socket.id} unido a support-room`);
  });

  // F5: Recibir mensajes de chat y retransmitir SOLO a la sala support-room
  // SECURITY (STRIDE - Tampering): Validar tipo y longitud antes de retransmitir.
  // Evita que un cliente malicioso envíe payloads masivos o inyecte HTML en el chat.
  socket.on('chat_message', (messageData) => {
    // Validación de tipo
    if (!messageData || typeof messageData !== 'object') return;

    const text   = (messageData.text   || '').toString().trim();
    const sender = (messageData.sender || 'Anónimo').toString().trim();

    // Límite de longitud: previene flood de mensajes gigantes (STRIDE - DoS)
    if (!text || text.length > 500) return;
    if (sender.length > 60) return;

    // Sanitización básica: escapar < > para prevenir XSS en el chat (STRIDE - Tampering)
    const escapeHTML = (str) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    io.to('support-room').emit('message', {
      text:      escapeHTML(text),
      sender:    escapeHTML(sender),
      role:      messageData.role || 'mechanic',
      timestamp: messageData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // F5: Indicador "está escribiendo..." — retransmitir a la sala excluyendo el emisor
  socket.on('typing', (data) => {
    socket.to('support-room').emit('user_typing', data);
  });

  socket.on('stop_typing', () => {
    socket.to('support-room').emit('user_stop_typing');
  });

  // Evento al desconectarse un cliente
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// 3. Inicializar Base de Datos y Servidor
const startServer = async () => {
  try {
    await testConnection();

    console.log('🔄 Sincronizando modelos con la base de datos...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Base de datos sincronizada correctamente.');

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
