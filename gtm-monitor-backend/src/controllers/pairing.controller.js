const pairingService = require('../services/pairing.service');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/admin/upload-pairing-excel (Admin) — perbarui basis data pencarian Tsel One Pairing
const uploadPairingExcel = asyncHandler(async (req, res) => {
  res.json(pairingService.uploadPairingExcel({ file: req.file }));
}, 'Gagal memproses file Excel pairing.');

// GET /api/pairing/search — cari pairing berdasarkan BB ID / MSISDN / Order ID
const searchPairing = asyncHandler(async (req, res) => {
  res.json(pairingService.searchPairing({ query: req.query }));
}, 'Gagal melakukan pencarian data pairing.');

module.exports = { uploadPairingExcel, searchPairing };
