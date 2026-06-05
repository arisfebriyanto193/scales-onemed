// =====================================================
// src/app.js - Entry point Express.js Backend
// Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
// =====================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');

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

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`\n🚀 PENTING Backend berjalan di: http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
