// Menjalankan worker BullMQ untuk seluruh antrean (dipanggil worker.js). Satu job per antrean sekaligus:
// OCR & ETL sama-sama berat, dan import ODP / pairing memang tidak boleh berjalan bersamaan.
const { Worker } = require('bullmq');
const { QUEUE_PREFIX } = require('../config/env');
const { createRedisConnection } = require('../lib/redis');
const { listObjects, deleteObject, waitForStorage } = require('../lib/objectStorage');
const { QUEUE_NAMES } = require('../queues');
const { PAIRING_IMPORT_LOCK_KEY } = require('../services/pairingImportJob.service');
const { importPairingExcel, ensurePairingIndex } = require('../services/pairing.service');
const { processOcrJob } = require('./ocr.processor');
const { createOdpImportProcessor } = require('./odpImport.processor');
const { createImportProcessor } = require('./importJob.processor');

// Semua file sementara import (tmp/odp-import/, tmp/pairing-import/)
const TMP_ROOT = 'tmp/';

// File sementara yang tertinggal di object storage (mis. worker dimatikan paksa) dibersihkan setelah 1 hari
async function cleanStaleTempFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const stale = (await listObjects(TMP_ROOT)).filter(o => Date.now() - new Date(o.lastModified).getTime() > maxAgeMs);
    await Promise.all(stale.map(o => deleteObject(o.key).catch(() => {})));
    if (stale.length) console.log(`🧹 [Worker] ${stale.length} file sementara basi dihapus dari object storage`);
  } catch {
    // object storage belum aktif — dicoba lagi saat worker berikutnya dijalankan
  }
}

// overrides.odpImport: pengganti fungsi ETL ODP (khusus test suite)
function startWorkers(overrides = {}) {
  const connection = createRedisConnection({ label: 'Redis worker', blocking: true });
  const common = { connection, prefix: QUEUE_PREFIX, concurrency: 1 };

  const workers = [
    new Worker(QUEUE_NAMES.OCR, processOcrJob, { ...common, lockDuration: 60 * 1000 }),
    // ETL puluhan ribu baris dapat menahan event loop beberapa detik → lock diperpanjang agar job tidak dianggap macet
    new Worker(QUEUE_NAMES.ODP_IMPORT, createOdpImportProcessor({ connection, importFn: overrides.odpImport }), {
      ...common,
      lockDuration: 5 * 60 * 1000
    }),
    new Worker(QUEUE_NAMES.PAIRING_IMPORT, createImportProcessor({
      connection, lockKey: PAIRING_IMPORT_LOCK_KEY, label: 'Pairing Import', importFn: importPairingExcel
    }), { ...common, lockDuration: 5 * 60 * 1000 })
  ];

  // Tugas awal dijalankan setelah Redis & object storage siap (keduanya di WSL, butuh beberapa detik saat npm run dev):
  // bersihkan file sementara basi, lalu bangun ulang indeks pairing dari object storage bila Redis kosong.
  const pairingReady = (async () => {
    await connection.ping(); // menunggu Redis tersambung
    if (!(await waitForStorage())) {
      console.warn('⚠️ [Worker] Object storage belum dapat dijangkau setelah 60 detik — pembersihan file sementara & pengecekan indeks pairing dilewati.');
      return 'error';
    }
    await cleanStaleTempFiles();
    return ensurePairingIndex(connection);
  })().catch(err => {
    console.error('⚠️ [Pairing] Gagal menyiapkan indeks pencarian:', err.message);
    return 'error';
  });

  workers.forEach(worker => {
    worker.on('error', () => {}); // gangguan koneksi sudah dilaporkan lib/redis.js
    worker.on('completed', (job) => console.log(`✅ [${worker.name} ${job.id}] Selesai dalam ${((job.finishedOn - job.processedOn) / 1000).toFixed(2)} detik`));
    worker.on('failed', (job) => console.warn(`⚠️ [${worker.name} ${job ? job.id : '-'}] Gagal`));
  });

  return {
    workers,
    pairingReady,
    close: async () => {
      await Promise.all(workers.map(worker => worker.close()));
      await connection.quit().catch(() => {});
    }
  };
}

module.exports = { startWorkers };
