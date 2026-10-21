// Entry point worker latar belakang (OCR gambar program & import Excel ODP), terpisah dari server API.
// Dijalankan oleh npm run dev / npm run worker (root) / pm2 app "gtm-worker". Butuh Redis (REDIS_URL di .env).
require('./src/config/env');
const { startWorkers } = require('./src/workers');
const { redisLabel } = require('./src/lib/redis');

process.on('unhandledRejection', (reason) => {
  console.error('❌ [Worker Unhandled Rejection]', reason);
});
process.on('uncaughtException', (error) => {
  console.error('❌ [Worker Uncaught Exception]', error);
});

const runtime = startWorkers();
console.log(`Worker is running (Redis ${redisLabel}): ${runtime.workers.map(w => w.name).join(', ')}`);

// Berhenti dengan rapi: job yang sedang berjalan diselesaikan dulu
let stopping = false;
const shutdown = async (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`🛑 [Worker] ${signal} diterima, menunggu job berjalan selesai...`);
  await runtime.close();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
