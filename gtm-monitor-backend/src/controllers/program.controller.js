const programService = require('../services/program.service');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/admin/upload-program-image (Admin) — gambar program ke Cloudinary + pindai link (OCR)
const uploadProgramImage = asyncHandler(async (req, res) => {
  res.json(await programService.uploadProgramImage({ body: req.body, file: req.file }));
}, 'Gagal memproses gambar program.');

// GET /api/programs — data program per periode (atau semua periode)
const listPrograms = asyncHandler(async (req, res) => {
  res.json(programService.listPrograms({ query: req.query }));
}, 'Gagal memuat data program.');

// DELETE /api/admin/programs (Admin) — hapus program / slide / seluruh periode
const deletePrograms = asyncHandler(async (req, res) => {
  res.json(programService.deletePrograms({ body: req.body, query: req.query }));
}, 'Gagal menghapus data program.');

module.exports = { uploadProgramImage, listPrograms, deletePrograms };
