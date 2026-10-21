// Memuat .env & konstanta konfigurasi aplikasi. Wajib di-require paling awal (sebelum Prisma, Cloudinary, dll.)
const fs = require('fs');
const { BACKEND_ROOT } = require('./paths');
const path = require('path');

// Auto-load .env file if present
const envPath = path.join(BACKEND_ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > -1) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

// Clean channel_binding=require if present in DATABASE_URL as it causes connection failure with Neon pooler
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/&channel_binding=require/g, '').replace(/\?channel_binding=require/g, '');
}

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gtm-super-secret-key-2026';

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
if (!process.env.REFRESH_TOKEN_SECRET) {
  console.warn('⚠️ [Auth] REFRESH_TOKEN_SECRET belum diisi di .env, sementara memakai JWT_SECRET.');
}

// CORS hanya untuk origin terdaftar (dev Vite); produksi & LAN berjalan same-origin
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(o => o.trim()).filter(Boolean);

// Redis untuk antrean kerja BullMQ (OCR & import Excel ODP) — default: Redis di WSL Ubuntu (scripts/redis-wsl.js)
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
// Awalan key antrean di Redis (test suite memakai awalan sendiri agar tidak tercampur dengan data asli)
const QUEUE_PREFIX = process.env.QUEUE_PREFIX || 'gtm';

// Object storage S3-compatible (foto verifikasi & file sementara) — default: Garage di WSL (scripts/storage-wsl.js).
// Cloudflare R2 / AWS S3 cukup dengan mengganti nilai ini di .env.
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://127.0.0.1:3900';
const S3_REGION = process.env.S3_REGION || 'garage';
const S3_BUCKET = process.env.S3_BUCKET || 'gtm-media';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || '';
const S3_FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE || 'true').toLowerCase() === 'true';
if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.warn('⚠️ [Storage] S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY belum diisi di .env. Foto verifikasi & import ODP akan gagal.');
}

module.exports = {
  PORT, JWT_SECRET, REFRESH_TOKEN_SECRET, CORS_ORIGINS, REDIS_URL, QUEUE_PREFIX,
  S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE
};
