// Job "Import Excel ODP": baca file sementara → ETL odpImport.service (logika sama seperti sebelumnya) → laporkan progres.
const fs = require('fs');
const { importOdpExcel } = require('../services/odpImport.service');
const { ODP_IMPORT_LOCK_KEY } = require('../services/odpImportJob.service');
const { releaseLock } = require('../queues');
const { toJobFailure } = require('../queues/jobFailure');

// Progres dikirim paling sering tiap 400 ms per tahap (ETL bisa memanggil onProgress ratusan kali)
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

// importFn bisa diganti (test suite) agar alur antrean diuji tanpa menulis ke database
function createOdpImportProcessor({ connection, importFn = importOdpExcel }) {
  return async (job) => {
    const { filePath, originalName } = job.data;
    const onProgress = createProgressReporter(job);
    console.log(`⚙️  [ODP Import ${job.id}] Mulai memproses ${originalName}`);
    try {
      onProgress('Menyiapkan file', 1);
      const buffer = await fs.promises.readFile(filePath);
      return await importFn({ file: { buffer, originalname: originalName, size: buffer.length }, onProgress });
    } catch (err) {
      throw toJobFailure(err, `[ODP Import ${job.id}]`);
    } finally {
      await fs.promises.rm(filePath, { force: true }).catch(() => {});
      await releaseLock(connection, ODP_IMPORT_LOCK_KEY, job.id).catch(() => {});
    }
  };
}

module.exports = { createOdpImportProcessor, createProgressReporter };
