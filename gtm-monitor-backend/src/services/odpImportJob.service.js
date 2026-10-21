// Import Excel ODP lewat antrean kerja: file disimpan sementara → job BullMQ → worker.js menjalankan ETL
// (services/odpImport.service.js, logika sama seperti sebelumnya) → progres & hasil dipantau lewat SSE.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const paths = require('../config/paths');
const {
  QUEUE_NAMES, FINAL_STATES, getApiConnection, getQueue, assertQueueAvailable,
  getJobSnapshot, watchJob, lockKey, releaseLock
} = require('../queues');
const { decodeJobFailure } = require('../queues/jobFailure');

const QUEUE = QUEUE_NAMES.ODP_IMPORT;
// Hanya satu import ODP boleh berjalan sekaligus (berlaku untuk semua instance server). TTL = pengaman bila worker mati.
const ODP_IMPORT_LOCK_KEY = lockKey(QUEUE);
const LOCK_TTL_SEC = 2 * 60 * 60;

const PUBLIC_FAILURE_MESSAGE = 'Gagal mengimpor data Excel ODP.';
const IMPORT_IN_PROGRESS_BODY = {
  success: false,
  code: 'IMPORT_IN_PROGRESS',
  message: 'Import Data ODP lain sedang berjalan. Tunggu hingga selesai lalu coba lagi.',
  error: 'Import Data ODP lain sedang berjalan. Tunggu hingga selesai lalu coba lagi.'
};

// ID job import yang masih berjalan / menunggu, atau null. Kunci milik job yang sudah selesai dibersihkan.
async function getRunningImportJobId() {
  const connection = getApiConnection();
  const jobId = await connection.get(ODP_IMPORT_LOCK_KEY);
  if (!jobId) return null;
  const snapshot = await getJobSnapshot(QUEUE, jobId);
  if (snapshot && !FINAL_STATES.includes(snapshot.state)) return jobId;
  // Kunci baru dipasang sesaat sebelum job ditambahkan ke antrean — jangan dianggap basi
  if (!snapshot && (await connection.ttl(ODP_IMPORT_LOCK_KEY)) > LOCK_TTL_SEC - 60) return jobId;
  await releaseLock(connection, ODP_IMPORT_LOCK_KEY, jobId);
  return null;
}

async function startOdpImport({ file, user }) {
  if (!file || !file.buffer) {
    throw new AppError(400, { error: 'No file uploaded' });
  }
  await assertQueueAvailable(QUEUE);

  if (await getRunningImportJobId()) throw new AppError(409, IMPORT_IN_PROGRESS_BODY);
  const connection = getApiConnection();
  const jobId = crypto.randomUUID();
  const acquired = await connection.set(ODP_IMPORT_LOCK_KEY, jobId, 'EX', LOCK_TTL_SEC, 'NX');
  if (acquired !== 'OK') throw new AppError(409, IMPORT_IN_PROGRESS_BODY);

  const extension = (path.extname(file.originalname || '').toLowerCase().match(/^\.(xlsx|xls|csv)$/) || ['.xlsx'])[0];
  const filePath = path.join(paths.ODP_IMPORT_TMP_DIR, `${jobId}${extension}`);
  try {
    await fs.promises.mkdir(paths.ODP_IMPORT_TMP_DIR, { recursive: true });
    await fs.promises.writeFile(filePath, file.buffer);
    await getQueue(QUEUE).add('import', {
      filePath,
      originalName: file.originalname,
      requestedBy: user?.username || null
    }, { jobId });
  } catch (err) {
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    await releaseLock(connection, ODP_IMPORT_LOCK_KEY, jobId).catch(() => {});
    throw err;
  }

  console.log(`📥 [ODP Import] Job ${jobId} masuk antrean (${file.originalname}, ${(file.size / 1024 / 1024).toFixed(2)} MB, oleh ${user?.username || '-'})`);
  return {
    success: true,
    code: 'IMPORT_QUEUED',
    jobId,
    message: 'File diterima. Import Data ODP sedang diproses di latar belakang.'
  };
}

// Bentuk status job untuk klien: { jobId, state, progress: { stage, percent }, result? , error? }
function toClientState(snapshot) {
  const progress = snapshot.progress && typeof snapshot.progress === 'object'
    ? { stage: snapshot.progress.stage || null, percent: Number(snapshot.progress.percent) || 0 }
    : { stage: null, percent: Number(snapshot.progress) || 0 };
  const state = { jobId: snapshot.id, state: snapshot.state, progress };
  if (snapshot.state === 'completed') state.result = snapshot.returnvalue;
  if (snapshot.state === 'failed') state.error = decodeJobFailure(snapshot.failedReason, { publicMessage: PUBLIC_FAILURE_MESSAGE, jobId: snapshot.id });
  return state;
}

const notFound = () => new AppError(404, 'Proses import tidak ditemukan atau sudah kedaluwarsa.', 'IMPORT_JOB_NOT_FOUND');

async function getImportJob(jobId) {
  let snapshot;
  try {
    snapshot = await getJobSnapshot(QUEUE, jobId);
  } catch {
    throw new AppError(503, 'Layanan antrean (Redis) sedang tidak aktif. Hubungi administrator sistem lalu coba lagi.', 'QUEUE_UNAVAILABLE');
  }
  if (!snapshot) throw notFound();
  return toClientState(snapshot);
}

// onState(state | null) dipanggil setiap ada perubahan; null = job hilang (dibersihkan)
function watchImportJob(jobId, onState) {
  return watchJob(QUEUE, jobId, (snapshot) => onState(snapshot ? toClientState(snapshot) : null));
}

module.exports = {
  ODP_IMPORT_LOCK_KEY,
  IMPORT_IN_PROGRESS_BODY,
  getRunningImportJobId,
  startOdpImport,
  getImportJob,
  watchImportJob
};
