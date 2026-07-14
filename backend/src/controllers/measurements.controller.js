// =====================================================
// src/controllers/measurements.controller.js
// CRUD Data Pengukuran BB & TB - Gambar 24
// =====================================================

const db = require('../config/database');

// Hitung usia dalam bulan dari tanggal lahir ke tanggal kunjungan
function hitungUsiaBulan(tanggalLahir, tanggalKunjungan) {
  const lahir    = new Date(tanggalLahir);
  const kunjungan = new Date(tanggalKunjungan);
  const tahun  = kunjungan.getFullYear() - lahir.getFullYear();
  const bulan  = kunjungan.getMonth()    - lahir.getMonth();
  return Math.max(0, tahun * 12 + bulan);
}

// Format usia: "1 tahun 2 bulan" atau "0 tahun 6 bulan"
function formatUsia(usiaBulan) {
  const tahun = Math.floor(usiaBulan / 12);
  const bulan = usiaBulan % 12;
  return `${tahun} tahun ${bulan} bulan`;
}

// GET /api/measurements
const getAll = async (req, res) => {
  try {
    const { child_id, search } = req.query;
    let sql = `
      SELECT m.*, c.nama_anak, c.tanggal_lahir, c.jenis_kelamin, c.wilayah
      FROM measurements m
      JOIN children c ON m.child_id = c.id
      WHERE 1=1`;
    const params = [];

    if (child_id) { sql += ' AND m.child_id = ?'; params.push(child_id); }
    if (search)   { sql += ' AND c.nama_anak LIKE ?'; params.push(`%${search}%`); }

    sql += ' ORDER BY m.id DESC';

    const [rows] = await db.query(sql, params);

    // Tambah field usia_teks untuk tampilan tabel
    const data = rows.map(r => ({
      ...r,
      usia_teks: formatUsia(r.usia_bulan),
    }));

    res.json({ success: true, data, total: data.length });
  } catch (err) {
    console.error('measurements.getAll:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pengukuran.' });
  }
};

// GET /api/measurements/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, c.nama_anak, c.tanggal_lahir, c.jenis_kelamin, c.wilayah
       FROM measurements m JOIN children c ON m.child_id = c.id
       WHERE m.id = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Data pengukuran tidak ditemukan.' });
    res.json({ success: true, data: { ...rows[0], usia_teks: formatUsia(rows[0].usia_bulan) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data pengukuran.' });
  }
};

// GET /api/measurements/child/:childId
const getByChildId = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, c.nama_anak, c.tanggal_lahir, c.jenis_kelamin
       FROM measurements m JOIN children c ON m.child_id = c.id
       WHERE m.child_id = ? ORDER BY m.id DESC`,
      [req.params.childId]
    );
    const data = rows.map(r => ({ ...r, usia_teks: formatUsia(r.usia_bulan) }));
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data pengukuran.' });
  }
};

// POST /api/measurements
const create = async (req, res) => {
  try {
    const { child_id, tanggal_kunjungan, berat_badan, tinggi_badan, catatan, status_kesehatan } = req.body;

    if (!child_id || !tanggal_kunjungan || !berat_badan || !tinggi_badan) {
      return res.status(400).json({ success: false, message: 'Field wajib: child_id, tanggal_kunjungan, berat_badan, tinggi_badan.' });
    }

    // Ambil tanggal lahir anak untuk hitung usia
    const [childRows] = await db.query('SELECT tanggal_lahir FROM children WHERE id = ?', [child_id]);
    if (childRows.length === 0) return res.status(404).json({ success: false, message: 'Data anak tidak ditemukan.' });

    const usia_bulan = hitungUsiaBulan(childRows[0].tanggal_lahir, tanggal_kunjungan);

    const [result] = await db.query(
      `INSERT INTO measurements (child_id, tanggal_kunjungan, usia_bulan, berat_badan, tinggi_badan, catatan, status_kesehatan, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [child_id, tanggal_kunjungan, usia_bulan, berat_badan, tinggi_badan, catatan || null, status_kesehatan || null, req.user.id]
    );

    // Auto-hitung status gizi setelah insert pengukuran
    await autoCalculateStatus(result.insertId, child_id, usia_bulan, berat_badan, tinggi_badan, childRows[0].tanggal_lahir);

    const [newRow] = await db.query(
      'SELECT m.*, c.nama_anak, c.jenis_kelamin FROM measurements m JOIN children c ON m.child_id = c.id WHERE m.id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Data pengukuran berhasil ditambahkan. Status gizi telah dihitung otomatis.',
      data: { ...newRow[0], usia_teks: formatUsia(usia_bulan) },
    });
  } catch (err) {
    console.error('measurements.create:', err);
    res.status(500).json({ success: false, message: 'Gagal menambah data pengukuran.' });
  }
};

// PUT /api/measurements/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal_kunjungan, berat_badan, tinggi_badan, catatan, status_kesehatan } = req.body;

    const [existing] = await db.query(
      'SELECT m.*, c.tanggal_lahir FROM measurements m JOIN children c ON m.child_id = c.id WHERE m.id = ?', [id]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data pengukuran tidak ditemukan.' });

    const usia_bulan = hitungUsiaBulan(existing[0].tanggal_lahir, tanggal_kunjungan);

    await db.query(
      'UPDATE measurements SET tanggal_kunjungan=?, usia_bulan=?, berat_badan=?, tinggi_badan=?, catatan=?, status_kesehatan=? WHERE id=?',
      [tanggal_kunjungan, usia_bulan, berat_badan, tinggi_badan, catatan || null, status_kesehatan || null, id]
    );

    // Hitung ulang status gizi
    await autoCalculateStatus(id, existing[0].child_id, usia_bulan, berat_badan, tinggi_badan, existing[0].tanggal_lahir);

    res.json({ success: true, message: 'Data pengukuran berhasil diupdate.' });
  } catch (err) {
    console.error('measurements.update:', err);
    res.status(500).json({ success: false, message: 'Gagal update data pengukuran.' });
  }
};

// DELETE /api/measurements/:id
const remove = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM measurements WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data pengukuran tidak ditemukan.' });

    await db.query('DELETE FROM measurements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data pengukuran berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus data pengukuran.' });
  }
};

// ── Helper: Auto-hitung & simpan status gizi ──────────────────
async function autoCalculateStatus(measurementId, childId, usiaBulan, beratBadan, tinggiBadan, tanggalLahir) {
  try {
    // Ambil data referensi WHO
    const [childRow] = await db.query('SELECT jenis_kelamin FROM children WHERE id = ?', [childId]);
    if (childRow.length === 0) return;

    const jenisKelamin = childRow[0].jenis_kelamin;
    const bulanRef     = Math.min(usiaBulan, 60); // max 60 bulan

    const [refBB] = await db.query(
      'SELECT * FROM growth_references WHERE jenis_kelamin=? AND tipe="BB_U" AND usia_bulan <= ? ORDER BY usia_bulan DESC LIMIT 1',
      [jenisKelamin, usiaBulan]
    );
    const [refTB] = await db.query(
      'SELECT * FROM growth_references WHERE jenis_kelamin=? AND tipe="TB_U" AND usia_bulan <= ? ORDER BY usia_bulan DESC LIMIT 1',
      [jenisKelamin, usiaBulan]
    );

    let statusBB = 'Berat Badan Normal';
    let statusTB = 'Tinggi Normal';
    let isStunting = 0;
    let isWasting  = 0;
    let zscoreBB = null;
    let zscoreTB = null;

    if (refBB.length > 0) {
      const r = refBB[0];
      if (beratBadan < r.sd_minus3)      { statusBB = 'Gizi Buruk';          isWasting = 1; }
      else if (beratBadan < r.sd_minus2) { statusBB = 'Kurang Gizi'; }
      else if (beratBadan > r.sd_plus2)  { statusBB = 'Gizi Lebih'; }
      else                               { statusBB = 'Berat Badan Normal'; }
    }

    if (refTB.length > 0) {
      const r = refTB[0];
      if (tinggiBadan < r.sd_minus3)      { statusTB = 'Sangat Pendek'; isStunting = 1; }
      else if (tinggiBadan < r.sd_minus2) { statusTB = 'Pendek';        isStunting = 1; }
      else if (tinggiBadan > r.sd_plus2)  { statusTB = 'Tinggi'; }
      else                                { statusTB = 'Tinggi Normal'; }
    }

    // Status keseluruhan
    let statusKeseluruhan;
    if (statusBB === 'Gizi Buruk' || statusBB === 'Kurang Gizi' || isStunting) {
      statusKeseluruhan = 'Kurang Gizi';
    } else if (statusBB === 'Gizi Lebih') {
      statusKeseluruhan = 'Gizi Lebih';
    } else {
      statusKeseluruhan = 'Gizi Baik/Normal';
    }

    // Upsert (INSERT or UPDATE)
    await db.query(
      `INSERT INTO nutritional_status
         (measurement_id, child_id, status_bb_umur, status_tb_umur, status_keseluruhan, is_stunting, is_wasting, zscore_bb_umur, zscore_tb_umur)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_bb_umur=VALUES(status_bb_umur), status_tb_umur=VALUES(status_tb_umur),
         status_keseluruhan=VALUES(status_keseluruhan), is_stunting=VALUES(is_stunting),
         is_wasting=VALUES(is_wasting), calculated_at=NOW()`,
      [measurementId, childId, statusBB, statusTB, statusKeseluruhan, isStunting, isWasting, zscoreBB, zscoreTB]
    );
  } catch (err) {
    console.error('autoCalculateStatus error:', err.message);
  }
}

module.exports = { getAll, getById, getByChildId, create, update, remove };
