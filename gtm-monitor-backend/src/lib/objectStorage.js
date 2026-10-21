// Object storage S3-compatible (Garage lokal / Cloudflare R2 / AWS S3) untuk berkas yang tidak boleh terikat ke disk server:
//   verified/<BRANCH>/<WOK>/<PROYEK>/<JENIS>/<MM_YYYY>/<file>   foto kegiatan terverifikasi
//   tmp/odp-import/<jobId>.xlsx                                  file Excel ODP yang menunggu diproses worker
require('../config/env');
const {
  S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadBucketCommand
} = require('@aws-sdk/client-s3');
const {
  S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE
} = require('../config/env');
const AppError = require('../utils/AppError');

const STORAGE_UNAVAILABLE_MESSAGE = 'Layanan penyimpanan berkas (object storage) sedang tidak aktif. Hubungi administrator sistem lalu coba lagi.';

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  // SDK versi baru menambah checksum CRC32 di setiap request; tidak semua server S3-compatible mendukungnya
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  maxAttempts: 2
});

const isNotFound = (err) => err?.name === 'NotFound' || err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404;
const isNotModified = (err) => err?.$metadata?.httpStatusCode === 304;

// Gangguan koneksi / kredensial → 503 untuk klien (detail asli tetap di log server)
function toStorageError(err, action, key) {
  if (err instanceof AppError) return err;
  console.error(`❌ [Storage] ${action} "${key}" gagal:`, err.name || '', err.message);
  return new AppError(503, STORAGE_UNAVAILABLE_MESSAGE, 'STORAGE_UNAVAILABLE');
}

async function putObject(key, body, contentType = 'application/octet-stream') {
  try {
    await client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  } catch (err) {
    throw toStorageError(err, 'Unggah', key);
  }
}

// Hasil: { body (stream), contentType, contentLength, etag, notModified } atau null bila objek tidak ada
async function getObject(key, { ifNoneMatch } = {}) {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key, IfNoneMatch: ifNoneMatch }));
    return { body: res.Body, contentType: res.ContentType, contentLength: res.ContentLength, etag: res.ETag, notModified: false };
  } catch (err) {
    if (isNotModified(err)) return { notModified: true, etag: ifNoneMatch };
    if (isNotFound(err)) return null;
    throw toStorageError(err, 'Baca', key);
  }
}

async function getObjectBuffer(key) {
  const object = await getObject(key);
  if (!object) return null;
  return Buffer.from(await object.body.transformToByteArray());
}

async function objectExists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw toStorageError(err, 'Cek', key);
  }
}

async function deleteObject(key) {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch (err) {
    if (isNotFound(err)) return;
    throw toStorageError(err, 'Hapus', key);
  }
}

// Seluruh objek dengan awalan tertentu: [{ key, size, lastModified }]
async function listObjects(prefix) {
  const items = [];
  let ContinuationToken;
  try {
    do {
      const res = await client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix, ContinuationToken }));
      (res.Contents || []).forEach(o => items.push({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
      ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (ContinuationToken);
  } catch (err) {
    throw toStorageError(err, 'Daftar', prefix);
  }
  return items;
}

// Menunggu object storage dapat dijangkau (dipakai saat start: layanan di WSL butuh beberapa detik). true bila siap.
async function waitForStorage({ timeoutMs = 60 * 1000, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
      return true;
    } catch {
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
  return false;
}

// Menutup koneksi keep-alive (skrip & test suite agar proses bisa selesai)
const closeStorage = () => client.destroy();

module.exports = {
  STORAGE_UNAVAILABLE_MESSAGE,
  closeStorage,
  waitForStorage,
  putObject,
  getObject,
  getObjectBuffer,
  objectExists,
  deleteObject,
  listObjects
};
