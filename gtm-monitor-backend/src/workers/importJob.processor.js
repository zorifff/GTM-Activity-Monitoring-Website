// Processor bersama untuk job import Excel (ODP & Tsel One Pairing): ambil file sementara dari object storage →
// jalankan fungsi import → laporkan progres → hapus file sementara & lepas kunci import (selalu, sukses maupun gagal).
const { getObjectBuffer, deleteObject } = require('../lib/objectStorage');
const { releaseLock } = require('../queues');
const { toJobFailure } = require('../queues/jobFailure');

// Progres dikirim paling sering tiap 400 ms per tahap (import bisa memanggil onProgress ratusan kali)
function createProgressReporter(job, minIntervalMs = 400) {
  let lastStage = null;
  let lastSentAt = 0;
  return (stage, percent) => {
    const now = Date.now();
    if (stage === lastStage && now - lastSentAt < minIntervalMs) return;
    lastStage = stage;
    lastSentAt = now;
    job.updateProgress({ stage, percent: Math.max(0, Math.min(100, Math.round(percent))) }).catch(() => {});
  };
}

// importFn({ file, onProgress, connection }) → hasil job (dikirim ke frontend apa adanya)
function createImportProcessor({ connection, lockKey, label, importFn }) {
  return async (job) => {
    const { storageKey, originalName } = job.data;
    const onProgress = createProgressReporter(job);
    console.log(`⚙️  [${label} ${job.id}] Mulai memproses ${originalName}`);
    try {
      onProgress('Menyiapkan file', 1);
      const buffer = await getObjectBuffer(storageKey);
      if (!buffer) throw new Error(`File sementara ${storageKey} tidak ditemukan di object storage`);
      return await importFn({ file: { buffer, originalname: originalName, size: buffer.length }, onProgress, connection });
    } catch (err) {
      throw toJobFailure(err, `[${label} ${job.id}]`);
    } finally {
      await deleteObject(storageKey).catch(() => {});
      await releaseLock(connection, lockKey, job.id).catch(() => {});
    }
  };
}

module.exports = { createImportProcessor, createProgressReporter };
