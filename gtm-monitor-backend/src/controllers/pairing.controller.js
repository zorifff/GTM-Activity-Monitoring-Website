const pairingService = require('../services/pairing.service');
const { pairingImportJobs } = require('../services/pairingImportJob.service');
const asyncHandler = require('../utils/asyncHandler');
const { createImportJobController, createImportLockMiddleware } = require('./importJob.controller');

// POST /api/admin/upload-pairing-excel (Admin) — perbarui basis data pencarian Tsel One Pairing (diproses worker latar belakang)
// GET  /api/admin/upload-pairing-excel/:jobId[/events] (Admin) — status & progres import (SSE)
const importController = createImportJobController(pairingImportJobs, {
  startFailure: 'Gagal memproses file Excel pairing.',
  statusFailure: 'Gagal memuat status import Data Tsel One Pairing.',
  eventsFailure: 'Gagal memantau progres import Data Tsel One Pairing.'
});
const pairingImportLock = createImportLockMiddleware(pairingImportJobs);

// GET /api/pairing/search — cari pairing berdasarkan BB ID / MSISDN / Order ID (indeks di Redis)
const searchPairing = asyncHandler(async (req, res) => {
  res.json(await pairingService.searchPairing({ query: req.query }));
}, 'Gagal melakukan pencarian data pairing.');

module.exports = {
  uploadPairingExcel: importController.start,
  pairingImportStatus: importController.status,
  pairingImportEvents: importController.events,
  pairingImportLock,
  searchPairing
};
