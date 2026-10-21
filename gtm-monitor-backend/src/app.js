// Merakit aplikasi Express: middleware global → rute API → 404 API → error handler terpusat → frontend statis.
// Urutan middleware sama dengan server.js versi monolitik.
require('./config/env');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const paths = require('./config/paths');
const requestId = require('./middlewares/requestId');
const { helmetMiddleware, corsMiddleware } = require('./middlewares/security');
const { apiLimiter } = require('./middlewares/rateLimiters');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes');
const { startAuthCleanupJob } = require('./services/auth.service');
const { initQueues } = require('./queues');

const app = express();

app.use(requestId);

// cloudflared meneruskan request dari localhost dengan header X-Forwarded-Proto: https
// & X-Forwarded-For (IP asli pengguna, dipakai rate limiter)
app.set('trust proxy', 'loopback');

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());

app.use('/api', apiLimiter);

// Serve /uploads & /database foto statically for frontend photo rendering (Dual Serving)
app.use('/uploads', express.static(paths.UPLOADS_DIR));
app.use('/database foto', express.static(paths.PHOTO_DIR));
app.use('/database%20foto', express.static(paths.PHOTO_DIR));

app.use('/api', apiRoutes);

// Dedicated API 404 handler: ensure API requests never fall back to HTML index.html
app.use('/api', notFound);

// Centralized error handling (API & uploads)
app.use(errorHandler);

// Frontend hasil build (produksi / akses LAN / Cloudflare)
if (fs.existsSync(paths.FRONTEND_DIST)) {
  app.use(express.static(paths.FRONTEND_DIST));
  app.use((req, res) => {
    res.sendFile(path.join(paths.FRONTEND_DIST, 'index.html'));
  });
}

// Bersihkan token & sesi kedaluwarsa secara berkala
startAuthCleanupJob();

// Koneksi antrean kerja (Redis/BullMQ) disiapkan sejak awal; bila Redis mati, server tetap berjalan
// dan hanya fitur OCR & import ODP yang menjawab 503
initQueues();

module.exports = app;
