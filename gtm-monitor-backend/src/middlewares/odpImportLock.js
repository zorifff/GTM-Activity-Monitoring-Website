// Import ODP memproses ribuan baris & menulis massal ke DB: hanya satu proses boleh berjalan sekaligus.
// Pemeriksaan awal ini menolak (409) sebelum file hingga 25 MB selesai diunggah; kunci atomik yang sebenarnya
// dipasang di Redis saat job dibuat (services/odpImportJob.service.js), sehingga berlaku untuk semua instance server.
const { getRunningImportJobId, IMPORT_IN_PROGRESS_BODY } = require('../services/odpImportJob.service');

const odpImportLock = async (req, res, next) => {
  try {
    if (await getRunningImportJobId()) return res.status(409).json(IMPORT_IN_PROGRESS_BODY);
  } catch {
    // Redis tidak terjangkau: request dilanjutkan dan ditolak 503 saat job dibuat
  }
  next();
};

module.exports = odpImportLock;
