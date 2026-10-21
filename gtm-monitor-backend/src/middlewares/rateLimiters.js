const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// ─── RATE LIMITING (penyimpanan di memori; aplikasi berjalan 1 instance) ───
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const rateLimitHandler = (message) => (req, res, next, options) => {
  const resetTime = req.rateLimit?.resetTime;
  const minutes = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 60000)) : Math.ceil(options.windowMs / 60000);
  res.status(options.statusCode).json({
    success: false,
    code: 'RATE_LIMITED',
    message: `${message} Coba lagi dalam ${minutes} menit.`,
    error: `${message} Coba lagi dalam ${minutes} menit.`
  });
};

// Batas umum seluruh API per IP — menahan banjir request (bot/scraping) tanpa mengganggu pemakaian normal
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: rateLimitHandler('Terlalu banyak permintaan ke server.')
});

// Anti brute-force login: maksimal 10 percobaan GAGAL per IP dalam 10 menit (login berhasil tidak dihitung).
// Setelah batas tercapai, IP diblokir hingga jendela 10 menit tersebut habis.
const LOGIN_MAX_FAILED_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  limit: LOGIN_MAX_FAILED_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Terlalu banyak percobaan login gagal dari jaringan Anda.')
});

// Batas per akun (bukan per IP) untuk endpoint berat, agar user satu kantor/NAT tidak saling memblokir.
// Wajib dipasang SETELAH authenticateToken / requireAdmin.
const createUserLimiter = (limit, message) => rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.id ?? ipKeyGenerator(req.ip)}`,
  handler: rateLimitHandler(message)
});
const odpImportLimiter = createUserLimiter(10, 'Batas import Excel Data ODP tercapai (10x per 15 menit).');
const pairingImportLimiter = createUserLimiter(10, 'Batas import Excel Tsel One Pairing tercapai (10x per 15 menit).');
const programImageLimiter = createUserLimiter(10, 'Batas unggah gambar program tercapai (10x per 15 menit).');
const activityUploadLimiter = createUserLimiter(60, 'Batas unggah foto kegiatan tercapai (60x per 15 menit).');

// Import ODP memproses ribuan baris & menulis massal ke DB: hanya satu proses boleh berjalan sekaligus
let odpImportInProgress = false;
const odpImportLock = (req, res, next) => {
  if (odpImportInProgress) {
    return res.status(409).json({
      success: false,
      code: 'IMPORT_IN_PROGRESS',
      message: 'Import Data ODP lain sedang berjalan. Tunggu hingga selesai lalu coba lagi.',
      error: 'Import Data ODP lain sedang berjalan. Tunggu hingga selesai lalu coba lagi.'
    });
  }
  odpImportInProgress = true;
  res.on('close', () => { odpImportInProgress = false; });
  next();
};

module.exports = {
  apiLimiter,
  loginLimiter,
  odpImportLimiter,
  pairingImportLimiter,
  programImageLimiter,
  activityUploadLimiter,
  odpImportLock
};
