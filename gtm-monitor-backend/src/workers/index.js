// Menjalankan worker BullMQ untuk seluruh antrean (dipanggil worker.js). Satu job per antrean sekaligus:
// OCR & ETL sama-sama berat, dan import ODP memang tidak boleh berjalan bersamaan.
const fs = require('fs');
const path = require('path');
const { Worker } = require('bullmq');
const { QUEUE_PREFIX } = require('../config/env');
const paths = require('../config/paths');
const { createRedisConnection } = require('../lib/redis');
const { QUEUE_NAMES } = require('../queues');
const { processOcrJob } = require('./ocr.processor');
const { createOdpImportProcessor } = require('./odpImport.processor');

// File sementara yang tertinggal (mis. worker dimatikan paksa) dibersihkan setelah 1 hari
function cleanStaleTempFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(paths.ODP_IMPORT_TMP_DIR)) return;
  for (const name of fs.readdirSync(paths.ODP_IMPORT_TMP_DIR)) {
    const filePath = path.join(paths.ODP_IMPORT_TMP_DIR, name);
    try {
      if (Date.now() - fs.statSync(filePath).mtimeMs > maxAgeMs) fs.rmSync(filePath, { force: true });
    } catch { /* file sedang dipakai / sudah terhapus */ }
  }
}

// overrides.odpImport: pengganti fungsi ETL (khusus test suite)
function startWorkers(overrides = {}) {
  cleanStaleTempFiles();
  const connection = createRedisConnection({ label: 'Redis worker', blocking: true });
  const common = { connection, prefix: QUEUE_PREFIX, concurrency: 1 };

  const workers = [
    new Worker(QUEUE_NAMES.OCR, processOcrJob, { ...common, lockDuration: 60 * 1000 }),
    // ETL puluhan ribu baris dapat menahan event loop beberapa detik → lock diperpanjang agar job tidak dianggap macet
    new Worker(QUEUE_NAMES.ODP_IMPORT, createOdpImportProcessor({ connection, importFn: overrides.odpImport }), {
      ...common,
      lockDuration: 5 * 60 * 1000
    })
  ];

  workers.forEach(worker => {
    worker.on('error', () => {}); // gangguan koneksi sudah dilaporkan lib/redis.js
    worker.on('completed', (job) => console.log(`✅ [${worker.name} ${job.id}] Selesai dalam ${((job.finishedOn - job.processedOn) / 1000).toFixed(2)} detik`));
    worker.on('failed', (job) => console.warn(`⚠️ [${worker.name} ${job ? job.id : '-'}] Gagal`));
  });

  return {
    workers,
    close: async () => {
      await Promise.all(workers.map(worker => worker.close()));
      await connection.quit().catch(() => {});
    }
  };
}

module.exports = { startWorkers };
