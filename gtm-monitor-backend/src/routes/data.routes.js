// Rute data dashboard (dipasang di /api)
const express = require('express');
const data = require('../controllers/data.controller');
const { optionalAuthenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/data', optionalAuthenticateToken, data.getData);
router.get('/import-meta', optionalAuthenticateToken, data.getImportMeta);

module.exports = router;
