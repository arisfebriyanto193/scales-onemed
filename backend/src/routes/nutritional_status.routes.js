// =====================================================
// src/routes/nutritional_status.routes.js
// =====================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/nutritional_status.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// GET  /api/nutritional-status             - Semua status gizi (join nama anak & wilayah)
router.get('/',              controller.getAll);

// GET  /api/nutritional-status/:id         - Detail satu status gizi
router.get('/:id',           controller.getById);

// GET  /api/nutritional-status/child/:childId  - Status gizi satu anak (riwayat)
router.get('/child/:childId', controller.getByChildId);

// POST /api/nutritional-status/calculate/:measurementId
//      Hitung ulang & simpan status gizi dari satu measurement
router.post('/calculate/:measurementId', controller.calculate);

module.exports = router;
