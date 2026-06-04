// =====================================================
// src/controllers/children.controller.js
// CRUD Data Anak - Halaman Data Anak (Gambar 23)
// =====================================================

const db = require('../config/database');

// GET /api/children
const getAll = async (req, res) => {
  try {
    const { search, wilayah, jenis_kelamin } = req.query;
    let sql    = 'SELECT * FROM children WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (nama_anak LIKE ? OR nik LIKE ? OR nama_orang_tua LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (wilayah)       { sql += ' AND wilayah = ?';       params.push(wilayah); }
    if (jenis_kelamin) { sql += ' AND jenis_kelamin = ?'; params.push(jenis_kelamin); }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('children.getAll:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data anak.' });
  }
};

// GET /api/children/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM children WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Data anak tidak ditemukan.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data anak.' });
  }
};

// POST /api/children
const create = async (req, res) => {
  try {
    const { nik, nama_anak, jenis_kelamin, tanggal_lahir, nama_orang_tua, alamat, wilayah, nomor_telepon } = req.body;

    // Validasi field wajib
    if (!nik || !nama_anak || !jenis_kelamin || !tanggal_lahir || !nama_orang_tua || !alamat) {
      return res.status(400).json({ success: false, message: 'Field wajib: nik, nama_anak, jenis_kelamin, tanggal_lahir, nama_orang_tua, alamat.' });
    }

    // Cek NIK duplikat
    const [existing] = await db.query('SELECT id FROM children WHERE nik = ?', [nik]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'NIK sudah terdaftar.' });
    }

    const [result] = await db.query(
      `INSERT INTO children (nik, nama_anak, jenis_kelamin, tanggal_lahir, nama_orang_tua, alamat, wilayah, nomor_telepon, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nik, nama_anak, jenis_kelamin, tanggal_lahir, nama_orang_tua, alamat, wilayah || null, nomor_telepon || null, req.user.id]
    );

    const [newRow] = await db.query('SELECT * FROM children WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Data anak berhasil ditambahkan.', data: newRow[0] });
  } catch (err) {
    console.error('children.create:', err);
    res.status(500).json({ success: false, message: 'Gagal menambah data anak.' });
  }
};

// PUT /api/children/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nik, nama_anak, jenis_kelamin, tanggal_lahir, nama_orang_tua, alamat, wilayah, nomor_telepon } = req.body;

    const [existing] = await db.query('SELECT id FROM children WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data anak tidak ditemukan.' });

    await db.query(
      `UPDATE children SET nik=?, nama_anak=?, jenis_kelamin=?, tanggal_lahir=?,
       nama_orang_tua=?, alamat=?, wilayah=?, nomor_telepon=? WHERE id=?`,
      [nik, nama_anak, jenis_kelamin, tanggal_lahir, nama_orang_tua, alamat, wilayah, nomor_telepon, id]
    );

    const [updated] = await db.query('SELECT * FROM children WHERE id = ?', [id]);
    res.json({ success: true, message: 'Data anak berhasil diupdate.', data: updated[0] });
  } catch (err) {
    console.error('children.update:', err);
    res.status(500).json({ success: false, message: 'Gagal update data anak.' });
  }
};

// DELETE /api/children/:id
const remove = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM children WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data anak tidak ditemukan.' });

    await db.query('DELETE FROM children WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data anak berhasil dihapus.' });
  } catch (err) {
    console.error('children.remove:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus data anak.' });
  }
};

module.exports = { getAll, getById, create, update, remove };
