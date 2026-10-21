// Pola bersama untuk import Excel lewat antrean kerja (dipakai Import Data ODP & Tsel One Pairing):
// file disimpan sementara di object storage (tmp/<nama>/) → job BullMQ → worker.js memproses → progres & hasil via SSE.
// Hanya satu import per jenis boleh berjalan sekaligus (kunci di Redis, berlaku untuk semua instance server).
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { putObject, deleteObject } = require('../lib/objectStorage');
const {
  FINAL_STATES, getApiConnection, getQueue, assertQueueAvailable, getJobSnapshot, watchJob, lockKey, releaseLock
} = require('../queues');
const { decodeJobFailure } = require('../queues/jobFailure');

// TTL kunci = pengaman bila worker mati di tengah proses
const LOCK_TTL_SEC = 2 * 60 * 60;
const JOB_NOT_FOUND_MESSAGE = 'Proses import tidak ditemukan atau sudah kedaluwarsa.';
const QUEUE_DOWN_MESSAGE = 'Layanan antrean (Redis) sedang tidak aktif. Hubungi administrator sistem lalu coba lagi.';

const textBody = (code, message) => ({ success: false, code, message, error: message });

/**
 * @param {object} opts
 * @param {string} opts.queue          nama antrean (QUEUE_NAMES.*)
 * @param {string} opts.tmpName        folder file sementara di bucket (tmp/<tmpName>/)
 * @param {string} opts.label          label log, mis. "ODP Import"
 * @param {object} opts.noFileBody     body 400 bila file tidak ada (pesan sama seperti versi sebelumnya)
 * @param {string} opts.inProgressMessage   pesan 409 saat import lain masih berjalan
 * @param {string} opts.queuedMessage       pesan 202 saat file diterima
 * @param {string} opts.publicFailureMessage pesan umum untuk error internal (500)
 */
function createImportJobService(opts) {
  const LOCK_KEY = lockKey(opts.queue);
  const TMP_PREFIX = `tmp/${opts.tmpName}/`;
  const IMPORT_IN_PROGRESS_BODY = textBody('IMPORT_IN_PROGRESS', opts.inProgressMessage);

  // ID job import yang masih berjalan / menunggu, atau null. Kunci milik job yang sudah selesai dibersihkan.
  async function getRunningJobId() {
    const connection = getApiConnection();
    const jobId = await connection.get(LOCK_KEY);
    if (!jobId) return null;
    const snapshot = await getJobSnapshot(opts.queue, jobId);
    if (snapshot && !FINAL_STATES.includes(snapshot.state)) return jobId;
    // Kunci baru dipasang sesaat sebelum job ditambahkan ke antrean — jangan dianggap basi
    if (!snapshot && (await connection.ttl(LOCK_KEY)) > LOCK_TTL_SEC - 60) return jobId;
    await releaseLock(connection, LOCK_KEY, jobId);
    return null;
  }

  async function start({ file, user }) {
    if (!file || !file.buffer) throw new AppError(400, opts.noFileBody);
    await assertQueueAvailable(opts.queue);

    if (await getRunningJobId()) throw new AppError(409, IMPORT_IN_PROGRESS_BODY);
    const connection = getApiConnection();
    const jobId = crypto.randomUUID();
    const acquired = await connection.set(LOCK_KEY, jobId, 'EX', LOCK_TTL_SEC, 'NX');
    if (acquired !== 'OK') throw new AppError(409, IMPORT_IN_PROGRESS_BODY);

    const extension = (path.extname(file.originalname || '').toLowerCase().match(/^\.(xlsx|xls|csv)$/) || ['.xlsx'])[0];
    const storageKey = `${TMP_PREFIX}${jobId}${extension}`;
    try {
      await putObject(storageKey, file.buffer, file.mimetype || 'application/octet-stream');
      await getQueue(opts.queue).add('import', {
        storageKey,
        originalName: file.originalname,
        requestedBy: user?.username || null
      }, { jobId });
    } catch (err) {
      await deleteObject(storageKey).catch(() => {});
      await releaseLock(connection, LOCK_KEY, jobId).catch(() => {});
      throw err;
    }

    console.log(`📥 [${opts.label}] Job ${jobId} masuk antrean (${file.originalname}, ${(file.size / 1024 / 1024).toFixed(2)} MB, oleh ${user?.username || '-'})`);
    return { success: true, code: 'IMPORT_QUEUED', jobId, message: opts.queuedMessage };
  }

  // Bentuk status job untuk klien: { jobId, state, progress: { stage, percent }, result? , error? }
  function toClientState(snapshot) {
    const progress = snapshot.progress && typeof snapshot.progress === 'object'
      ? { stage: snapshot.progress.stage || null, percent: Number(snapshot.progress.percent) || 0 }
      : { stage: null, percent: Number(snapshot.progress) || 0 };
    const state = { jobId: snapshot.id, state: snapshot.state, progress };
    if (snapshot.state === 'completed') state.result = snapshot.returnvalue;
    if (snapshot.state === 'failed') state.error = decodeJobFailure(snapshot.failedReason, { publicMessage: opts.publicFailureMessage, jobId: snapshot.id });
    return state;
  }

  async function getJob(jobId) {
    let snapshot;
    try {
      snapshot = await getJobSnapshot(opts.queue, jobId);
    } catch {
      throw new AppError(503, QUEUE_DOWN_MESSAGE, 'QUEUE_UNAVAILABLE');
    }
    if (!snapshot) throw new AppError(404, JOB_NOT_FOUND_MESSAGE, 'IMPORT_JOB_NOT_FOUND');
    return toClientState(snapshot);
  }

  // onState(state | null) dipanggil setiap ada perubahan; null = job hilang (dibersihkan)
  function watch(jobId, onState) {
    return watchJob(opts.queue, jobId, (snapshot) => onState(snapshot ? toClientState(snapshot) : null));
  }

  return { LOCK_KEY, TMP_PREFIX, IMPORT_IN_PROGRESS_BODY, label: opts.label, getRunningJobId, start, getJob, watch };
}

module.exports = { createImportJobService, JOB_NOT_FOUND_MESSAGE, textBody };
