// Koneksi Redis untuk antrean kerja BullMQ. Alamat dari REDIS_URL (.env), default Redis lokal di WSL.
require('../config/env');
const IORedis = require('ioredis');
const { REDIS_URL } = require('../config/env');

// Alamat tanpa password untuk log
const redisLabel = (() => {
  try {
    const { hostname, port } = new URL(REDIS_URL);
    return `${hostname}:${port || 6379}`;
  } catch {
    return 'REDIS_URL';
  }
})();

const STARTUP_GRACE_MS = 20 * 1000;

// blocking = true untuk Worker/QueueEvents (wajib maxRetriesPerRequest: null, menunggu Redis kembali).
// blocking = false untuk sisi API: perintah langsung gagal saat Redis mati agar request segera mendapat 503, bukan menggantung.
function createRedisConnection({ label = 'Redis', blocking = false } = {}) {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: blocking ? null : 1,
    enableOfflineQueue: blocking,
    retryStrategy: (times) => Math.min(times * 500, 5000)
  });

  // Peringatan hanya sekali per gangguan (ioredis mencoba menyambung ulang tiap beberapa detik).
  // Saat start, Redis (WSL) bisa baru siap beberapa detik kemudian → gagal sambung di masa tunggu awal tidak dilaporkan.
  let disconnected = false;
  let everReady = false;
  let lastError = null;
  const warn = () => {
    if (disconnected) return;
    disconnected = true;
    console.warn(`⚠️ [${label}] Tidak terhubung ke Redis ${redisLabel}: ${lastError}. Mencoba menyambung ulang...`);
  };
  setTimeout(() => { if (!everReady && lastError) warn(); }, STARTUP_GRACE_MS).unref();
  connection.on('error', (err) => {
    lastError = err.code || err.message;
    if (everReady) warn();
  });
  connection.on('ready', () => {
    if (disconnected) console.log(`✅ [${label}] Terhubung kembali ke Redis ${redisLabel}.`);
    disconnected = false;
    everReady = true;
  });

  return connection;
}

module.exports = { createRedisConnection, redisLabel };
