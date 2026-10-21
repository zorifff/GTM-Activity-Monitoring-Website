// Antrean kerja latar belakang (BullMQ di atas Redis). Server API hanya menaruh job & memantau statusnya;
// pekerjaan berat (OCR Tesseract, ETL Excel ODP) dijalankan proses terpisah worker.js (src/workers/).
const { Queue, QueueEvents, Job } = require('bullmq');
const { QUEUE_PREFIX } = require('../config/env');
const { createRedisConnection } = require('../lib/redis');
const AppError = require('../utils/AppError');

const QUEUE_NAMES = {
  OCR: 'ocr-scan',
  ODP_IMPORT: 'odp-import',
  PAIRING_IMPORT: 'pairing-import'
};

// Job yang sudah selesai disimpan sebentar agar hasilnya masih bisa dibaca frontend, lalu dibersihkan otomatis
const DEFAULT_JOB_OPTIONS = {
  attempts: 1,
  removeOnComplete: { age: 60 * 60, count: 200 },
  removeOnFail: { age: 24 * 60 * 60, count: 200 }
};

const FINAL_STATES = ['completed', 'failed'];

const QUEUE_UNAVAILABLE_MESSAGE = 'Layanan antrean (Redis) sedang tidak aktif. Hubungi administrator sistem lalu coba lagi.';
const WORKER_UNAVAILABLE_MESSAGE = 'Worker pemrosesan latar belakang sedang tidak aktif. Hubungi administrator sistem lalu coba lagi.';

let apiConnection = null;
const queues = new Map();
const eventStreams = new Map();

// Satu koneksi bersama untuk seluruh Queue di proses API
function getApiConnection() {
  if (!apiConnection) apiConnection = createRedisConnection({ label: 'Redis API' });
  return apiConnection;
}

function getQueue(name) {
  if (!queues.has(name)) {
    const queue = new Queue(name, { connection: getApiConnection(), prefix: QUEUE_PREFIX, defaultJobOptions: DEFAULT_JOB_OPTIONS });
    queue.on('error', () => {}); // status koneksi sudah dilaporkan lib/redis.js
    queues.set(name, queue);
  }
  return queues.get(name);
}

// QueueEvents (Redis stream) memberi tahu saat job berubah: progres / selesai / gagal
function getEventStream(name) {
  if (!eventStreams.has(name)) {
    const connection = createRedisConnection({ label: `Redis events ${name}`, blocking: true });
    const queueEvents = new QueueEvents(name, { connection, prefix: QUEUE_PREFIX });
    queueEvents.on('error', () => {});
    const listeners = new Map(); // jobId → Set<fn>
    const notify = ({ jobId }) => (listeners.get(jobId) || []).forEach(fn => fn());
    ['active', 'progress', 'completed', 'failed'].forEach(event => queueEvents.on(event, notify));
    eventStreams.set(name, { queueEvents, connection, listeners });
  }
  return eventStreams.get(name);
}

// Dipanggil saat server menyala agar koneksi & langganan event sudah siap sebelum request pertama
function initQueues() {
  Object.values(QUEUE_NAMES).forEach(name => {
    getQueue(name);
    getEventStream(name);
  });
}

// Tolak dengan 503 bila Redis mati atau belum ada worker yang mengerjakan antrean ini
async function assertQueueAvailable(name) {
  if (getApiConnection().status !== 'ready') {
    throw new AppError(503, QUEUE_UNAVAILABLE_MESSAGE, 'QUEUE_UNAVAILABLE');
  }
  let workers;
  try {
    workers = await getQueue(name).getWorkersCount();
  } catch {
    throw new AppError(503, QUEUE_UNAVAILABLE_MESSAGE, 'QUEUE_UNAVAILABLE');
  }
  if (workers === 0) {
    throw new AppError(503, WORKER_UNAVAILABLE_MESSAGE, 'WORKER_UNAVAILABLE');
  }
}

// Status job saat ini (null bila job tidak ada / sudah dibersihkan).
// Status dibaca SEBELUM data job: bila job selesai di antara keduanya, data yang dibaca sudah memuat hasil/alasan gagal.
async function getJobSnapshot(name, jobId) {
  const queue = getQueue(name);
  const state = await queue.getJobState(jobId);
  if (state === 'unknown') return null;
  const job = await Job.fromId(queue, jobId);
  if (!job) return null;
  return {
    id: job.id,
    state,
    progress: job.progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason
  };
}

// Memantau job: onSnapshot dipanggil setiap status/progres berubah. Sumber utama = QueueEvents;
// pengecekan berkala menjadi cadangan bila ada event yang terlewat (mis. Redis sempat terputus).
// Mengembalikan fungsi untuk berhenti memantau.
function watchJob(name, jobId, onSnapshot, { pollMs = 2000 } = {}) {
  const { listeners } = getEventStream(name);
  let stopped = false;
  let running = false;
  let pending = false;
  let lastKey = null;

  const refresh = async () => {
    if (stopped) return;
    if (running) { pending = true; return; }
    running = true;
    try {
      const snapshot = await getJobSnapshot(name, jobId);
      const key = JSON.stringify(snapshot ? [snapshot.state, snapshot.progress] : null);
      if (!stopped && key !== lastKey) {
        lastKey = key;
        onSnapshot(snapshot);
      }
    } catch {
      // Redis sementara tidak terjangkau — dicoba lagi pada pengecekan berikutnya
    } finally {
      running = false;
      if (pending) { pending = false; refresh(); }
    }
  };

  if (!listeners.has(jobId)) listeners.set(jobId, new Set());
  listeners.get(jobId).add(refresh);
  const timer = setInterval(refresh, pollMs);
  refresh();

  return () => {
    stopped = true;
    clearInterval(timer);
    const set = listeners.get(jobId);
    if (set) {
      set.delete(refresh);
      if (set.size === 0) listeners.delete(jobId);
    }
  };
}

// Menunggu job selesai (completed/failed). Reject bila melewati timeoutMs.
function waitForJob(name, jobId, timeoutMs) {
  return new Promise((resolve, reject) => {
    let stop = () => {};
    const timer = setTimeout(() => {
      stop();
      reject(new Error(`Job ${name}/${jobId} belum selesai setelah ${timeoutMs / 1000} detik`));
    }, timeoutMs);
    stop = watchJob(name, jobId, (snapshot) => {
      if (!snapshot || FINAL_STATES.includes(snapshot.state)) {
        clearTimeout(timer);
        stop();
        resolve(snapshot);
      }
    }, { pollMs: 1000 });
  });
}

// Menutup seluruh koneksi antrean di proses ini (shutdown / akhir test suite)
async function closeQueues() {
  // Koneksi yang dibuat sendiri tidak ditutup oleh BullMQ → ditutup manual
  await Promise.all([...eventStreams.values()].map(async ({ queueEvents, connection }) => {
    await queueEvents.close().catch(() => {});
    await connection.quit().catch(() => {});
  }));
  await Promise.all([...queues.values()].map(queue => queue.close().catch(() => {})));
  eventStreams.clear();
  queues.clear();
  if (apiConnection) await apiConnection.quit().catch(() => {});
  apiConnection = null;
}

// Kunci sederhana di Redis (berlaku lintas instance server). Dilepas hanya oleh pemilik nilainya.
const RELEASE_LOCK_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const lockKey = (name) => `${QUEUE_PREFIX}:lock:${name}`;
const releaseLock = (connection, key, owner) => connection.eval(RELEASE_LOCK_SCRIPT, 1, key, owner);

module.exports = {
  QUEUE_NAMES,
  FINAL_STATES,
  getApiConnection,
  getQueue,
  initQueues,
  closeQueues,
  assertQueueAvailable,
  getJobSnapshot,
  watchJob,
  waitForJob,
  lockKey,
  releaseLock
};
