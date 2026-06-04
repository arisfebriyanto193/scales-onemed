// =====================================================
// src/routes/measurements.routes.js
// =====================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/measurements.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// GET    /api/measurements                 - Semua pengukuran (bisa filter ?child_id=)
router.get('/',         controller.getAll);

// GET    /api/measurements/:id             - Detail satu pengukuran
router.get('/:id',      controller.getById);

// GET    /api/measurements/child/:childId  - Semua pengukuran satu anak
router.get('/child/:childId', controller.getByChildId);

// POST   /api/measurements                - Tambah pengukuran baru
router.post('/',        controller.create);

// PUT    /api/measurements/:id            - Update pengukuran
router.put('/:id',      controller.update);

// DELETE /api/measurements/:id            - Hapus pengukuran
router.delete('/:id',   controller.remove);

module.exports = router;
