// Rute auth & manajemen sesi (dipasang di /api)
const express = require('express');
const auth = require('../controllers/auth.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { loginLimiter } = require('../middlewares/rateLimiters');
const { requireTurnstile } = require('../middlewares/turnstile');
const { validate } = require('../middlewares/validate');
const { schemas } = require('../validation/schemas');

const router = express.Router();

router.post('/auth/login', loginLimiter, validate(schemas.login), requireTurnstile('login'), auth.login);
router.post('/auth/refresh', auth.refresh);
router.get('/auth/session', auth.session);
router.get('/auth/me', authenticateToken, auth.me);
router.post('/auth/logout', auth.logout);

router.get('/admin/sessions', requireAdmin, auth.listSessions);
router.post('/admin/sessions/revoke', requireAdmin, validate(schemas.revokeSessions), auth.revokeSessions);

module.exports = router;
