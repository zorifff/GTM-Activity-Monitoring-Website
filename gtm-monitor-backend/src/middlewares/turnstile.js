// Captcha Cloudflare Turnstile: token dari widget (body.turnstileToken) diverifikasi sebelum kredensial diperiksa.
// TURNSTILE_SECRET_KEY kosong → verifikasi dilewati (test suite backend).
const AppError = require('../utils/AppError');
const { TURNSTILE_SECRET_KEY } = require('../config/env');
const { verifyTurnstileToken } = require('../services/turnstile.service');

const REQUIRED_MESSAGE = 'Selesaikan verifikasi keamanan (captcha) terlebih dahulu.';
const EXPIRED_MESSAGE = 'Verifikasi keamanan sudah kedaluwarsa. Ulangi captcha, lalu login kembali.';
const INVALID_MESSAGE = 'Verifikasi keamanan gagal. Ulangi captcha, lalu login kembali.';
const UNAVAILABLE_MESSAGE = 'Layanan verifikasi keamanan tidak dapat dihubungi. Coba lagi beberapa saat.';

// action = nama aksi yang dipasang di widget frontend; dicocokkan bila Cloudflare mengembalikannya
const requireTurnstile = (action, { secret = TURNSTILE_SECRET_KEY } = {}) => async (req, res, next) => {
  if (!secret) return next();

  const token = req.body?.turnstileToken;
  if (!token) return next(new AppError(400, REQUIRED_MESSAGE, 'CAPTCHA_REQUIRED'));

  let result;
  try {
    result = await verifyTurnstileToken({ token, remoteIp: req.ip, secret });
  } catch (err) {
    console.error(`❌ [${req.id || '-'}] Turnstile siteverify gagal:`, err.message);
    return next(new AppError(503, UNAVAILABLE_MESSAGE, 'CAPTCHA_UNAVAILABLE'));
  }

  if (!result.success || (result.action && result.action !== action)) {
    const expired = result.errorCodes.includes('timeout-or-duplicate');
    return next(new AppError(400, expired ? EXPIRED_MESSAGE : INVALID_MESSAGE, 'CAPTCHA_INVALID'));
  }
  next();
};

module.exports = { requireTurnstile };
