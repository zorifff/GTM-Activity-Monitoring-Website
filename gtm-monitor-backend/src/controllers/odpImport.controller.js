// POST /api/admin/import-excel (Admin) — update Data ODP & Port mingguan dari file Excel (diproses worker latar belakang)
// GET  /api/admin/import-excel/:jobId[/events] (Admin) — status & progres import (SSE)
const { odpImportJobs } = require('../services/odpImportJob.service');
const { createImportJobController } = require('./importJob.controller');

const controller = createImportJobController(odpImportJobs, {
  startFailure: 'Gagal mengimpor data Excel ODP.',
  statusFailure: 'Gagal memuat status import Data ODP.',
  eventsFailure: 'Gagal memantau progres import Data ODP.'
});

module.exports = {
  importExcel: controller.start,
  importStatus: controller.status,
  importEvents: controller.events
};
