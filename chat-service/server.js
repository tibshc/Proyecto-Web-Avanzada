require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const promBundle = require('express-prom-bundle');
const { sequelize } = require('./config/db');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 6000;

app.use(cors());
app.use(promBundle({ includeMethod: true, includePath: true, promClient: { collectDefaultMetrics: {} } }));
app.get('/health/live', (req, res) => res.json({ status: 'ok', service: 'chat-service' }));
app.get('/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready', service: 'chat-service' });
  } catch {
    res.status(503).json({ status: 'not-ready', service: 'chat-service' });
  }
});

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET).user;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join('support-room');
  if (socket.user.role === 'support' || socket.user.role === 'admin') socket.join('admin-room');

  socket.on('chat_message', async (payload) => {
    const text = String(payload?.text || '').trim();
    if (!text || text.length > 500) return;
    const channel = payload?.channel === 'admin' ? 'admin' : 'support';
    if (channel === 'admin' && !['support', 'admin'].includes(socket.user.role)) return;

    const message = {
      sender: socket.user.name || socket.user.email || socket.user.id,
      role: socket.user.role,
      channel,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      await Message.create({ userId: socket.user.id, sender: message.sender, role: message.role, channel: message.channel, text: message.text });
    } catch (error) {
      console.error('Message persistence failed:', error.message);
    }

    const room = channel === 'admin' ? 'admin-room' : 'support-room';
    io.to(room).emit('message', message);
    io.to(room).emit('chat_notification', {
      sender: message.sender,
      role: message.role,
      preview: message.text.slice(0, 60)
    });
  });
});

const startServer = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  await sequelize.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(255) NOT NULL DEFAULT 'support'");
  server.listen(PORT, () => console.log(`Chat Service running on port ${PORT}`));
};

startServer().catch((error) => {
  console.error('Chat service startup failed:', error.message);
  process.exit(1);
});
