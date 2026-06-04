// =====================================================
// src/routes/dashboard.routes.js
// =====================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// GET /api/dashboard/stats         - Statistik ringkasan (total anak, stunting, dll)
router.get('/stats',          controller.getStats);

// GET /api/dashboard/growth-chart  - Data kurva pertumbuhan WHO + data aktual
//     Query: ?jenis_kelamin=Laki-laki&tipe=BB_U
router.get('/growth-chart',   controller.getGrowthChart);

module.exports = router;
