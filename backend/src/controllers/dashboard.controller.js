// =====================================================
// src/controllers/dashboard.controller.js
// Dashboard - Statistik & Grafik Pertumbuhan (Gambar 22)
// =====================================================

const db = require('../config/database');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  try {
    const [[totalAnak]]     = await db.query('SELECT COUNT(*) AS total FROM children');
    const [[totalPengukuran]] = await db.query('SELECT COUNT(*) AS total FROM measurements');
    const [[totalStunting]] = await db.query('SELECT COUNT(*) AS total FROM nutritional_status WHERE is_stunting = 1');
    const [[totalNormal]]   = await db.query('SELECT COUNT(*) AS total FROM nutritional_status WHERE status_keseluruhan = "Gizi Baik/Normal"');

    const [statusDist] = await db.query(
      `SELECT status_keseluruhan, COUNT(*) AS jumlah
       FROM nutritional_status GROUP BY status_keseluruhan`
    );

    res.json({
      success: true,
      data: {
        total_anak       : totalAnak.total,
        total_pengukuran : totalPengukuran.total,
        total_stunting   : totalStunting.total,
        total_normal     : totalNormal.total,
        distribusi_status: statusDist,
      },
    });
  } catch (err) {
    console.error('dashboard.getStats:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik.' });
  }
};

// GET /api/dashboard/growth-chart?jenis_kelamin=Laki-laki&tipe=BB_U
const getGrowthChart = async (req, res) => {
  try {
    const { jenis_kelamin = 'Laki-laki', tipe = 'BB_U' } = req.query;

    // Data referensi WHO (kurva standar)
    const [referensi] = await db.query(
      `SELECT usia_bulan, sd_minus3, sd_minus2, median, sd_plus2, sd_plus3
       FROM growth_references
       WHERE jenis_kelamin = ? AND tipe = ?
       ORDER BY usia_bulan ASC`,
      [jenis_kelamin, tipe]
    );

    // Data aktual anak (untuk plot di atas kurva)
    const [aktual] = await db.query(
      `SELECT m.usia_bulan,
              ${tipe === 'BB_U' ? 'm.berat_badan AS nilai' : 'm.tinggi_badan AS nilai'},
              c.nama_anak, c.jenis_kelamin
       FROM measurements m
       JOIN children c ON m.child_id = c.id
       WHERE c.jenis_kelamin = ?
       ORDER BY m.usia_bulan ASC`,
      [jenis_kelamin]
    );

    res.json({
      success: true,
      data: {
        jenis_kelamin,
        tipe,
        label     : tipe === 'BB_U' ? 'Berat Badan (kg)' : 'Tinggi Badan (cm)',
        referensi,
        aktual,
      },
    });
  } catch (err) {
    console.error('dashboard.getGrowthChart:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data grafik.' });
  }
};

module.exports = { getStats, getGrowthChart };
