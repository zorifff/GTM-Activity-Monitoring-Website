// Import Excel Tsel One Pairing lewat antrean kerja (pola bersama: services/importJobs.js).
// Worker mengurai Excel lalu membangun indeks pencarian di Redis (services/pairing.service.js).
const { QUEUE_NAMES } = require('../queues');
const { createImportJobService } = require('./importJobs');

const pairingImportJobs = createImportJobService({
  queue: QUEUE_NAMES.PAIRING_IMPORT,
  tmpName: 'pairing-import',
  label: 'Pairing Import',
  noFileBody: { error: 'Tidak ada file Excel pairing yang diunggah.' },
  inProgressMessage: 'Import Data Tsel One Pairing lain sedang berjalan. Tunggu hingga selesai lalu coba lagi.',
  queuedMessage: 'File diterima. Data Tsel One Pairing sedang diproses di latar belakang.',
  publicFailureMessage: 'Gagal memproses file Excel pairing.'
});

module.exports = { pairingImportJobs, PAIRING_IMPORT_LOCK_KEY: pairingImportJobs.LOCK_KEY };
