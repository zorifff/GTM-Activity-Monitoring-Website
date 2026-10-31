const helmet = require('helmet');
const cors = require('cors');
const { CORS_ORIGINS } = require('../config/env');

// ─── HELMET: header keamanan HTTP standar + Content Security Policy ───
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // Cloudflare Turnstile (captcha login): script widget + iframe tantangan
      scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
      frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
      // 'unsafe-inline' hanya untuk style (gaya inline React/html2canvas); script inline tetap diblokir
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      // Foto kegiatan & gambar program tersimpan di Cloudinary; ikon favicon berupa data URI
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      // fetch gambar Cloudinary untuk tombol unduh gambar program
      connectSrc: ["'self'", 'https://res.cloudinary.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      // Dinonaktifkan: akses lewat IP LAN masih HTTP, upgrade otomatis ke HTTPS akan merusaknya
      upgradeInsecureRequests: null
    }
  },
  // HSTS hanya berlaku saat diakses via HTTPS (Cloudflare); tidak memaksa subdomain lain
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: false }
});

// CORS hanya untuk origin terdaftar (dev Vite); produksi & LAN berjalan same-origin
const corsMiddleware = cors({ origin: CORS_ORIGINS, credentials: true });

module.exports = { helmetMiddleware, corsMiddleware };
