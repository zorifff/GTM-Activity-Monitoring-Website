// Seluruh rute API, dipasang di /api oleh app.js
const express = require('express');

const router = express.Router();

router.use(require('./public.routes'));
router.use(require('./auth.routes'));
router.use(require('./data.routes'));
router.use(require('./activity.routes'));
router.use(require('./admin.routes'));

module.exports = router;
