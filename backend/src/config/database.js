// =====================================================
// src/config/database.js - Koneksi MySQL dengan Pool
// =====================================================

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host    : process.env.DB_HOST     || 'localhost',
  port    : parseInt(process.env.DB_PORT || '3306'),
  user    : process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'penting_db',
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit        : 0,
  charset           : 'utf8mb4',
  dateStrings       : true,
});

// Test koneksi saat startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL terhubung:', process.env.DB_NAME || 'penting_db');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Koneksi MySQL gagal:', err.message);
    process.exit(1);
  });

module.exports = pool;
