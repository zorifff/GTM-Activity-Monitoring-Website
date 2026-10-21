const dataService = require('../services/data.service');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/data — seluruh branch, proyek, ODP & status kegiatan untuk dashboard
const getData = asyncHandler(async (req, res) => {
  res.json(await dataService.getDashboardData());
}, 'Failed to fetch data');

// GET /api/import-meta — ringkasan Jateng DIY; bila gagal kirim {} agar dashboard memakai hitungan sendiri
const getImportMeta = async (req, res) => {
  try {
    res.json(await dataService.getImportMeta());
  } catch (error) {
    console.error(`❌ [${req.id || '-'}] Error in /api/import-meta:`, error);
    res.json({});
  }
};

module.exports = { getData, getImportMeta };
