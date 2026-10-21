// Rute umum: health check, daftar program, cari pairing (dipasang di /api)
const express = require('express');
const program = require('../controllers/program.controller');
const pairing = require('../controllers/pairing.controller');
const { authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { schemas } = require('../validation/schemas');

const router = express.Router();

// Health check endpoint for uptime monitoring & auto-healing watchdog
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

router.get('/programs', validate(schemas.listPrograms), program.listPrograms);
router.get('/pairing/search', authenticateToken, validate(schemas.pairingSearch), pairing.searchPairing);

module.exports = router;
