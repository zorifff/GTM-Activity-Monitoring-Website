// Job "Import Excel ODP": ETL odpImport.service (logika sama seperti sebelumnya) lewat processor import bersama.
const { importOdpExcel } = require('../services/odpImport.service');
const { ODP_IMPORT_LOCK_KEY } = require('../services/odpImportJob.service');
const { createImportProcessor } = require('./importJob.processor');

// importFn bisa diganti (test suite) agar alur antrean diuji tanpa menulis ke database
const createOdpImportProcessor = ({ connection, importFn = importOdpExcel }) =>
  createImportProcessor({ connection, lockKey: ODP_IMPORT_LOCK_KEY, label: 'ODP Import', importFn });

module.exports = { createOdpImportProcessor };
