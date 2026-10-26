// Tugas pemeliharaan terjadwal (BullMQ Job Scheduler, antrean "maintenance"): refresh materialized view metrik performa.
// Selain di akhir setiap import ODP (di dalam transaksinya), view di-refresh berkala sebagai pengaman bila data berubah
// di luar import. Dijadwalkan di Redis → hanya satu refresh per periode walau worker berjalan di beberapa instance.
const { PERFORMANCE_REFRESH_MINUTES } = require('../config/env');
const { refreshPerformanceViews } = require('../services/performance.service');

const PERFORMANCE_REFRESH_JOB = 'refresh-performance-views';

function schedulePerformanceRefresh(queue, minutes = PERFORMANCE_REFRESH_MINUTES) {
  return queue.upsertJobScheduler(PERFORMANCE_REFRESH_JOB, { every: minutes * 60 * 1000 }, {
    name: PERFORMANCE_REFRESH_JOB,
    opts: { removeOnComplete: { count: 20 }, removeOnFail: { count: 50 } }
  });
}

async function processMaintenanceJob(job) {
  if (job.name !== PERFORMANCE_REFRESH_JOB) throw new Error(`Job pemeliharaan tidak dikenal: ${job.name}`);
  const startedAt = Date.now();
  await refreshPerformanceViews();
  return { refreshedInMs: Date.now() - startedAt };
}

module.exports = { PERFORMANCE_REFRESH_JOB, schedulePerformanceRefresh, processMaintenanceJob };
