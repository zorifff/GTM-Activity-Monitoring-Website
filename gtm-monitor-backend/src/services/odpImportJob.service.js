// Import Excel ODP lewat antrean kerja (pola bersama: services/importJobs.js). ETL-nya sendiri ada di
// services/odpImport.service.js (logika sama seperti sebelumnya) dan dijalankan worker.js.
const { QUEUE_NAMES } = require('../queues');
const { createImportJobService } = require('./importJobs');

const odpImportJobs = createImportJobService({
  queue: QUEUE_NAMES.ODP_IMPORT,
  tmpName: 'odp-import',
  label: 'ODP Import',
  noFileBody: { error: 'No file uploaded' },
  inProgressMessage: 'Import Data ODP lain sedang berjalan. Tunggu hingga selesai lalu coba lagi.',
  queuedMessage: 'File diterima. Import Data ODP sedang diproses di latar belakang.',
  publicFailureMessage: 'Gagal mengimpor data Excel ODP.'
});

module.exports = {
  odpImportJobs,
  ODP_IMPORT_LOCK_KEY: odpImportJobs.LOCK_KEY,
  TMP_PREFIX: odpImportJobs.TMP_PREFIX,
  IMPORT_IN_PROGRESS_BODY: odpImportJobs.IMPORT_IN_PROGRESS_BODY
};
