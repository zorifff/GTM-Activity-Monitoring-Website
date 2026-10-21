// Rute berkas media (dipasang di /media): foto kegiatan terverifikasi dari object storage, wajib login
const express = require('express');
const media = require('../controllers/media.controller');
const { authenticateMedia } = require('../middlewares/auth');

const router = express.Router();

router.get('/*key', authenticateMedia, media.serveMedia);

module.exports = router;
