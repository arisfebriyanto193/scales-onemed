// =====================================================
// src/routes/auth.routes.js
// =====================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// POST /api/auth/login
router.post('/login', controller.login);

// GET  /api/auth/me  (butuh token)
router.get('/me', authenticate, controller.getMe);

// POST /api/auth/logout
router.post('/logout', authenticate, controller.logout);

module.exports = router;
