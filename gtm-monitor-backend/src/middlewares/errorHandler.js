// ─── CENTRALIZED ERROR HANDLING ───
// Satu-satunya tempat respons error dibentuk. Detail internal (pesan Prisma, stack trace, path file) hanya
// ditulis ke log server bersama requestId — klien menerima pesan umum + requestId untuk pelacakan.
const { multer } = require('./uploads');
const AppError = require('../utils/AppError');

const GENERIC_MESSAGE = 'Terjadi kesalahan internal pada server.';

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Error yang memang untuk klien (dilempar service/controller)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.body);
  }

  // Kesalahan form data unggahan (file terlalu besar / tipe salah) = kesalahan input, bukan error server
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file melebihi batas yang diizinkan.' : `Form data tidak valid: ${err.message}`;
    return res.status(400).json({ success: false, message, error: message });
  }

  // Body JSON rusak (dari express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Format data JSON tidak valid.', error: 'Format data JSON tidak valid.' });
  }

  // Error 4xx yang ditandai secara eksplisit (mis. fileFilter multer foto kegiatan)
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ success: false, message: err.message, error: err.message }); // pesan input aman: error 4xx ditandai eksplisit untuk klien
  }

  // Error internal: log lengkap di server, pesan umum ke klien
  console.error(`❌ [${req.id || '-'}] ${req.method} ${req.originalUrl} — Unhandled Server Error:`, err);
  const message = err.publicMessage || GENERIC_MESSAGE;
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message,
    error: message,
    requestId: req.id
  });
};

module.exports = errorHandler;
