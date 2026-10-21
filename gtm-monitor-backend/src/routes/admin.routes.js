// Rute Admin: import Excel ODP, gambar program, data pairing (dipasang di /api)
const express = require('express');
const odpImport = require('../controllers/odpImport.controller');
const program = require('../controllers/program.controller');
const pairing = require('../controllers/pairing.controller');
const { requireAdmin } = require('../middlewares/auth');
const { odpImportLimiter, programImageLimiter, pairingImportLimiter } = require('../middlewares/rateLimiters');
const odpImportLock = require('../middlewares/odpImportLock');
const { excelUpload, programImageUpload, pairingUpload, uploadSingle } = require('../middlewares/uploads');
const { validate } = require('../middlewares/validate');
const { schemas } = require('../validation/schemas');

const router = express.Router();

// Form data dibaca multer terlebih dahulu, lalu divalidasi skema
router.post('/admin/import-excel',
  requireAdmin, odpImportLimiter, odpImportLock,
  uploadSingle(excelUpload, 'file', 'ODP excel import', 'Gagal mengunggah file Data ODP.'),
  validate(schemas.fileOnly),
  odpImport.importExcel);

// Status & progres import ODP yang berjalan di worker latar belakang (Server-Sent Events)
router.get('/admin/import-excel/:jobId', requireAdmin, validate(schemas.importJob), odpImport.importStatus);
router.get('/admin/import-excel/:jobId/events', requireAdmin, validate(schemas.importJob), odpImport.importEvents);

router.post('/admin/upload-program-image',
  requireAdmin, programImageLimiter,
  uploadSingle(programImageUpload, 'file', 'program image upload', 'Gagal mengunggah gambar program.'),
  validate(schemas.uploadProgramImage),
  program.uploadProgramImage);

router.delete('/admin/programs', requireAdmin, validate(schemas.deletePrograms), program.deletePrograms);

router.post('/admin/upload-pairing-excel',
  requireAdmin, pairingImportLimiter, pairing.pairingImportLock,
  uploadSingle(pairingUpload, 'file', 'pairing upload', 'Gagal mengunggah file Excel pairing.'),
  validate(schemas.fileOnly),
  pairing.uploadPairingExcel);

// Status & progres import pairing yang berjalan di worker latar belakang (Server-Sent Events)
router.get('/admin/upload-pairing-excel/:jobId', requireAdmin, validate(schemas.importJob), pairing.pairingImportStatus);
router.get('/admin/upload-pairing-excel/:jobId/events', requireAdmin, validate(schemas.importJob), pairing.pairingImportEvents);

module.exports = router;
