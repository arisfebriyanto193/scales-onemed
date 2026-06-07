// =====================================================
// src/routes/children.routes.js
// =====================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/children.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Semua route butuh autentikasi
router.use(authenticate);

// GET    /api/children                  - Daftar semua anak
router.get('/',    controller.getAll);

// GET    /api/children/by-rfid/:uid     - Lookup anak berdasarkan RFID UID
// ⚠️ Harus SEBELUM /:id agar tidak tumpang tindih
router.get('/by-rfid/:uid', controller.getByRfid);

// GET    /api/children/:id              - Detail satu anak
router.get('/:id', controller.getById);

// POST   /api/children                  - Tambah anak baru
router.post('/',   controller.create);

// PUT    /api/children/:id              - Update data anak
router.put('/:id', controller.update);

// DELETE /api/children/:id              - Hapus data anak
router.delete('/:id', controller.remove);

module.exports = router;
