require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Configuración de Prometheus (Métricas)
const promBundle = require('express-prom-bundle');
const metricsMiddleware = promBundle({
  includeMethod: true, 
  includePath: true, 
  promClient: {
    collectDefaultMetrics: {}
  }
});
app.use(metricsMiddleware);


const server = http.createServer(app);

// Configuración de Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('chat_message', (msgData) => {
    console.log(`Mensaje de soporte recibido de ${msgData.sender}: ${msgData.text}`);
    // Retransmitir a todos los clientes conectados a la sala general
    io.emit('message', msgData);
    io.emit('chat_notification', {
      sender: msgData.sender || 'Soporte',
      role: msgData.role || 'mechanic',
      preview: String(msgData.text || '').slice(0, 60)
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 6000;

server.listen(PORT, () => {
  console.log(`💬 Chat Service (Socket.io) running on port ${PORT}`);
});
