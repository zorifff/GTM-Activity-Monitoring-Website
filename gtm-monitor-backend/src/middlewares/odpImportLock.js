// Import ODP memproses ribuan baris & menulis massal ke DB: hanya satu proses boleh berjalan sekaligus.
// Menolak (409) sebelum file hingga 25 MB selesai diunggah; kunci atomik dipasang di Redis saat job dibuat.
const { odpImportJobs } = require('../services/odpImportJob.service');
const { createImportLockMiddleware } = require('../controllers/importJob.controller');

module.exports = createImportLockMiddleware(odpImportJobs);
