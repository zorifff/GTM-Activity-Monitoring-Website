const { pipeline } = require('stream/promises');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getObject } = require('../lib/objectStorage');
const { VERIFIED_PREFIX } = require('../services/photoStorage.service');

const notFound = () => new AppError(404, 'Foto tidak ditemukan.', 'MEDIA_NOT_FOUND');

// GET /media/verified/... (login) — foto kegiatan terverifikasi dialirkan dari object storage.
// Hanya prefix verified/ yang boleh dibuka (file sementara tmp/ & lainnya tidak pernah disajikan).
const serveMedia = asyncHandler(async (req, res) => {
  const segments = [].concat(req.params.key || []);
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\'))) {
    throw new AppError(400, 'Alamat foto tidak valid.', 'INVALID_MEDIA_PATH');
  }
  const key = segments.join('/');
  if (!key.startsWith(VERIFIED_PREFIX)) throw notFound();

  const object = await getObject(key, { ifNoneMatch: req.get('If-None-Match') });
  if (!object) throw notFound();

  res.set('Cache-Control', 'private, max-age=86400');
  if (object.notModified) {
    res.set('ETag', object.etag);
    return res.status(304).end();
  }

  res.set('Content-Type', object.contentType || 'application/octet-stream');
  if (object.contentLength !== undefined) res.set('Content-Length', String(object.contentLength));
  if (object.etag) res.set('ETag', object.etag);
  try {
    await pipeline(object.body, res);
  } catch (err) {
    // Pengguna menutup halaman sebelum foto selesai terkirim — bukan error server
    if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw err;
  }
}, 'Gagal memuat foto.');

// /database foto/... (format URL lama sebelum object storage) → /media/verified/... (hierarki sama)
const redirectLegacyPhoto = (req, res) => {
  res.redirect(301, `/media/${VERIFIED_PREFIX.slice(0, -1)}${req.url}`);
};

module.exports = { serveMedia, redirectLegacyPhoto };
