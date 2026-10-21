const odpImportService = require('../services/odpImport.service');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/admin/import-excel (Admin) — update Data ODP & Port mingguan dari file Excel
const importExcel = asyncHandler(async (req, res) => {
  res.json(await odpImportService.importOdpExcel({ file: req.file }));
}, 'Gagal mengimpor data Excel ODP.');

module.exports = { importExcel };
