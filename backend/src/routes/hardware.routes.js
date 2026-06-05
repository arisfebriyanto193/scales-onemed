const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST data dari ESP32
router.post('/data', async (req, res) => {
  const { dev_id, bb, tb } = req.body;
  
  if (!dev_id || bb === undefined || tb === undefined) {
    return res.status(400).json({ success: false, message: 'dev_id, bb, dan tb wajib diisi' });
  }

  try {
    // Cek apakah data untuk alat ini sudah ada
    const [existing] = await db.execute('SELECT id FROM temp_measurements WHERE dev_id = ?', [dev_id]);

    if (existing.length > 0) {
      // Jika sudah ada, update datanya
      const updateQuery = `UPDATE temp_measurements SET bb = ?, tb = ?, updated_at = CURRENT_TIMESTAMP WHERE dev_id = ?`;
      await db.execute(updateQuery, [bb, tb, dev_id]);
    } else {
      // Jika belum ada, buat baris baru
      const insertQuery = `INSERT INTO temp_measurements (dev_id, bb, tb) VALUES (?, ?, ?)`;
      await db.execute(insertQuery, [dev_id, bb, tb]);
    }

    res.json({ success: true, message: 'Data berhasil disimpan' });
  } catch (error) {
    console.error('Error saving hardware data:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan data hardware' });
  }
});

// GET data untuk frontend
router.get('/data/:dev_id', async (req, res) => {
  const { dev_id } = req.params;

  try {
    const [rows] = await db.execute('SELECT * FROM temp_measurements WHERE dev_id = ?', [dev_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching hardware data:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data hardware' });
  }
});

module.exports = router;
