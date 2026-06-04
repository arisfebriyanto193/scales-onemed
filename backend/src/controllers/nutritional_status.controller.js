// =====================================================
// src/controllers/nutritional_status.controller.js
// Cek Status Gizi - Gambar 25
// =====================================================

const db = require('../config/database');

// GET /api/nutritional-status
const getAll = async (req, res) => {
  try {
    const { wilayah, status_keseluruhan, is_stunting } = req.query;
    let sql = `
      SELECT ns.id, c.id AS child_id, c.nama_anak, c.jenis_kelamin, c.wilayah,
        m.tanggal_kunjungan, m.usia_bulan, m.berat_badan, m.tinggi_badan,
        ns.status_bb_umur, ns.status_tb_umur, ns.status_keseluruhan,
        ns.is_stunting, ns.is_wasting, ns.calculated_at
      FROM nutritional_status ns
      JOIN measurements m ON ns.measurement_id = m.id
      JOIN children     c ON ns.child_id = c.id
      WHERE 1=1`;
    const params = [];

    if (wilayah)            { sql += ' AND c.wilayah = ?';             params.push(wilayah); }
    if (status_keseluruhan) { sql += ' AND ns.status_keseluruhan = ?'; params.push(status_keseluruhan); }
    if (is_stunting !== undefined) { sql += ' AND ns.is_stunting = ?'; params.push(is_stunting === '1' ? 1 : 0); }
    sql += ' ORDER BY ns.calculated_at DESC';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('nutritional_status.getAll:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data status gizi.' });
  }
};

// GET /api/nutritional-status/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ns.*, c.nama_anak, c.jenis_kelamin, c.wilayah,
              m.berat_badan, m.tinggi_badan, m.usia_bulan
       FROM nutritional_status ns
       JOIN measurements m ON ns.measurement_id = m.id
       JOIN children c     ON ns.child_id = c.id
       WHERE ns.id = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Status gizi tidak ditemukan.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil status gizi.' });
  }
};

// GET /api/nutritional-status/child/:childId
const getByChildId = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ns.*, m.tanggal_kunjungan, m.berat_badan, m.tinggi_badan, m.usia_bulan
       FROM nutritional_status ns
       JOIN measurements m ON ns.measurement_id = m.id
       WHERE ns.child_id = ? ORDER BY m.tanggal_kunjungan ASC`,
      [req.params.childId]
    );
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat status gizi.' });
  }
};

// POST /api/nutritional-status/calculate/:measurementId
const calculate = async (req, res) => {
  try {
    const { measurementId } = req.params;
    const [mRows] = await db.query(
      `SELECT m.*, c.jenis_kelamin FROM measurements m
       JOIN children c ON m.child_id = c.id WHERE m.id = ?`, [measurementId]
    );
    if (mRows.length === 0) return res.status(404).json({ success: false, message: 'Data pengukuran tidak ditemukan.' });

    const m      = mRows[0];
    const bulanRef = Math.min(m.usia_bulan, 60);
    const [refBB] = await db.query(
      'SELECT * FROM growth_references WHERE jenis_kelamin=? AND tipe="BB_U" AND usia_bulan=?',
      [m.jenis_kelamin, bulanRef]
    );
    const [refTB] = await db.query(
      'SELECT * FROM growth_references WHERE jenis_kelamin=? AND tipe="TB_U" AND usia_bulan=?',
      [m.jenis_kelamin, bulanRef]
    );

    let statusBB = 'Berat Badan Normal', statusTB = 'Tinggi Normal', isStunting = 0, isWasting = 0;

    if (refBB.length > 0) {
      const r = refBB[0];
      if      (m.berat_badan < r.sd_minus3) { statusBB = 'Gizi Buruk';  isWasting = 1; }
      else if (m.berat_badan < r.sd_minus2) { statusBB = 'Kurang Gizi'; }
      else if (m.berat_badan > r.sd_plus2)  { statusBB = 'Gizi Lebih'; }
    }
    if (refTB.length > 0) {
      const r = refTB[0];
      if      (m.tinggi_badan < r.sd_minus3) { statusTB = 'Sangat Pendek'; isStunting = 1; }
      else if (m.tinggi_badan < r.sd_minus2) { statusTB = 'Pendek';        isStunting = 1; }
      else if (m.tinggi_badan > r.sd_plus2)  { statusTB = 'Tinggi'; }
    }

    const statusKeseluruhan = (statusBB === 'Gizi Buruk' || statusBB === 'Kurang Gizi' || isStunting)
      ? 'Kurang Gizi' : statusBB === 'Gizi Lebih' ? 'Gizi Lebih' : 'Gizi Baik/Normal';

    await db.query(
      `INSERT INTO nutritional_status (measurement_id, child_id, status_bb_umur, status_tb_umur, status_keseluruhan, is_stunting, is_wasting)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_bb_umur=VALUES(status_bb_umur), status_tb_umur=VALUES(status_tb_umur),
         status_keseluruhan=VALUES(status_keseluruhan), is_stunting=VALUES(is_stunting),
         is_wasting=VALUES(is_wasting), calculated_at=NOW()`,
      [measurementId, m.child_id, statusBB, statusTB, statusKeseluruhan, isStunting, isWasting]
    );

    res.json({ success: true, message: 'Status gizi berhasil dihitung.',
      data: { statusBB, statusTB, statusKeseluruhan, isStunting, isWasting } });
  } catch (err) {
    console.error('calculate error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghitung status gizi.' });
  }
};

module.exports = { getAll, getById, getByChildId, calculate };
