// Lokasi folder di disk — terpusat agar tidak bergantung pada __dirname masing-masing file
const path = require('path');

// Folder gtm-monitor-backend (src/config → ../..)
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

module.exports = {
  BACKEND_ROOT,
  DATA_DIR: path.join(BACKEND_ROOT, 'data'),
  PROGRAMS_DIR: path.join(BACKEND_ROOT, 'data/programs'),
  PAIRING_DIR: path.join(BACKEND_ROOT, 'data/pairing'),
  // Foto kegiatan terverifikasi: database foto / <BRANCH> / <WOK> / <PROYEK> / <JENIS> / <MM_YYYY> / <FILE>
  PHOTO_DIR: path.join(BACKEND_ROOT, 'database foto'),
  UPLOADS_DIR: path.join(BACKEND_ROOT, 'uploads'),
  // File Excel ODP yang menunggu diproses worker (dihapus otomatis setelah job selesai; tidak disajikan ke web)
  ODP_IMPORT_TMP_DIR: path.join(BACKEND_ROOT, 'data/tmp/odp-import'),
  DEFAULT_PROGRAM_EXCEL: path.join(BACKEND_ROOT, 'data/Tracking_Program_August_2026.xlsx'),
  FRONTEND_DIST: path.join(BACKEND_ROOT, '../gtm-monitor-frontend/dist')
};
