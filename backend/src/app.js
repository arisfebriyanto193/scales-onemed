// =====================================================
// src/app.js - Entry point Express.js Backend
// Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
// =====================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const WebSocket  = require('ws');
const url        = require('url');

// ── Import Routes ──
const authRoutes        = require('./routes/auth.routes');
const childrenRoutes    = require('./routes/children.routes');
const measurementRoutes = require('./routes/measurements.routes');
const statusRoutes      = require('./routes/nutritional_status.routes');
const dashboardRoutes   = require('./routes/dashboard.routes');
const hardwareRoutes    = require('./routes/hardware.routes');
const usersRoutes       = require('./routes/users.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['http://localhost:3000'];

const wsAllowedOrigins = [
  ...allowedOrigins,
  'https://www.qbyte.web.id',
  'https://penting.qbyte.web.id',
];

app.use(cors({
  origin : allowedOrigins,
  methods : ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──
app.get('/', (req, res) => {
  res.json({
    success : true,
    message : 'PENTING API - Pencegahan Stunting Terintegrasi',
    version : '1.0.0',
    status  : 'running',
  });
});

// ── Routes ──
app.use('/api/auth',             authRoutes);
app.use('/api/children',         childrenRoutes);
app.use('/api/measurements',     measurementRoutes);
app.use('/api/nutritional-status', statusRoutes);
app.use('/api/dashboard',        dashboardRoutes);
app.use('/api/hardware',         hardwareRoutes);
app.use('/api/users',            usersRoutes);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    success : false,
    message : err.message || 'Terjadi kesalahan pada server',
  });
});

// ── HTTP Server (shared dengan WebSocket) ──
const server = http.createServer(app);

// ── WebSocket Server (path: /ws) ──
const wss = new WebSocket.Server({ noServer: true });

const subscriptions = {};

// Handle upgrade hanya pada path /ws
server.on('upgrade', (req, socket, head) => {
  const pathname = url.parse(req.url).pathname;

  if (pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const origin    = req.headers['origin'];
  const userAgent = req.headers['user-agent'] || '';
  const isESP32   = userAgent.toLowerCase().includes('arduino');

  if (origin) {
    if (wsAllowedOrigins.includes(origin)) {
      console.log(`✅ Browser origin allowed: ${origin}`);
    } else if (isESP32) {
      console.log(`✅ ESP32 allowed via user-agent`);
    } else {
      console.log(`❌ Origin rejected: ${origin}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  } else {
    console.log('✅ No origin (likely ESP32)');
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');

  ws.on('message', (message) => {
    try {
      const msgStr = message.toString();

      // JSON format
      if (msgStr.trim().startsWith('{')) {
        const data = JSON.parse(msgStr);

        if (data.action === 'subscribe') {
          const topic = data.topic;
          if (!subscriptions[topic]) subscriptions[topic] = [];
          subscriptions[topic].push(ws);
          console.log(`✅ Subscribed to ${topic}`);

        } else if (data.action === 'publish') {
          const topic   = data.topic;
          const payload = data.payload;
          const msg     = JSON.stringify({ topic, payload });

          if (subscriptions[topic]) {
            subscriptions[topic].forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
          }

          console.log(`📢 Published to ${topic}:`, payload);
        }

      // RAW format: sensor/temp|25.4
      } else if (msgStr.includes('|')) {
        const [topic, payload] = msgStr.split('|');
        const msg = JSON.stringify({ topic, payload });

        if (subscriptions[topic]) {
          subscriptions[topic].forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(msg);
            }
          });
        }

      //  console.log(`📢 [RAW] ${topic} => ${payload}`);
      } else {
      //   console.warn('⚠️ Unknown format:', msgStr);
      }

    } catch (err) {
    //  console.error('❗ Message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('❎ Client disconnected');
    for (let topic in subscriptions) {
      subscriptions[topic] = subscriptions[topic].filter(client => client !== ws);
    }
  });
});

// ── Start Server ──
server.listen(PORT, () => {
  console.log(`\n🚀 PENTING Backend berjalan di: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket tersedia di: ws://localhost:${PORT}/ws`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
