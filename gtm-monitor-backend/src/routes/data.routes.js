// Rute data dashboard (dipasang di /api)
const express = require('express');
const data = require('../controllers/data.controller');
const odp = require('../controllers/odp.controller');
const { optionalAuthenticateToken, authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { schemas } = require('../validation/schemas');

const router = express.Router();

router.get('/data', optionalAuthenticateToken, data.getData);
router.get('/import-meta', optionalAuthenticateToken, data.getImportMeta);
router.get('/performance', authenticateToken, data.getPerformance);

// Query spasial ODP (PostGIS + indeks GiST)
router.get('/odps/nearby', authenticateToken, validate(schemas.odpNearby), odp.getNearby);
router.get('/odps/within', authenticateToken, validate(schemas.odpWithin), odp.getWithin);

module.exports = router;
