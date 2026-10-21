const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Auto-load .env file if present
const envPath = path.join(__dirname, '.env');
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

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary');
const Tesseract = require('tesseract.js');
const crypto = require('crypto');

const app = express();
const prisma = new PrismaClient(process.env.DATABASE_URL ? {
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
} : undefined);

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gtm-super-secret-key-2026';

const BRANCH_COORDS = {
  MAGELANG: { lat: -7.4797, lon: 110.2177 },
  PEKALONGAN: { lat: -6.8886, lon: 109.6753 },
  PURWOKERTO: { lat: -7.4245, lon: 109.2302 },
  SEMARANG: { lat: -7.0051, lon: 110.4381 },
  SURAKARTA: { lat: -7.5755, lon: 110.8243 },
  YOGYAKARTA: { lat: -7.7956, lon: 110.3695 }
};

function getOdpCoords(odpName, branchName, existingLat, existingLon) {
  if (typeof existingLat === 'number' && typeof existingLon === 'number' && !isNaN(existingLat) && !isNaN(existingLon)) {
    return { lat: existingLat, lon: existingLon };
  }
  const base = BRANCH_COORDS[branchName?.toString().trim().toUpperCase()] || { lat: -7.25, lon: 110.0 };
  let h = 0;
  for (let i = 0; i < (odpName || '').length; i++) {
    h = ((h << 5) - h) + odpName.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h);
  const latOffset = ((abs % 1000) - 500) * 0.0003;
  const lonOffset = (((abs / 1000) | 0) % 1000 - 500) * 0.0003;
  return { lat: base.lat + latOffset, lon: base.lon + lonOffset };
}

// ─── CLOUDINARY CONFIGURATION (STAGING FOR UNVERIFIED PHOTOS) ───
// Kredensial Cloudinary WAJIB diisi lewat file .env (lihat .env.example)
const missingCloudinaryEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  .filter(key => !process.env[key]);
if (missingCloudinaryEnv.length > 0) {
  console.warn(`⚠️ [Cloudinary] Variabel .env belum diisi: ${missingCloudinaryEnv.join(', ')}. Upload foto & gambar program akan gagal.`);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: Upload buffer photo to Cloudinary staging
const uploadToCloudinary = (fileBuffer, folder = 'gtm_staging') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder: folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper: Delete photo from Cloudinary
const deleteFromCloudinary = async (urlOrPublicId) => {
  if (!urlOrPublicId) return;
  try {
    let publicId = urlOrPublicId;
    if (urlOrPublicId.includes('res.cloudinary.com')) {
      const parts = urlOrPublicId.split('/upload/');
      if (parts[1]) {
        const pathAndExt = parts[1].replace(/^v\d+\//, '');
        publicId = pathAndExt.substring(0, pathAndExt.lastIndexOf('.'));
      }
    }
    if (publicId && !publicId.startsWith('/')) {
      console.log('🧹 [Cloudinary Cleanup] Destroying publicId:', publicId);
      await cloudinary.v2.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error('⚠️ [Cloudinary Destroy Error]:', err.message);
  }
};

// Helper: Download image buffer from remote Cloudinary URL
const downloadBuffer = (url) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Gagal mengunduh gambar dari Cloudinary, status code: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', err => reject(err));
    }).on('error', err => reject(err));
  });
};

// Helper: Sanitize folder/file name for OS compatibility
const sanitizeFolderName = (str) => {
  if (!str) return 'UNKNOWN';
  return str.toString().trim()
    .replace(/[\\/:*?"<>|]/g, '-') // Replace OS forbidden characters with hyphen
    .replace(/\s+/g, ' ')          // Collapse multiple spaces
    .trim();
};

// Helper: Get Activity Label for Folder & File Prefix
const getActivityLabel = (type) => {
  switch (type) {
    case 'tsel_menyapa':
      return 'TSEL MENYAPA WARGA';
    case 'branding_outlet':
      return 'BRANDING DOWNLINE OUTLET';
    case 'bumdes':
      return 'KERJASAMA DENGAN BUMDES';
    case 'rekrutmen_sf':
      return 'REKRUTMEN SF AKAMSI';
    case 'open_table':
      return 'ALWAYS ON OPEN TABLE';
    default:
      return (type || 'ACTIVITY').toUpperCase().replace(/_/g, ' ');
  }
};

// Helper: Save verified Cloudinary photo to structured local disk directory
// Hierarchy: database foto / <BRANCH> / <WOK> / <NAMA PROYEK> / <JENIS ACTIVITY> / <MM_YYYY> / <FILENAME>
// Filename: <ACT_3>_<BRANCH_3>_<WOK_3>_<NAMA_PROYEK>_<DDMMYYYY>_<HHMMSS>.[ext]
const saveVerifiedPhotoToLocal = async (photoUrl, rawBranch, rawWok, rawProjectName, type, planDate) => {
  if (!photoUrl || !photoUrl.includes('res.cloudinary.com')) {
    return photoUrl; // Already local or empty
  }

  try {
    const branchFolder = sanitizeFolderName(rawBranch || 'UNKNOWN_BRANCH').toUpperCase();
    const wokFolder = sanitizeFolderName(rawWok || 'UNKNOWN_WOK').toUpperCase();
    const projectFolder = sanitizeFolderName(rawProjectName || 'UNKNOWN_PROJECT');
    const actLabel = getActivityLabel(type).toUpperCase();

    const d = planDate ? new Date(planDate) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;

    const year = validDate.getFullYear();
    const month = String(validDate.getMonth() + 1).padStart(2, '0');
    const day = String(validDate.getDate()).padStart(2, '0');

    const monthYear = `${month}_${year}`;       // e.g. 08_2026
    const ddmmyyyy = `${day}${month}${year}`;  // e.g. 07082026

    // Current time HHMMSS for verification timestamp
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const hhmmss = `${hh}${mm}${ss}`;          // e.g. 141414

    // 3-letter prefixes (uppercase)
    const act3 = actLabel.substring(0, 3).toUpperCase();
    const branch3 = branchFolder.substring(0, 3).toUpperCase();
    const wok3 = wokFolder.substring(0, 3).toUpperCase();

    // Directory: database foto / branch / WOK / project / activity / (Bulan_tahun)
    const targetDir = path.join(__dirname, 'database foto', branchFolder, wokFolder, projectFolder, actLabel, monthYear);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Determine extension from URL
    let ext = '.jpg';
    const matchExt = photoUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i);
    if (matchExt) {
      ext = `.${matchExt[1].toLowerCase()}`;
    }

    // File name format: TSE_PEK_BAT_ODP-123_07082026_141414.jpg
    const baseFileName = `${act3}_${branch3}_${wok3}_${projectFolder}_${ddmmyyyy}_${hhmmss}`;
    let fileName = `${baseFileName}${ext}`;
    let filePath = path.join(targetDir, fileName);

    // Handle collisions safely if verified at exact same second
    let counter = 1;
    while (fs.existsSync(filePath)) {
      fileName = `${baseFileName}_${counter}${ext}`;
      filePath = path.join(targetDir, fileName);
      counter++;
    }

    console.log(`📥 [Auto Local Download] Downloading verified photo from Cloudinary to: ${filePath}`);
    const imgBuffer = await downloadBuffer(photoUrl);
    fs.writeFileSync(filePath, imgBuffer);

    // Web-accessible URL path
    const localWebPath = `/database foto/${branchFolder}/${wokFolder}/${projectFolder}/${actLabel}/${monthYear}/${fileName}`;

    // Clean up temporary Cloudinary staging photo
    await deleteFromCloudinary(photoUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));

    return localWebPath;
  } catch (err) {
    console.error('❌ [Auto Local Download Error]:', err);
    return photoUrl; // Fallback to original URL on error
  }
};

// cloudflared meneruskan request dari localhost dengan header X-Forwarded-Proto: https
app.set('trust proxy', 'loopback');

// CORS hanya untuk origin terdaftar (dev Vite); produksi & LAN berjalan same-origin
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Health check endpoint for uptime monitoring & auto-healing watchdog
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Memory Storage for Photo Uploads (Staging ke Cloudinary sebelum terverifikasi)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Maksimal 10 MB per foto
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (.jpg, .jpeg, .png, .webp) yang diperbolehkan!'));
    }
  }
});

// Serve /uploads & /database foto statically for frontend photo rendering (Dual Serving)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/database foto', express.static(path.join(__dirname, 'database foto')));
app.use('/database%20foto', express.static(path.join(__dirname, 'database foto')));

// Multer memory storage for Excel ODP files (.xlsx, .xls, .csv)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname) || (file.mimetype && (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype.includes('csv')))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel/CSV (.xlsx, .xls, .csv) yang diperbolehkan!'));
    }
  }
});

// Multer memory storage for Program Tracking Image files (.jpg, .png, .jpeg, .webp)
const programImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png|webp)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (.jpg, .jpeg, .png, .webp) yang diperbolehkan untuk tracking program!'));
    }
  }
});

// Multer memory storage for Tsel One Pairing Excel files (.xlsx, .xls, .csv)
const pairingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname) || (file.mimetype && (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype.includes('csv')))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel/CSV (.xlsx, .xls, .csv) yang diperbolehkan untuk data Tsel One Pairing!'));
    }
  }
});

// --- Authentication: Dual-Token (Access Token 15 menit + Refresh Token 7 hari, rotasi & revocation list) ---

// Kedua token hanya disimpan di cookie HttpOnly (tidak dapat dibaca JavaScript di browser)
const ACCESS_COOKIE = 'gtm_access_token';
const REFRESH_COOKIE = 'gtm_refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth'; // Refresh token hanya ikut terkirim ke endpoint auth
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;      // 15 menit
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 hari sejak login
// Refresh token lama yang dipakai ulang dalam jendela ini dianggap balapan antar-tab, bukan pencurian
const REFRESH_REUSE_GRACE_MS = 30 * 1000;
// Status sesi aktif di-cache sebentar agar pengecekan revocation di tiap request tetap ringan
const SESSION_CACHE_TTL_MS = 30 * 1000;

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
if (!process.env.REFRESH_TOKEN_SECRET) {
  console.warn('⚠️ [Auth] REFRESH_TOKEN_SECRET belum diisi di .env, sementara memakai JWT_SECRET.');
}

// Secure hanya bisa dipakai di HTTPS / localhost; akses HTTP via IP LAN akan ditolak browser bila Secure dipaksa
const isSecureRequest = (req) => {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return req.secure || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
};

const getCookieOptions = (req, cookiePath = '/') => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: isSecureRequest(req),
  path: cookiePath
});

const setAccessCookie = (req, res, token) => {
  res.cookie(ACCESS_COOKIE, token, { ...getCookieOptions(req), maxAge: ACCESS_TOKEN_TTL_MS });
};

const setRefreshCookie = (req, res, token, expiresAt) => {
  res.cookie(REFRESH_COOKIE, token, { ...getCookieOptions(req, REFRESH_COOKIE_PATH), expires: expiresAt });
};

const clearAccessCookie = (req, res) => {
  res.clearCookie(ACCESS_COOKIE, getCookieOptions(req));
};

const clearAuthCookies = (req, res) => {
  clearAccessCookie(req, res);
  res.clearCookie(REFRESH_COOKIE, getCookieOptions(req, REFRESH_COOKIE_PATH));
};

// Database hanya menyimpan sidik jari HMAC-SHA256 — token asli tidak bisa dipulihkan meski database bocor
const hashRefreshToken = (token) => crypto.createHmac('sha256', REFRESH_TOKEN_SECRET).update(token).digest('hex');
const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const toPublicUser = ({ id, username, role, branchName, fullName }) => ({ id, username, role, branchName, fullName });
const buildPublicUser = (dbUser) => toPublicUser({ ...dbUser, branchName: dbUser.branch ? dbUser.branch.name : null });

const signAccessToken = (publicUser, sessionId) =>
  jwt.sign({ ...publicUser, sid: sessionId }, JWT_SECRET, { expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) });

const activeSessionCache = new Map(); // sessionId -> { id, userId, expiresAt, cachedUntil }

// Revocation list: sesi dianggap aktif hanya jika ada di DB, belum dicabut, dan belum kedaluwarsa
async function getActiveSession(sessionId) {
  if (!sessionId) return null;
  const now = Date.now();
  const cached = activeSessionCache.get(sessionId);
  if (cached && cached.cachedUntil > now) {
    return cached.expiresAt > now ? cached : null;
  }

  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true }
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now) {
    activeSessionCache.delete(sessionId);
    return null;
  }

  const entry = { id: session.id, userId: session.userId, expiresAt: session.expiresAt.getTime(), cachedUntil: now + SESSION_CACHE_TTL_MS };
  activeSessionCache.set(sessionId, entry);
  return entry;
}

// Pembatalan sesi paksa (berlaku seketika di server ini karena cache ikut dihapus)
async function revokeSessions(where, reason) {
  const targets = await prisma.authSession.findMany({ where: { ...where, revokedAt: null }, select: { id: true } });
  if (targets.length === 0) return 0;
  const ids = targets.map(s => s.id);
  await prisma.authSession.updateMany({
    where: { id: { in: ids } },
    data: { revokedAt: new Date(), revokedReason: reason }
  });
  ids.forEach(id => activeSessionCache.delete(id));
  return ids.length;
}

const sendUnauthorized = (res, message, code) => res.status(401).json({ success: false, code, message });

const authenticateToken = (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return sendUnauthorized(res, 'Akses ditolak. Sesi tidak ditemukan.', 'NO_SESSION');

  jwt.verify(token, JWT_SECRET, async (err, payload) => {
    if (err) {
      clearAccessCookie(req, res);
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      return sendUnauthorized(res, 'Sesi telah berakhir. Silakan login kembali.', code);
    }

    try {
      const session = await getActiveSession(payload.sid);
      if (!session) {
        clearAccessCookie(req, res);
        return sendUnauthorized(res, 'Sesi telah dibatalkan. Silakan login kembali.', 'SESSION_REVOKED');
      }
      req.user = payload;
      req.authSession = session;
      next();
    } catch (dbErr) {
      console.error('Error checking auth session:', dbErr);
      res.status(503).json({ success: false, message: 'Gagal memverifikasi sesi. Silakan coba lagi.' });
    }
  });
};

const optionalAuthenticateToken = (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) req.user = null;
    else req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Administrator yang dapat melakukan tindakan ini.' });
    }
  });
};

// --- Auth Endpoints ---

// Login User / Admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const cleanUsername = username.toString().trim();
    const cleanPassword = password.toString().trim();

    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      include: { branch: true }
    }).catch(() => null);

    if (!user) {
      user = await prisma.user.findFirst({
        where: { username: { equals: cleanUsername, mode: 'insensitive' } },
        include: { branch: true }
      }).catch(() => null);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const validPassword = await bcrypt.compare(cleanPassword, user.password).catch(() => false);

    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const publicUser = buildPublicUser(user);
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const refreshToken = generateRefreshToken();

    const session = await prisma.authSession.create({
      data: {
        userId: user.id,
        expiresAt: sessionExpiresAt,
        userAgent: (req.get('user-agent') || '').slice(0, 255) || null,
        ipAddress: req.ip || null,
        refreshTokens: {
          create: { tokenHash: hashRefreshToken(refreshToken), expiresAt: sessionExpiresAt }
        }
      }
    });

    setAccessCookie(req, res, signAccessToken(publicUser, session.id));
    setRefreshCookie(req, res, refreshToken, sessionExpiresAt);
    res.json({
      success: true,
      user: publicUser,
      expiresAt: sessionExpiresAt.getTime()
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal saat login.' });
  }
});

// Refresh Token Rotation: tukar refresh token (cookie) dengan access token + refresh token baru.
// Hasil: { ok: true, user, expiresAt } atau { ok: false, status, code, message }
async function rotateRefreshToken(req, res) {
  const failure = (message, code) => {
    clearAuthCookies(req, res);
    return { ok: false, status: 401, code, message };
  };
  const race = { ok: false, status: 409, code: 'REFRESH_RACE', message: 'Sesi baru saja diperbarui oleh tab lain.' };

  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) return failure('Sesi tidak ditemukan. Silakan login kembali.', 'NO_SESSION');

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    include: { session: { include: { user: { include: { branch: true } } } } }
  });
  if (!stored) return failure('Sesi tidak valid. Silakan login kembali.', 'REFRESH_INVALID');

  const { session } = stored;
  const now = new Date();
  if (session.revokedAt || session.expiresAt <= now || stored.expiresAt <= now) {
    return failure('Sesi telah berakhir. Silakan login kembali.', 'SESSION_REVOKED');
  }

  // Refresh token sekali pakai: pemakaian ulang di luar jendela toleransi = indikasi token dicuri
  if (stored.rotatedAt) {
    if (now.getTime() - stored.rotatedAt.getTime() <= REFRESH_REUSE_GRACE_MS) return race;
    await revokeSessions({ id: session.id }, 'reuse_detected');
    console.warn(`🚨 [Auth] Refresh token lama dipakai ulang (sesi ${session.id}, user ${session.userId}). Sesi dicabut.`);
    return failure('Sesi dibatalkan demi keamanan. Silakan login kembali.', 'SESSION_REVOKED');
  }

  // Rotasi atomik: hanya satu request yang berhasil menukar token yang sama
  const newRefreshToken = generateRefreshToken();
  const rotated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, rotatedAt: null },
      data: { rotatedAt: now }
    });
    if (count === 0) return false;
    await tx.refreshToken.create({
      data: { tokenHash: hashRefreshToken(newRefreshToken), sessionId: session.id, expiresAt: session.expiresAt }
    });
    await tx.authSession.update({ where: { id: session.id }, data: { lastUsedAt: now } });
    return true;
  });
  if (!rotated) return race;

  // Data user dibaca ulang dari DB agar perubahan role/branch langsung berlaku
  const publicUser = buildPublicUser(session.user);
  setAccessCookie(req, res, signAccessToken(publicUser, session.id));
  setRefreshCookie(req, res, newRefreshToken, session.expiresAt);
  return { ok: true, user: publicUser, expiresAt: session.expiresAt.getTime() };
}

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const result = await rotateRefreshToken(req, res);
    if (result.ok) return res.json({ success: true, user: result.user, expiresAt: result.expiresAt });
    res.status(result.status).json({ success: false, code: result.code, message: result.message });
  } catch (error) {
    console.error('Error in /api/auth/refresh:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui sesi.' });
  }
});

// Status login saat aplikasi dibuka — selalu 200 (pengunjung tanpa sesi bukan error).
// Bila access token habis tapi refresh token masih sah, sesi diperbarui sekaligus dalam request ini.
app.get('/api/auth/session', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const accessToken = req.cookies?.[ACCESS_COOKIE];
    if (accessToken) {
      try {
        const payload = jwt.verify(accessToken, JWT_SECRET);
        const session = await getActiveSession(payload.sid);
        if (session) {
          return res.json({ success: true, authenticated: true, user: toPublicUser(payload), expiresAt: session.expiresAt });
        }
      } catch { /* access token habis / tidak sah: lanjut coba refresh token */ }
    }

    if (req.cookies?.[REFRESH_COOKIE]) {
      const result = await rotateRefreshToken(req, res);
      if (result.ok) {
        return res.json({ success: true, authenticated: true, user: result.user, expiresAt: result.expiresAt });
      }
      // Tab lain sedang memperbarui sesi yang sama: frontend cukup mengulang permintaan ini
      if (result.status === 409) return res.json({ success: true, authenticated: false, retry: true });
    } else if (accessToken) {
      clearAccessCookie(req, res);
    }

    res.json({ success: true, authenticated: false });
  } catch (error) {
    console.error('Error in /api/auth/session:', error);
    res.status(503).json({ success: false, message: 'Gagal memeriksa sesi login.' });
  }
});

// Validasi sesi aktif (frontend menanyakan siapa yang sedang login, karena token tidak bisa dibaca JS)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: toPublicUser(req.user), expiresAt: req.authSession.expiresAt });
});

// Logout: cabut sesi di server lalu hapus cookie (cookie HttpOnly hanya bisa dihapus oleh server)
app.post('/api/auth/logout', async (req, res) => {
  try {
    let sessionId = null;
    const rawRefresh = req.cookies?.[REFRESH_COOKIE];
    if (rawRefresh) {
      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(rawRefresh) },
        select: { sessionId: true }
      });
      sessionId = stored?.sessionId || null;
    }
    if (!sessionId && req.cookies?.[ACCESS_COOKIE]) {
      try {
        sessionId = jwt.verify(req.cookies[ACCESS_COOKIE], JWT_SECRET, { ignoreExpiration: true }).sid || null;
      } catch { /* token tidak sah: tidak ada sesi yang perlu dicabut */ }
    }
    if (sessionId) await revokeSessions({ id: sessionId }, 'logout');
  } catch (error) {
    console.error('Error revoking session on logout:', error);
  }
  clearAuthCookies(req, res);
  res.json({ success: true });
});

// Admin: daftar sesi login yang masih aktif (tanpa token / hash)
app.get('/api/admin/sessions', requireAdmin, async (req, res) => {
  try {
    const sessions = await prisma.authSession.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true, userId: true, createdAt: true, lastUsedAt: true, expiresAt: true, userAgent: true, ipAddress: true,
        user: { select: { username: true, fullName: true, role: true } }
      }
    });
    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat daftar sesi.' });
  }
});

// Admin: pembatalan sesi paksa — semua sesi milik satu user ({ userId }) atau satu sesi tertentu ({ sessionId })
app.post('/api/admin/sessions/revoke', requireAdmin, async (req, res) => {
  try {
    const { userId, sessionId } = req.body || {};
    const hasUser = userId !== undefined && userId !== null && userId !== '';
    const hasSession = typeof sessionId === 'string' && sessionId.trim() !== '';
    if (hasUser === hasSession) {
      return res.status(400).json({ success: false, message: 'Isi salah satu: userId atau sessionId.' });
    }

    let where;
    if (hasUser) {
      const parsedUserId = Number(userId);
      if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
        return res.status(400).json({ success: false, message: 'userId tidak valid.' });
      }
      where = { userId: parsedUserId };
    } else {
      where = { id: sessionId.trim() };
    }

    const revokedCount = await revokeSessions(where, 'admin_revoked');
    console.log(`🔒 [Auth] Admin ${req.user.username} mencabut ${revokedCount} sesi (${JSON.stringify(where)}).`);
    res.json({ success: true, revokedCount, message: `${revokedCount} sesi berhasil dibatalkan.` });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    res.status(500).json({ success: false, message: 'Gagal membatalkan sesi.' });
  }
});

// Bersihkan token & sesi kedaluwarsa secara berkala (riwayat sesi dicabut disimpan 30 hari untuk audit)
const cleanupAuthRecords = async () => {
  try {
    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: oneDayAgo } }, { rotatedAt: { lt: oneDayAgo } }] }
    });
    await prisma.authSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: thirtyDaysAgo } }, { revokedAt: { lt: thirtyDaysAgo } }] }
    });
  } catch (error) {
    console.error('Auth cleanup error:', error.message);
  }
};
setInterval(cleanupAuthRecords, 60 * 60 * 1000).unref();

// --- Data Endpoints (Protected & Branch-Scoped) ---

// 1. Get All Data (Both ADMIN and USER get all branches for Dashboard view)
app.get('/api/data', optionalAuthenticateToken, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        projects: {
          include: {
            odps: true,
            activities: true,
            photos: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    // Transform data to match what the frontend expects (Return all projects for Dashboard & typeDesign support)
    const formattedBranches = branches.map(b => ({
      name: b.name,
      occRate: b.occRate,   // Nilai OCC BRANCH langsung dari Excel (0.0 - 1.0)
      gapWoW: b.gapWoW,    // Nilai GAP WOW dari Excel
      projects: b.projects.map(p => {
        // Pre-kalkulasi total per proyek
        const usedTotal = p.odps.reduce((s, o) => s + o.used, 0);
        const avaiTotal = p.odps.reduce((s, o) => s + o.avai, 0);
        const totalPort = p.odps.reduce((s, o) => s + o.total, 0);
        const occRate = totalPort > 0 ? Math.round((usedTotal / totalPort) * 1000) / 10 : 0;
        const odpCount = p.odps.length;
        const isPriority = odpCount > 1 && occRate < 35;
        const typeDesign = p.typeDesign || 'Greenfield';

        const actTypes = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];
        const formattedActivities = actTypes.map(actKey => {
          let typePhotos = (p.photos || []).filter(ph => ph.type === actKey);
          const legacyAct = (p.activities || []).find(a => a.type === actKey);

          // Jika ada data di ProjectActivity tapi belum ada di ProjectActivityPhoto
          if (legacyAct && legacyAct.status && legacyAct.status !== 'belum' && (legacyAct.photoUrl || legacyAct.planDate || legacyAct.keterangan || legacyAct.kodeSf)) {
            if (typePhotos.length === 0) {
              typePhotos.push({
                id: legacyAct.id,
                type: actKey,
                status: legacyAct.status || 'upload',
                photoUrl: legacyAct.photoUrl,
                planDate: legacyAct.planDate,
                keterangan: legacyAct.keterangan,
                createdAt: legacyAct.createdAt || new Date()
              });
            }
          }

          // Cek keberadaan file fisik untuk foto lokal (/uploads/...)
          const validPhotos = typePhotos.map(ph => {
            let photoUrl = ph.photoUrl;
            let status = ph.status;
            if (photoUrl && photoUrl.startsWith('/uploads/')) {
              const localFilePath = path.join(__dirname, decodeURIComponent(photoUrl));
              if (!fs.existsSync(localFilePath)) {
                console.log(`⚠️ [File Checker] File foto lokal hilang dari disk untuk proyek "${p.name}" (${actKey}): ${photoUrl}`);
                photoUrl = null;
                status = 'belum';
              }
            }
            return { ...ph, photoUrl, status };
          }).filter(ph => ph.photoUrl || ph.planDate || ph.keterangan || ph.kodeSf || ph.namaOutlet || ph.namaBumdes);

          // Hitung overall status kegiatan
          let overallStatus = 'belum';
          if (validPhotos.some(ph => ph.status === 'upload')) {
            overallStatus = 'upload';
          } else if (validPhotos.some(ph => ph.status === 'verified')) {
            overallStatus = 'verified';
          }

          const latestPhoto = validPhotos[validPhotos.length - 1];

          return {
            id: legacyAct?.id || actKey,
            type: actKey,
            status: overallStatus,
            photos: validPhotos,
            photoUrl: latestPhoto?.photoUrl || null,
            planDate: latestPhoto?.planDate || null,
            namaOutlet: latestPhoto?.namaOutlet || null,
            namaBumdes: latestPhoto?.namaBumdes || (latestPhoto?.type === 'bumdes' ? latestPhoto?.keterangan : null),
            kodeSf: latestPhoto?.kodeSf || latestPhoto?.keterangan || null,
            keterangan: latestPhoto?.keterangan || null
          };
        });

        return {
          name: p.name,
          branchName: b.name,
          wok: p.wok,
          typeDesign,
          isPriority,
          usedTotal,
          avaiTotal,
          totalPort,
          occRate,
          odpCount,
          odps: p.odps.map(o => {
            const coords = getOdpCoords(o.odp, b.name, o.lat, o.lon);
            const pct = o.total > 0 ? o.used / o.total : 0;
            const calcStatus = o.used === 0 ? 'BLACK' : pct < 0.25 ? 'GREEN' : pct < 0.50 ? 'YELLOW' : pct < 0.75 ? 'ORANGE' : 'RED';
            const occStatus = o.occStatus ? o.occStatus.toUpperCase() : calcStatus;

            return {
              odp: o.odp,
              avai: o.avai,
              used: o.used,
              total: o.total,
              lat: coords.lat,
              lon: coords.lon,
              occStatus: occStatus
            };
          }),
          activities: formattedActivities
        };
      })
    }));

    res.json(formattedBranches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// 1b. Get Import Metadata (Jateng DIY Summary for Dashboard KPI cards)
app.get('/api/import-meta', optionalAuthenticateToken, async (req, res) => {
  try {
    const meta = await prisma.importMeta.findUnique({
      where: { key: 'jateng_diy_summary' }
    });
    res.json(meta || {});
  } catch (error) {
    console.error(error);
    res.json({});
  }
});

// 2. Upload/Update Project Activity (Protected & Branch-Scoped — Cloudinary Staging)
app.post('/api/activities', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { projectName, branchName, type, planDate, namaOutlet, namaBumdes, kodeSf, keterangan } = req.body;
    console.log(`[Activity POST] project: ${projectName}, type: ${type}, namaOutlet: ${namaOutlet}, namaBumdes: ${namaBumdes}, planDate: ${planDate}`);

    // Security Check: USER can only update their assigned branch
    if (req.user && req.user.role === 'USER' && req.user.branchName !== branchName) {
      return res.status(403).json({ error: `Akses ditolak. Anda hanya berhak memodifikasi data di branch ${req.user.branchName}.` });
    }

    // Find the Project by name + branch
    const branch = await prisma.branch.findUnique({ where: { name: branchName } });
    if (!branch) {
      return res.status(404).json({ error: 'Branch tidak ditemukan' });
    }

    const project = await prisma.project.findFirst({
      where: { name: projectName, branchId: branch.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyek tidak ditemukan' });
    }

    // Cek apakah ada foto kegiatan sebelumnya yang masih berstatus 'upload' (menunggu verifikasi)
    const existingPending = await prisma.projectActivityPhoto.findFirst({
      where: {
        projectId: project.id,
        type: type,
        status: 'upload'
      }
    });

    if (existingPending) {
      return res.status(400).json({ error: 'Foto kegiatan sebelumnya masih menunggu verifikasi Admin. Anda hanya dapat menambahkan foto baru jika kegiatan sebelumnya telah terverifikasi.' });
    }

    // Validasi input wajib per kegiatan GTM
    if (type === 'branding_outlet') {
      if (!namaOutlet || !namaOutlet.trim() || !req.file) {
        return res.status(400).json({ error: 'Upload Branding Downline/Outlet wajib memasukkan Nama Outlet dan Foto bukti.' });
      }
    } else if (type === 'open_table' || type === 'tsel_menyapa') {
      if (!planDate || !req.file) {
        return res.status(400).json({ error: 'Upload kegiatan ini wajib memasukkan Tanggal dan Foto bukti.' });
      }
    } else if (type === 'bumdes') {
      if (!namaBumdes || !namaBumdes.trim() || !req.file) {
        return res.status(400).json({ error: 'Upload Kerjasama BUMDes wajib memasukkan Nama BUMDES dan Foto bukti.' });
      }
    } else if (type === 'rekrutmen_sf') {
      const sfVal = kodeSf || keterangan;
      if (!req.file && (!sfVal || !sfVal.trim())) {
        return res.status(400).json({ error: 'Rekrutmen SF AKAMSI wajib memasukkan setidaknya Kode SF atau Foto bukti.' });
      }
    }

    let photoUrl = null;
    if (req.file) {
      console.log('☁️ Uploading photo to Cloudinary staging...');
      const cldRes = await uploadToCloudinary(req.file.buffer, 'gtm_staging');
      photoUrl = cldRes.secure_url;
      console.log('✅ Cloudinary Staging URL:', photoUrl);
    }

    const effectiveKeterangan = keterangan || namaBumdes || namaOutlet || kodeSf || null;
    const effectivePlanDate = planDate ? new Date(planDate) : null;

    // Simpan ke ProjectActivityPhoto
    const photoData = {
      projectId: project.id,
      type: type,
      status: 'upload',
      photoUrl: photoUrl,
      planDate: effectivePlanDate,
      namaOutlet: namaOutlet || null,
      kodeSf: kodeSf || keterangan || null,
      keterangan: effectiveKeterangan,
      userId: req.user?.id || undefined
    };
    if (namaBumdes) {
      photoData.namaBumdes = namaBumdes;
    }

    let activityPhoto;
    try {
      activityPhoto = await prisma.projectActivityPhoto.create({ data: photoData });
    } catch (dbErr) {
      // Jika kolom namaBumdes belum ada di database fisik (belum db push / migrate), fallback tanpa kolom namaBumdes (tersimpan di keterangan)
      if (photoData.namaBumdes && (dbErr.message?.includes('namaBumdes') || dbErr.code === 'P2021' || dbErr.code === 'P2002')) {
        delete photoData.namaBumdes;
        activityPhoto = await prisma.projectActivityPhoto.create({ data: photoData });
      } else {
        throw dbErr;
      }
    }

    // Sinkronkan juga ke ProjectActivity
    await prisma.projectActivity.upsert({
      where: { projectId_type: { projectId: project.id, type: type } },
      update: {
        status: 'upload',
        photoUrl: photoUrl || undefined,
        planDate: effectivePlanDate || undefined,
        keterangan: effectiveKeterangan || undefined,
        userId: req.user?.id || undefined
      },
      create: {
        projectId: project.id,
        type: type,
        status: 'upload',
        photoUrl: photoUrl,
        planDate: effectivePlanDate,
        keterangan: effectiveKeterangan,
        userId: req.user?.id || undefined
      }
    });

    res.json({ success: true, activityPhoto });
  } catch (error) {
    console.error('Error saving activity:', error);
    res.status(500).json({ error: 'Gagal menyimpan kegiatan' });
  }
});

// Helper: Find Project robustly by projectId, exact name, or fuzzy name
async function findProjectHelper(body) {
  const { projectId, projectName, branchName } = body || {};

  // 1. By ID first if provided
  if (projectId) {
    const p = await prisma.project.findUnique({ where: { id: projectId } }).catch(() => null);
    if (p) return p;
  }

  const cleanBName = (branchName || '').trim();
  const cleanPName = (projectName || '').trim();

  let branch = null;
  if (cleanBName) {
    branch = await prisma.branch.findUnique({ where: { name: cleanBName } }).catch(() => null);
    if (!branch) {
      branch = await prisma.branch.findFirst({
        where: { name: { equals: cleanBName, mode: 'insensitive' } }
      }).catch(() => null);
    }
  }

  // 2. By Branch ID + Name
  if (branch && cleanPName) {
    let p = await prisma.project.findFirst({
      where: { name: cleanPName, branchId: branch.id }
    }).catch(() => null);
    if (p) return p;

    p = await prisma.project.findFirst({
      where: { name: { equals: cleanPName, mode: 'insensitive' }, branchId: branch.id }
    }).catch(() => null);
    if (p) return p;
  }

  // 3. By Name alone
  if (cleanPName) {
    let p = await prisma.project.findFirst({
      where: { name: cleanPName }
    }).catch(() => null);
    if (p) return p;

    p = await prisma.project.findFirst({
      where: { name: { equals: cleanPName, mode: 'insensitive' } }
    }).catch(() => null);
    if (p) return p;

    // 4. Fuzzy match (strip symbols / punctuation differences)
    const simplified = cleanPName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (simplified) {
      const allProjects = await prisma.project.findMany({ select: { id: true, name: true, branchId: true } }).catch(() => []);
      const matched = allProjects.find(item => item.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === simplified);
      if (matched) {
        return await prisma.project.findUnique({ where: { id: matched.id } }).catch(() => null);
      }
    }
  }

  return null;
}

// 2b. Delete Activity Photo (Protected - Users & Admin)
app.post('/api/activities/delete-photo', authenticateToken, async (req, res) => {
  try {
    const { type, photoId } = req.body;
    const project = await findProjectHelper(req.body);
    if (!project) return res.status(404).json({ success: false, message: `Proyek "${req.body.projectName || req.body.projectId}" tidak ditemukan.` });

    // User Branch Access Check (Validate against project.branchId)
    if (req.user && req.user.role === 'USER' && req.user.branchName) {
      const userBranch = await prisma.branch.findFirst({
        where: { name: { equals: req.user.branchName, mode: 'insensitive' } }
      }).catch(() => null);

      if (userBranch && project.branchId !== userBranch.id) {
        return res.status(403).json({ success: false, message: `Akses ditolak. Anda hanya berhak memodifikasi data di branch ${req.user.branchName}.` });
      }
    }

    let targetPhoto = null;
    if (photoId && typeof photoId === 'string' && photoId.length > 15) {
      targetPhoto = await prisma.projectActivityPhoto.findUnique({ where: { id: photoId } }).catch(() => null);
    }
    if (!targetPhoto) {
      targetPhoto = await prisma.projectActivityPhoto.findFirst({
        where: { projectId: project.id, type: type },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null);
    }

    if (targetPhoto) {
      if (targetPhoto.photoUrl) {
        if (targetPhoto.photoUrl.includes('res.cloudinary.com')) {
          await deleteFromCloudinary(targetPhoto.photoUrl).catch(err => console.error('Cloudinary error:', err.message));
        } else if (targetPhoto.photoUrl.startsWith('/uploads/') || targetPhoto.photoUrl.startsWith('/database foto/') || targetPhoto.photoUrl.startsWith('/database%20foto/')) {
          const localP = path.join(__dirname, decodeURIComponent(targetPhoto.photoUrl));
          if (fs.existsSync(localP)) {
            await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
          }
        }
      }
      await prisma.projectActivityPhoto.delete({ where: { id: targetPhoto.id } }).catch(() => null);
    }

    // Check remaining photos
    const remainingPhotos = await prisma.projectActivityPhoto.findMany({
      where: { projectId: project.id, type: type }
    }).catch(() => []);

    if (remainingPhotos.length > 0) {
      let newStatus = 'belum';
      if (remainingPhotos.some(p => p.status === 'upload')) {
        newStatus = 'upload';
      } else if (remainingPhotos.some(p => p.status === 'verified')) {
        newStatus = 'verified';
      }

      const latest = remainingPhotos[remainingPhotos.length - 1];
      await prisma.projectActivity.updateMany({
        where: { projectId: project.id, type: type },
        data: {
          status: newStatus,
          photoUrl: latest?.photoUrl || null,
          planDate: latest?.planDate || null,
          keterangan: latest?.keterangan || null
        }
      }).catch(() => null);
    } else {
      // Clear physical photo from ProjectActivity if legacy record
      const legacyAct = await prisma.projectActivity.findFirst({
        where: { projectId: project.id, type: type }
      }).catch(() => null);

      if (legacyAct && legacyAct.photoUrl) {
        if (legacyAct.photoUrl.includes('res.cloudinary.com')) {
          await deleteFromCloudinary(legacyAct.photoUrl).catch(err => console.error('Cloudinary error:', err.message));
        } else if (legacyAct.photoUrl.startsWith('/uploads/') || legacyAct.photoUrl.startsWith('/database foto/') || legacyAct.photoUrl.startsWith('/database%20foto/')) {
          const localP = path.join(__dirname, decodeURIComponent(legacyAct.photoUrl));
          if (fs.existsSync(localP)) {
            await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
          }
        }
      }

      await prisma.projectActivityPhoto.deleteMany({
        where: { projectId: project.id, type: type }
      }).catch(() => null);

      await prisma.projectActivity.updateMany({
        where: { projectId: project.id, type: type },
        data: {
          status: 'belum',
          photoUrl: null,
          planDate: null,
          keterangan: null
        }
      }).catch(() => null);
    }

    res.json({ success: true, message: 'Foto / kegiatan berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus foto kegiatan: ' + error.message });
  }
});

// 3a. Verify Project Activity Verification (Admin only)
app.post('/api/verify', requireAdmin, async (req, res) => {
  try {
    const { type, photoUrl: reqPhotoUrl, photoId } = req.body;
    const project = await findProjectHelper(req.body);
    if (!project) return res.status(404).json({ success: false, message: `Proyek "${req.body.projectName || req.body.projectId}" tidak ditemukan.` });

    let targetPhoto = null;
    if (photoId && typeof photoId === 'string' && photoId.length > 15) {
      targetPhoto = await prisma.projectActivityPhoto.findUnique({ where: { id: photoId } }).catch(() => null);
    }
    if (!targetPhoto) {
      targetPhoto = await prisma.projectActivityPhoto.findFirst({
        where: { projectId: project.id, type: type, status: 'upload' },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null);
    }

    let finalPhotoUrl = reqPhotoUrl || targetPhoto?.photoUrl;

    // Automatically download verified photo from Cloudinary Staging to structured local disk directory
    if (targetPhoto && targetPhoto.photoUrl && targetPhoto.photoUrl.includes('res.cloudinary.com')) {
      const dateToUse = targetPhoto.planDate || targetPhoto.createdAt;
      const bObj = await prisma.branch.findUnique({ where: { id: project.branchId } }).catch(() => null);
      finalPhotoUrl = await saveVerifiedPhotoToLocal(
        targetPhoto.photoUrl,
        bObj?.name || req.body.branchName,
        project.wok,
        project.name,
        type,
        dateToUse
      );
    } else if (targetPhoto && targetPhoto.photoUrl && (targetPhoto.photoUrl.startsWith('/uploads/') || targetPhoto.photoUrl.startsWith('/database foto/') || targetPhoto.photoUrl.startsWith('/database%20foto/'))) {
      finalPhotoUrl = targetPhoto.photoUrl;
    }

    if (targetPhoto) {
      await prisma.projectActivityPhoto.update({
        where: { id: targetPhoto.id },
        data: {
          status: 'verified',
          photoUrl: finalPhotoUrl || targetPhoto.photoUrl
        }
      });
    }

    const remainingPending = await prisma.projectActivityPhoto.count({
      where: { projectId: project.id, type: type, status: 'upload' }
    });

    const newStatus = remainingPending > 0 ? 'upload' : 'verified';

    const activity = await prisma.projectActivity.upsert({
      where: { projectId_type: { projectId: project.id, type: type } },
      update: {
        status: newStatus,
        photoUrl: finalPhotoUrl || targetPhoto?.photoUrl || undefined
      },
      create: {
        projectId: project.id,
        type: type,
        status: newStatus,
        photoUrl: finalPhotoUrl || targetPhoto?.photoUrl || null
      }
    });

    res.json({ success: true, activity });
  } catch (error) {
    console.error('Error verifying activity:', error);
    res.status(500).json({ success: false, message: 'Failed to verify activity: ' + error.message });
  }
});

// 3b. Reject Project Activity Verification (Admin only — rejects target photo and recalculates activity status)
app.post('/api/reject', requireAdmin, async (req, res) => {
  try {
    const { type, photoId } = req.body;
    const project = await findProjectHelper(req.body);

    if (!project) {
      return res.status(404).json({ success: false, message: `Proyek "${req.body.projectName || req.body.projectId}" tidak ditemukan.` });
    }

    console.log(`🧹 [REJECT ACTION] Rejecting activity "${type}" (photoId: ${photoId || 'none'}) for project "${project.name}" (ID: ${project.id})`);

    let targetPhoto = null;
    if (photoId && typeof photoId === 'string' && photoId.length > 15) {
      targetPhoto = await prisma.projectActivityPhoto.findUnique({ where: { id: photoId } }).catch(() => null);
    }
    if (!targetPhoto) {
      // Fallback: target the newest pending photo, or newest photo
      targetPhoto = await prisma.projectActivityPhoto.findFirst({
        where: { projectId: project.id, type: type, status: 'upload' },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null);
      if (!targetPhoto) {
        targetPhoto = await prisma.projectActivityPhoto.findFirst({
          where: { projectId: project.id, type: type },
          orderBy: { createdAt: 'desc' }
        }).catch(() => null);
      }
    }

    // 1. Physically delete target photo file if it exists
    if (targetPhoto && targetPhoto.photoUrl) {
      const pUrl = targetPhoto.photoUrl;
      if (pUrl.includes('res.cloudinary.com')) {
        console.log('🧹 [Reject] Destroying Cloudinary staging photo:', pUrl);
        await deleteFromCloudinary(pUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));
      } else if (pUrl.startsWith('/uploads/') || pUrl.startsWith('/database foto/') || pUrl.startsWith('/database%20foto/')) {
        const localP = path.join(__dirname, decodeURIComponent(pUrl));
        if (fs.existsSync(localP)) {
          console.log('🧹 [Reject] Unlinking local photo:', localP);
          await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
        }
      }
    }

    // 2. Delete the target photo record
    if (targetPhoto) {
      await prisma.projectActivityPhoto.delete({ where: { id: targetPhoto.id } }).catch(() => null);
    }

    // 3. Query remaining photos for this project & activity type
    const remainingPhotos = await prisma.projectActivityPhoto.findMany({
      where: { projectId: project.id, type: type },
      orderBy: { createdAt: 'asc' }
    }).catch(() => []);

    if (remainingPhotos.length > 0) {
      // Recalculate status based on remaining photos
      let newStatus = 'belum';
      if (remainingPhotos.some(p => p.status === 'upload')) {
        newStatus = 'upload';
      } else if (remainingPhotos.some(p => p.status === 'verified')) {
        newStatus = 'verified';
      }

      const latest = remainingPhotos[remainingPhotos.length - 1];
      const effectiveKeterangan = latest?.keterangan || latest?.namaBumdes || latest?.namaOutlet || latest?.kodeSf || null;

      await prisma.projectActivity.upsert({
        where: { projectId_type: { projectId: project.id, type: type } },
        update: {
          status: newStatus,
          photoUrl: latest?.photoUrl || null,
          planDate: latest?.planDate || null,
          keterangan: effectiveKeterangan,
          userId: latest?.userId || undefined
        },
        create: {
          projectId: project.id,
          type: type,
          status: newStatus,
          photoUrl: latest?.photoUrl || null,
          planDate: latest?.planDate || null,
          keterangan: effectiveKeterangan,
          userId: latest?.userId || undefined
        }
      });

      console.log(`✅ [Reject Success] Project "${project.name}" (${type}) remaining photos: ${remainingPhotos.length}, new status: ${newStatus}`);
      return res.json({
        success: true,
        message: 'Foto berhasil ditolak. Eviden kegiatan sebelumnya tetap aman.',
        status: newStatus,
        remainingCount: remainingPhotos.length
      });
    } else {
      // No remaining photos left (or was legacy record): clear legacy file if any and reset to 'belum'
      const legacyAct = await prisma.projectActivity.findFirst({
        where: { projectId: project.id, type: type }
      }).catch(() => null);

      if (legacyAct && legacyAct.photoUrl) {
        if (legacyAct.photoUrl.includes('res.cloudinary.com')) {
          await deleteFromCloudinary(legacyAct.photoUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));
        } else if (legacyAct.photoUrl.startsWith('/uploads/') || legacyAct.photoUrl.startsWith('/database foto/') || legacyAct.photoUrl.startsWith('/database%20foto/')) {
          const localP = path.join(__dirname, decodeURIComponent(legacyAct.photoUrl));
          if (fs.existsSync(localP)) {
            await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
          }
        }
      }

      await prisma.projectActivity.upsert({
        where: { projectId_type: { projectId: project.id, type: type } },
        update: {
          status: 'belum',
          photoUrl: null,
          planDate: null,
          actualDate: null,
          keterangan: null,
          userId: null
        },
        create: {
          projectId: project.id,
          type: type,
          status: 'belum',
          photoUrl: null,
          planDate: null,
          actualDate: null,
          keterangan: null,
          userId: null
        }
      });

      console.log(`✅ [Reject Success] Project "${project.name}" (${type}) no photos remaining, status reset to 'belum'`);
      return res.json({
        success: true,
        message: 'Verifikasi berhasil ditolak. Kegiatan dikembalikan ke status belum dikerjakan.',
        status: 'belum',
        remainingCount: 0
      });
    }
  } catch (error) {
    console.error('Error rejecting activity:', error);
    res.status(500).json({ success: false, message: 'Gagal menolak verifikasi activity: ' + error.message });
  }
});

// 4. Import Excel (Admin only) — updates ODP data and creates Projects/Branches robustly & super fast
app.post('/api/admin/import-excel', requireAdmin, (req, res) => {
  excelUpload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer Error in ODP excel import:', err.message);
      return res.status(400).json({ error: err.message || 'Gagal mengunggah file Data ODP.' });
    }

    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

    const startTime = Date.now();
    console.log('📦 Memulai import Excel dengan In-Memory Mapping & Batch Processing...');

    // ─── PETA & NORMALISASI WOK → BRANCH YANG BENAR (WOK menentukan Branch) ───
    function getCorrectBranchForWok(rawWok) {
      if (!rawWok) return null;
      const clean = rawWok.toString().trim().toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
      
      if (clean.includes('KEBUMEN')) return 'MAGELANG';
      if (clean.includes('MAGELANG') || clean.includes('TEMANGGUNG')) return 'MAGELANG';

      if (clean.includes('BATANG')) return 'PEKALONGAN';
      if (clean.includes('PEMALANG') || clean.includes('PURBALINGGA')) return 'PEKALONGAN';
      if (clean.includes('TEGAL') || clean.includes('BREBES')) return 'PEKALONGAN';

      if (clean.includes('CILACAP') || clean.includes('BANYUMAS')) return 'PURWOKERTO';
      if (clean.includes('WONOSOBO') || clean.includes('BANJARNEGARA')) return 'PURWOKERTO';

      if (clean.includes('DEMAK')) return 'SEMARANG';
      if (clean.includes('JEPARA') || clean.includes('KUDUS') || clean.includes('PATI')) return 'SEMARANG';
      if (clean.includes('SEMARANG')) return 'SEMARANG';

      if (clean.includes('BOYOLALI')) return 'SURAKARTA';
      if (clean.includes('SRAGEN')) return 'SURAKARTA';
      if (clean.includes('SURAKARTA') || clean.includes('SOLO')) return 'SURAKARTA';

      if (clean.includes('YOGYA') || clean.includes('JOGJA') || clean.includes('YOGYAKARTA') || clean.includes('DIY')) return 'YOGYAKARTA';

      return null;
    }

    // Read from buffer (memoryStorage)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    let totalRowsProcessed = 0;
    let projectsCreated = 0;
    let odpsUnchanged = 0;
    let wokBranchCorrections = 0;
    const branchesFound = new Set();
    const seenOdpKeysInCurrentImport = new Set();

    // ─── 1. IN-MEMORY MAPPING (Load semua data dari DB ke RAM sekaligus) ───
    const allDbBranches = await prisma.branch.findMany();
    const branchMap = new Map(); // uppercase name -> branch object
    for (const b of allDbBranches) {
      branchMap.set(b.name.toUpperCase(), b);
    }

    const allProjects = await prisma.project.findMany({
      include: { odps: true }
    });
    const projectMap = new Map(); // `${branchId}||${projectName.toUpperCase()}` -> project object
    const odpMap = new Map(); // odpName.toUpperCase() -> odp object

    for (const p of allProjects) {
      projectMap.set(`${p.branchId}||${p.name.toUpperCase()}`, p);
      for (const o of p.odps) {
        odpMap.set(o.odp.toUpperCase(), o);
      }
    }

    const projectsToCreate = [];
    const odpsToCreate = [];
    const odpsToUpdate = [];

    // Storage untuk nilai OCC BRANCH dan GAP WOW per branch dari Excel
    const branchOccFromExcel = {}; // branchName -> { occRate, gapWoW } (first occurrence)
    let jatengDiySummary = null; // Baris summary "Jateng DIY"

    // ─── 2. PROCESS ROWS IN RAM (Sangat cepat & 100% akurat) ───
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert to 2D array to find the true header row (ignoring titles)
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let headerRowIndex = 0;
      let headers = [];
      
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const rowStrings = (rawData[i] || []).map(c => c ? c.toString().trim().toUpperCase() : '');
        if (rowStrings.some(c => c.includes('PROJECT') || c.includes('PROYEK') || c.includes('BRANCH') || c.includes('CABANG'))) {
          headerRowIndex = i;
          headers = rowStrings;
          break;
        }
      }

      if (headers.length === 0) continue; // Skip sheet if no valid headers found

      // Build dynamic column index map
      const colMap = {};
      headers.forEach((h, idx) => { if (h) colMap[h] = idx; });

      // Map rows based on the detected headers
      const data = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const rowObj = {};
        let hasData = false;
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            rowObj[headers[j]] = rawData[i][j];
            if (rawData[i][j] !== undefined && rawData[i][j] !== null && rawData[i][j] !== '') hasData = true;
          }
        }
        if (hasData) data.push(rowObj);
      }

      for (const row of data) {
        // Headers are already normalized (uppercase & trimmed)
        const normRow = row;

        // Helper untuk mencari kolom dengan pencarian kata kunci yang fleksibel
        const findValue = (rowObj, possibleKeys, substringKeywords) => {
          for (const key of possibleKeys) {
            if (rowObj[key] !== undefined && rowObj[key] !== null) return rowObj[key];
          }
          if (substringKeywords) {
            for (const [key, val] of Object.entries(rowObj)) {
              for (const kw of substringKeywords) {
                if (key.includes(kw) && val !== undefined && val !== null) return val;
              }
            }
          }
          return undefined;
        };

        const rawBranch = findValue(normRow, ['TELKOMSEL BRANCH', 'TELKOMSEL', 'BRANCH', 'CABANG', 'NAMA BRANCH', 'NAMA CABANG', 'AREA'], ['BRANCH', 'CABANG', 'TELKOMSEL']) || '';
        const rawProject = findValue(normRow, ['NAMA PROYEK', 'PROJECT', 'PROYEK', 'NAMA PROJECT', 'ID PROJECT'], ['PROJECT', 'PROYEK']) || '';
        const rawWok = findValue(normRow, ['BWOK', 'WOK', 'WILAYAH', 'KOTA'], ['WOK', 'WILAYAH', 'BWOK']) || '-';
        const rawTypeDesign = findValue(normRow, ['TYPE DESIGN', 'DESIGN TYPE', 'TYPE', 'GREENFIELD/BROWNFIELD', 'GREENFIELD / BROWNFIELD', 'DESIGN'], ['DESIGN', 'GREENFIELD', 'BROWNFIELD']);
        
        let typeDesign = 'Greenfield';
        if (rawTypeDesign) {
          const strVal = rawTypeDesign.toString().toUpperCase();
          if (strVal.includes('BROWN')) typeDesign = 'Brownfield';
          else if (strVal.includes('GREEN')) typeDesign = 'Greenfield';
        }
        
        const rawStatus = findValue(normRow, ['OCC 2', 'STATUS ODP', 'OCC STATUS', 'WARNA ODP', 'COLOR', 'WARNA'], ['WARNA', 'OCC 2']);
        let excelOccStatus = null;
        if (rawStatus) {
          const strS = rawStatus.toString().toUpperCase();
          if (strS.includes('BLACK') || strS.includes('HITAM')) excelOccStatus = 'BLACK';
          else if (strS.includes('GREEN') || strS.includes('HIJAU')) excelOccStatus = 'GREEN';
          else if (strS.includes('YELLOW') || strS.includes('KUNING')) excelOccStatus = 'YELLOW';
          else if (strS.includes('ORANGE') || strS.includes('JINGGA')) excelOccStatus = 'ORANGE';
          else if (strS.includes('RED') || strS.includes('MERAH')) excelOccStatus = 'RED';
        }

        const rawLatVal = findValue(normRow, ['LATITUDE', 'LAT', 'KORDINAT LAT', 'Y'], ['LATITUDE', 'LAT']);
        const rawLonVal = findValue(normRow, ['LONGITUDE', 'LON', 'LONG', 'KORDINAT LON', 'X'], ['LONGITUDE', 'LON', 'LONG']);
        const parsedLat = parseFloat(rawLatVal);
        const parsedLon = parseFloat(rawLonVal);
        const hasExplicitCoords = !isNaN(parsedLat) && !isNaN(parsedLon);

        const rawOdp = findValue(normRow, ['ODP NAME', 'ID ODP', 'NAMA ODP', 'ODP ID'], ['ODP NAME', 'ID ODP']);
        const jumlahOdp = parseInt(findValue(normRow, ['JUMLAH ODP', 'ODP COUNT', 'TOTAL ODP'], ['JUMLAH ODP']) || 1) || 1;

        const total = parseInt(findValue(normRow, ['PORT', 'TOTAL PORT', 'IS TOTALIUM', 'TOTALIUM', 'TOTAL', 'KAPASITAS'], ['TOTAL']) || 0) || 0;
        const used = parseInt(findValue(normRow, ['USED', 'USED IUM', 'TERPAKAI', 'PORT USED'], ['USED', 'TERPAKAI']) || 0) || 0;
        
        const avaiVal = findValue(normRow, ['AVAI IUM', 'AVAI', 'AVAILABLE', 'TERSEDIA', 'PORT AVAI'], ['AVAI', 'AVAILABLE']);
        // FIX: Hapus Math.max(0,...) — ODP over-subscribed (used > total) boleh punya avai negatif, sesuai Excel
        // Jika kolom AVAI ada → pakai langsung (termasuk nilai negatif seperti -7, -1)
        // Jika kolom AVAI tidak ada → hitung total - used (TANPA Math.max agar nilai negatif tidak di-clamp ke 0)
        const avai = (avaiVal !== undefined && avaiVal !== null) ? (parseInt(avaiVal) || 0) : (total - used);


        // Ambil OCC BRANCH dan GAP WOW dari kolom Excel
        const rawOccBranch = findValue(normRow, ['OCC BRANCH'], ['OCC BRANCH']);
        const rawGapWoW = findValue(normRow, ['GAP WOW', 'GAP WOW '], ['GAP WOW']);

        if (!rawBranch) continue;

        // ─── TANGKAP BARIS SUMMARY "JATENG DIY" ───
        if (rawBranch.toString().trim().toUpperCase().includes('JATENG') || rawBranch.toString().trim().toUpperCase() === 'JATENG DIY') {
          jatengDiySummary = {
            occRate: parseFloat(rawOccBranch) || null,
            available: parseInt(avaiVal) || null,
            used: parseInt(findValue(normRow, ['USED'], ['USED'])) || null,
            total: parseInt(findValue(normRow, ['TOTAL'], ['TOTAL'])) || null,
            gapWoW: parseFloat(rawGapWoW) || null,
          };
          console.log('📊 Jateng DIY Summary Row ditemukan:', jatengDiySummary);
          continue;
        }

        if (!rawProject) continue;

        // ─── WOK-BASED BRANCH CORRECTION ───
        // Prioritas: WOK menentukan Branch yang benar
        const wokNameUpper = rawWok.toString().trim().toUpperCase();
        let branchName = rawBranch.toString().trim().toUpperCase();
        
        // Alias normalisasi branch name
        if (branchName === 'JOGJA' || branchName === 'YOGYA' || branchName === 'DIY') branchName = 'YOGYAKARTA';
        if (branchName === 'SOLO') branchName = 'SURAKARTA';
        if (branchName === 'PWK') branchName = 'PURWOKERTO';
        if (branchName === 'PKL') branchName = 'PEKALONGAN';
        if (branchName === 'SMG') branchName = 'SEMARANG';
        if (branchName === 'MGL') branchName = 'MAGELANG';

        // Koreksi Branch berdasarkan WOK (fleksibel untuk Yogya 2, Yogya2, dll.)
        const correctBranch = getCorrectBranchForWok(rawWok);
        if (correctBranch && correctBranch !== branchName) {
          console.log(`🔧 WOK Correction: "${rawOdp || rawProject}" Branch ${branchName} → ${correctBranch} (WOK: ${wokNameUpper})`);
          branchName = correctBranch;
          wokBranchCorrections++;
        }

        // Simpan OCC BRANCH dan GAP WOW per Branch ORIGINAL dari Excel (sebelum WOK correction)
        const originalBranchForOcc = rawBranch.toString().trim().toUpperCase();
        let normalizedOriginalBranch = originalBranchForOcc;
        if (normalizedOriginalBranch === 'JOGJA' || normalizedOriginalBranch === 'YOGYA' || normalizedOriginalBranch === 'DIY') normalizedOriginalBranch = 'YOGYAKARTA';
        if (normalizedOriginalBranch === 'SOLO') normalizedOriginalBranch = 'SURAKARTA';
        if (normalizedOriginalBranch === 'PWK') normalizedOriginalBranch = 'PURWOKERTO';
        if (normalizedOriginalBranch === 'PKL') normalizedOriginalBranch = 'PEKALONGAN';
        if (normalizedOriginalBranch === 'SMG') normalizedOriginalBranch = 'SEMARANG';
        if (normalizedOriginalBranch === 'MGL') normalizedOriginalBranch = 'MAGELANG';
        
        if (rawOccBranch !== undefined && rawOccBranch !== null && rawOccBranch !== '') {
          if (!branchOccFromExcel[normalizedOriginalBranch]) {
            branchOccFromExcel[normalizedOriginalBranch] = {
              occRate: parseFloat(rawOccBranch) || 0,
              gapWoW: parseFloat(rawGapWoW) || 0,
            };
          }
        }
        if (rawGapWoW !== undefined && rawGapWoW !== null && rawGapWoW !== '') {
          if (!branchOccFromExcel[normalizedOriginalBranch]) {
            branchOccFromExcel[normalizedOriginalBranch] = {
              occRate: parseFloat(rawOccBranch) || 0,
              gapWoW: parseFloat(rawGapWoW) || 0,
            };
          } else if (!branchOccFromExcel[normalizedOriginalBranch].gapWoW) {
            branchOccFromExcel[normalizedOriginalBranch].gapWoW = parseFloat(rawGapWoW) || 0;
          }
        }

        // Get or create branch
        let branch = branchMap.get(branchName);
        if (!branch) {
          branch = await prisma.branch.upsert({
            where: { name: branchName },
            update: {},
            create: { name: branchName }
          });
          branchMap.set(branchName, branch);
        }

        // Find or create Project
        let projectName = rawProject.toString().trim();
        const wokName = rawWok.toString().trim();

        const projectKey = `${branch.id}||${projectName.toUpperCase()}`;
        let project = projectMap.get(projectKey);

        if (!project) {
          const newProjectId = crypto.randomUUID();
          project = {
            id: newProjectId,
            name: projectName,
            wok: wokName,
            typeDesign: typeDesign,
            branchId: branch.id
          };
          projectsToCreate.push(project);
          projectMap.set(projectKey, project);
          projectsCreated++;
        }

        // Processing ODPs (Either explicit ODP Name or Synthetic ODPs based on Jumlah ODP)
        const countToCreate = rawOdp ? 1 : Math.max(1, jumlahOdp);
        const baseSubTotal = Math.floor(total / countToCreate);
        const baseSubUsed = Math.floor(used / countToCreate);
        // FIX: Split avai dari Excel secara proporsional, bukan recalculate sebagai total-used
        const baseSubAvai = Math.floor(avai / countToCreate);

        let remainingTotal = total;
        let remainingUsed = used;
        let remainingAvai = avai;

        for (let i = 1; i <= countToCreate; i++) {
          let rawOdpStr = rawOdp ? rawOdp.toString().trim() : '';
          let odpName = rawOdpStr 
            ? rawOdpStr 
            : `${projectName}-${wokName !== '-' ? wokName : 'WOK'}-${totalRowsProcessed + 1}-${i}`;
          
          let cleanOdpKey = odpName.toUpperCase();

          // Jika nama ODP ini sudah pernah diproses di baris sebelumnya dalam file Excel yang sama (duplikat nama ODP):
          // Tambahkan suffix unik (#row) agar data port dari kedua baris tersebut TIDAK saling tertimpa
          if (rawOdpStr && seenOdpKeysInCurrentImport.has(cleanOdpKey)) {
            odpName = `${rawOdpStr} (#${totalRowsProcessed + 1})`;
            cleanOdpKey = odpName.toUpperCase();
          }
          seenOdpKeysInCurrentImport.add(cleanOdpKey);

          let subTotal = baseSubTotal;
          let subUsed = baseSubUsed;
          let subAvai = baseSubAvai;
          
          // ODP terakhir mendapat sisa pembagian agar total presisi
          if (i === countToCreate) {
            subTotal = remainingTotal;
            subUsed = remainingUsed;
            subAvai = remainingAvai; // FIX: gunakan sisa avai dari Excel, bukan recalculate
          } else {
            remainingTotal -= subTotal;
            remainingUsed -= subUsed;
            remainingAvai -= baseSubAvai;
          }

          const existingOdp = odpMap.get(cleanOdpKey);
          const coords = hasExplicitCoords 
            ? { lat: parsedLat, lon: parsedLon }
            : getOdpCoords(odpName, branch.name, null, null);

          if (existingOdp) {
            if (existingOdp.id && existingOdp.id.startsWith('temp-')) {
              const target = odpsToCreate.find(item => item.odp.toUpperCase() === cleanOdpKey);
              if (target) {
                target.avai = subAvai;
                target.used = subUsed;
                target.total = subTotal;
                target.projectId = project.id;
                if (hasExplicitCoords) {
                  target.lat = parsedLat;
                  target.lon = parsedLon;
                }
                if (excelOccStatus) target.occStatus = excelOccStatus;
              }
            } else if (
              existingOdp.avai !== subAvai ||
              existingOdp.used !== subUsed ||
              existingOdp.total !== subTotal ||
              existingOdp.projectId !== project.id
            ) {
              const updatePayload = {
                id: existingOdp.id,
                odp: odpName,
                avai: subAvai,
                used: subUsed,
                total: subTotal,
                projectId: project.id
              };
              if (hasExplicitCoords) {
                updatePayload.lat = parsedLat;
                updatePayload.lon = parsedLon;
              }
              if (excelOccStatus) updatePayload.occStatus = excelOccStatus;

              odpsToUpdate.push(updatePayload);
              existingOdp.avai = subAvai;
              existingOdp.used = subUsed;
              existingOdp.total = subTotal;
              existingOdp.projectId = project.id;
              if (hasExplicitCoords) {
                existingOdp.lat = parsedLat;
                existingOdp.lon = parsedLon;
              }
              if (excelOccStatus) existingOdp.occStatus = excelOccStatus;
            } else {
              odpsUnchanged++;
            }
          } else {
            odpsToCreate.push({
              odp: odpName,
              avai: subAvai,
              used: subUsed,
              total: subTotal,
              lat: coords.lat,
              lon: coords.lon,
              occStatus: excelOccStatus || 'GREEN',
              projectId: project.id
            });
            odpMap.set(cleanOdpKey, {
              id: 'temp-' + odpsToCreate.length,
              odp: odpName,
              avai: subAvai,
              used: subUsed,
              total: subTotal,
              lat: coords.lat,
              lon: coords.lon,
              projectId: project.id
            });
          }
        }

        totalRowsProcessed++;
        branchesFound.add(branch.name);
      }
    }

    // â”€â”€â”€ 3. BATCH EXECUTION (Kirim ke DB sekaligus dengan aman) â”€â”€â”€
    console.log(`âš¡ RAM Processing selesai. Menyiapkan Batch DB: ${projectsToCreate.length} project, ${odpsToCreate.length} ODP baru, ${odpsToUpdate.length} update. WOK corrections: ${wokBranchCorrections}.`);

    // Batch Insert Project Baru
    if (projectsToCreate.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < projectsToCreate.length; i += BATCH_SIZE) {
        const batch = projectsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.project.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
    }

    // Batch Insert ODP Baru (dalam grup 500 baris)
    if (odpsToCreate.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < odpsToCreate.length; i += BATCH_SIZE) {
        const batch = odpsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.odp.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
    }

    // Batch Update ODP yang Berubah (diproses paralel 50 request serentak)
    if (odpsToUpdate.length > 0) {
      const CONCURRENCY = 50;
      for (let i = 0; i < odpsToUpdate.length; i += CONCURRENCY) {
        const chunk = odpsToUpdate.slice(i, i + CONCURRENCY);
        await Promise.all(
          chunk.map(item => 
            prisma.odp.update({
              where: { id: item.id },
              data: {
                avai: item.avai,
                used: item.used,
                total: item.total,
                projectId: item.projectId,
                ...(item.lat !== undefined ? { lat: item.lat, lon: item.lon } : {}),
                ...(item.occStatus ? { occStatus: item.occStatus } : {})
              }
            }).catch(err => console.error(`Gagal update ODP ${item.odp}:`, err.message))
          )
        );
      }
    }

    // ——— 4. STALE ODP CLEANUP (Hapus ODP lama yang tidak ada di file update baru agar statistik 100% presisi) ———
    // FIX: Gunakan seenOdpKeysInCurrentImport — berisi TEPAT semua ODP yang dibaca dari file Excel terbaru.
    const processedOdpNames = seenOdpKeysInCurrentImport;
    const allDbOdps = await prisma.odp.findMany({ select: { id: true, odp: true } });
    const staleOdpIds = allDbOdps
      .filter(o => !processedOdpNames.has(o.odp.toUpperCase()))
      .map(o => o.id);

    if (staleOdpIds.length > 0) {
      console.log(`🧹 Membersihkan ${staleOdpIds.length} ODP lama yang tidak ada di file Excel terbaru...`);
      for (let i = 0; i < staleOdpIds.length; i += 500) {
        await prisma.odp.deleteMany({
          where: { id: { in: staleOdpIds.slice(i, i + 500) } }
        });
      }
    }

    // Hapus proyek kosong tanpa ODP
    await prisma.project.deleteMany({
      where: { odps: { none: {} } }
    });

    // ─── 5. SIMPAN NILAI OCC BRANCH & GAP WOW PER BRANCH KE DATABASE ───
    console.log('📊 Menyimpan OCC BRANCH & GAP WOW per branch...');
    const allBranchesInDb = await prisma.branch.findMany();
    for (const b of allBranchesInDb) {
      const bUpper = b.name.toUpperCase();
      const excelVals = branchOccFromExcel[bUpper];

      const finalOccRate = (excelVals && excelVals.occRate !== undefined && excelVals.occRate !== null && excelVals.occRate !== 0)
        ? excelVals.occRate
        : b.occRate;

      // Ambil nilai raw GAP WOW dari file Excel yang baru saja di-upload
      const newRawGap = (excelVals && excelVals.gapWoW !== undefined && excelVals.gapWoW !== null && excelVals.gapWoW !== 0)
        ? excelVals.gapWoW
        : null;

      let finalGapWoWDelta = b.gapWoW; // Fallback jika tidak ada gap di excel

      if (newRawGap !== null) {
        // Kolom Gap WoW di Excel sudah berisi nilai bersih kenaikan/penurunan WoW
        finalGapWoWDelta = newRawGap;
      }

      await prisma.branch.update({
        where: { id: b.id },
        data: {
          occRate: finalOccRate,
          gapWoW: finalGapWoWDelta,
        }
      });
      console.log(`  ${bUpper}: OCC=${finalOccRate ? (finalOccRate * 100).toFixed(1) + '%' : 'N/A'} GAP_DELTA=${finalGapWoWDelta !== null ? (finalGapWoWDelta * 100).toFixed(2) + '%' : '0%'}`);
    }

    // ─── 6. SIMPAN SUMMARY JATENG DIY KE ImportMeta ───
    if (jatengDiySummary) {

      await prisma.importMeta.upsert({
        where: { key: 'jateng_diy_summary' },
        update: {
          occRate: jatengDiySummary.occRate,
          available: jatengDiySummary.available,
          used: jatengDiySummary.used,
          total: jatengDiySummary.total,
          gapWoW: jatengDiySummary.gapWoW,
        },
        create: {
          key: 'jateng_diy_summary',
          occRate: jatengDiySummary.occRate,
          available: jatengDiySummary.available,
          used: jatengDiySummary.used,
          total: jatengDiySummary.total,
          gapWoW: jatengDiySummary.gapWoW,
        }
      });
      console.log('ðŸ“Š Jateng DIY Summary disimpan ke ImportMeta.');
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`âœ… Excel Import selesai dalam ${durationSec} detik! (Processed ${totalRowsProcessed} rows across ${branchesFound.size} branches, ${wokBranchCorrections} WOK corrections)`);

    res.json({ 
      success: true, 
      message: `Database berhasil diperbarui dalam ${durationSec} detik! (${totalRowsProcessed} baris diproses: ${odpsToCreate.length} baru, ${odpsToUpdate.length} diperbarui, ${staleOdpIds.length} dibersihkan, ${wokBranchCorrections} WOK -> Branch dikoreksi)`,
      stats: {
        durationSec,
        rows: totalRowsProcessed,
        projectsCreated,
        odpsCreated: odpsToCreate.length,
        odpsUpdated: odpsToUpdate.length,
        odpsRemoved: staleOdpIds.length,
        odpsUnchanged,
        wokBranchCorrections,
        branches: Array.from(branchesFound)
      }
    });
  } catch (error) {
    console.error('Excel Import Error:', error);
    res.status(500).json({ error: 'Failed to import Excel data: ' + error.message });
  }
  });
});

// --- GET /api/programs: Parse dynamic Program Excel files and return structured sheet data ---
function parseProgramExcelFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetsData = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      // Search for detail URL in cells
      let detailUrl = null;
      for (let key in sheet) {
        if (key.startsWith('!')) continue;
        const cell = sheet[key];
        const val = String(cell.v || cell.w || '').trim();
        if (cell.l && cell.l.Target) {
          detailUrl = cell.l.Target;
          break;
        }
        const match = val.match(/(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|s\.id\/[^\s]+|tinyurl\.com\/[^\s]+)/i);
        if (match) {
          detailUrl = match[0];
          break;
        }
      }

      if (detailUrl && !detailUrl.startsWith('http://') && !detailUrl.startsWith('https://')) {
        detailUrl = 'https://' + detailUrl;
      }

      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rawRows || rawRows.length === 0) return;

      // Find header row (row containing "BRANCH", "Branch", "Monitoring", etc.)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
        const row = rawRows[i];
        if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && /branch/i.test(cell))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) headerRowIndex = 0;

      const rawHeaders = rawRows[headerRowIndex] || [];
      const headers = rawHeaders.map((h, colIdx) => h ? String(h).trim() : `Col ${colIdx + 1}`);

      const dataRows = [];
      let summaryRow = null;

      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] || '').trim();
        const secondCell = String(row[1] || '').trim();

        // Check if row is URL row
        if (firstCell.startsWith('http') || firstCell.includes('bit.ly') || firstCell.includes('tinyurl') || firstCell.includes('s.id')) {
          if (!detailUrl) {
            detailUrl = firstCell.startsWith('http') ? firstCell : 'https://' + firstCell;
          }
          continue;
        }

        const isSummary = /jateng|grand total|total/i.test(firstCell) || /jateng|grand total|total/i.test(secondCell);

        const formattedRow = {};
        headers.forEach((h, colIdx) => {
          formattedRow[h] = row[colIdx] !== undefined ? row[colIdx] : null;
        });

        if (isSummary) {
          summaryRow = formattedRow;
        } else {
          const hasContent = Object.values(formattedRow).some(v => v !== null && v !== '');
          if (hasContent) {
            dataRows.push(formattedRow);
          }
        }
      }

      sheetsData.push({
        sheetName,
        detailUrl,
        headers,
        rows: dataRows,
        summaryRow
      });
    });

    return sheetsData;
  } catch (err) {
    console.error('Error parsing program excel file:', err);
    return null;
  }
}

// Ensure program storage directory exists
const programsDir = path.join(__dirname, 'data/programs');
if (!fs.existsSync(programsDir)) {
  try { fs.mkdirSync(programsDir, { recursive: true }); } catch {}
}

const INDONESIAN_MONTH_MAP = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
  'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
};

// Helper: Prune program data for expired 6-month sessions (Session 1: Jan-Jun / Session 2: Jul-Dec)
function cleanExpiredProgramSessions(programIndex) {
  if (!programIndex || typeof programIndex !== 'object') return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-11
  const isSession2 = currentMonthIdx >= 6; // true if July - Dec (Session 2)

  let modified = false;

  Object.keys(programIndex).forEach(monthLabel => {
    const parts = monthLabel.trim().split(/\s+/);
    if (parts.length >= 2) {
      const monthName = parts[0].toLowerCase();
      const yearNum = parseInt(parts[1], 10);
      const mIdx = INDONESIAN_MONTH_MAP[monthName];

      if (typeof mIdx === 'number' && !isNaN(yearNum)) {
        let isExpired = false;

        if (yearNum < currentYear) {
          isExpired = true;
        } else if (yearNum === currentYear) {
          if (isSession2 && mIdx < 6) {
            // Currently in Session 2 (Jul-Dec), so Session 1 (Jan-Jun) of current year is expired
            isExpired = true;
          } else if (!isSession2 && mIdx >= 6) {
            // Currently in Session 1 (Jan-Jun), Session 2 is expired
            isExpired = true;
          }
        }

        if (isExpired) {
          console.log(`🧹 [Session Auto-Prune] Removing expired session program data for "${monthLabel}"...`);
          delete programIndex[monthLabel];
          modified = true;

          const monthSlug = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const fileToDelete = path.join(programsDir, `program_${monthSlug}.xlsx`);
          if (fs.existsSync(fileToDelete)) {
            try {
              fs.unlinkSync(fileToDelete);
              console.log(`  └─ Deleted physical file: ${fileToDelete}`);
            } catch (e) {
              console.error(`  └─ Failed to delete file ${fileToDelete}:`, e.message);
            }
          }
        }
      }
    }
  });

  if (modified) {
    const indexPath = path.join(programsDir, 'index.json');
    try {
      fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');
      console.log('✅ [Session Auto-Prune] Updated index.json saved to disk.');
    } catch (e) {
      console.error('Failed to write updated program index.json:', e);
    }
  }

  return modified;
}

// Helper: OCR Text Extraction & Link Parser using Tesseract.js
async function extractLinkFromImageBuffer(buffer) {
  try {
    const worker = await Tesseract.createWorker('eng');
    const { data } = await worker.recognize(buffer);
    await worker.terminate();

    const text = data && data.text ? data.text : '';
    console.log('🔍 [OCR Recognized Raw Text]:\n', text);

    if (!text) return null;

    // Pattern matching for URLs and link shorteners
    // Keywords: link, https, http, tinyurl, bitly, .com, .id, .goog, etc.
    const urlRegex = /(https?:\/\/[^\s]+|(?:www\.|tinyurl\.com|bit\.ly|drive\.google\.com|forms\.gle|s\.id|[a-zA-Z0-9-]+\.(?:com|id|org|net|gov|co\.id|go\.id))[^\s]*)/gi;

    const matches = text.match(urlRegex);
    if (matches && matches.length > 0) {
      let cleanUrl = matches[0].trim().replace(/[.,)"'\\]+$/, '');
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      return cleanUrl;
    }

    // Secondary scan: check lines containing keywords (link, https, tinyurl, bitly, .com, .id)
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (/link|https|tinyurl|bitly|\.com|\.id/i.test(line)) {
        const words = line.split(/\s+/);
        for (let word of words) {
          let cleaned = word.replace(/^[^\w/:]+/, '').replace(/[^\w/:]+$/, '');
          if (/https?:\/\/|\.com|\.id|tinyurl|bitly/i.test(cleaned)) {
            if (!/^https?:\/\//i.test(cleaned)) {
              cleaned = 'https://' + cleaned;
            }
            return cleaned;
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error('⚠️ [OCR Link Extraction Failed]:', err.message);
    return null;
  }
}

// --- POST /api/admin/upload-program-image: Admin Upload Image Tracking Program (JPG/PNG to Cloudinary + OCR Link Scan) ---
app.post('/api/admin/upload-program-image', authenticateToken, requireAdmin, (req, res) => {
  programImageUpload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer Error in program image upload:', err.message);
      return res.status(400).json({ error: err.message || 'Gagal mengunggah gambar program.' });
    }

    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Tidak ada file gambar program yang diunggah.' });
      }

      const monthLabel = req.body.monthLabel || 'Agustus 2026';
      const rawSheetName = req.body.programName || req.body.sheetName || 'Program Tracking';
      const sheetName = rawSheetName.trim().replace(/\s+/g, ' ');
      const manualDetailUrl = req.body.detailUrl ? req.body.detailUrl.trim() : '';

      // 1. Upload file to Cloudinary (folder 'gtm_programs')
      console.log(`📤 [Cloudinary Upload] Uploading program image "${sheetName}" for ${monthLabel}...`);
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'gtm_programs');
      const imageUrl = cloudinaryResult.secure_url;
      console.log(`✅ [Cloudinary Upload Success] Image URL: ${imageUrl}`);

      // 2. Perform OCR link scanning
      console.log(`🔍 [OCR Scanning] Scanning link text from image using Tesseract.js...`);
      const scannedLink = await extractLinkFromImageBuffer(req.file.buffer);
      const detailUrl = manualDetailUrl || scannedLink || '';

      console.log(`🔗 [OCR Result] Scanned Link: "${scannedLink || 'Tidak Ditemukan'}", Final Detail URL: "${detailUrl}"`);

      // 3. Update index.json
      const indexPath = path.join(programsDir, 'index.json');
      const programIndex = getOrInitializeProgramIndex();
      if (monthLabel === 'Agustus 2026' && programIndex['__deleted_Agustus_2026']) {
        delete programIndex['__deleted_Agustus_2026'];
      }

      if (!programIndex[monthLabel]) {
        programIndex[monthLabel] = {
          monthLabel,
          updatedAt: new Date().toISOString(),
          sheetsCount: 0,
          programs: []
        };
      }

      const newImageItem = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        imageUrl,
        detailUrl,
        scannedLink: scannedLink || null,
        createdAt: new Date().toISOString()
      };

      const normalizedTarget = sheetName.toLowerCase();
      const existingIdx = programIndex[monthLabel].programs.findIndex(p => {
        const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
        return pName === normalizedTarget;
      });

      let programItem;
      let isAppended = false;

      if (existingIdx >= 0) {
        // Program with same name exists in this month -> Append to images array
        programItem = programIndex[monthLabel].programs[existingIdx];

        // Normalize legacy format if images array doesn't exist
        if (!Array.isArray(programItem.images) || programItem.images.length === 0) {
          programItem.images = [];
          if (programItem.imageUrl) {
            programItem.images.push({
              id: `img_legacy_${Date.now()}`,
              imageUrl: programItem.imageUrl,
              detailUrl: programItem.detailUrl || '',
              scannedLink: programItem.scannedLink || null,
              createdAt: programItem.updatedAt || new Date().toISOString()
            });
          }
        }

        programItem.images.push(newImageItem);
        // Maintain top-level backward compatibility with first slide
        programItem.imageUrl = programItem.images[0]?.imageUrl || imageUrl;
        programItem.detailUrl = programItem.images[0]?.detailUrl || detailUrl;
        programItem.scannedLink = programItem.images[0]?.scannedLink || scannedLink;
        programItem.updatedAt = new Date().toISOString();
        isAppended = true;
      } else {
        // Create new program with images array
        programItem = {
          sheetName,
          images: [newImageItem],
          imageUrl,
          detailUrl,
          scannedLink: scannedLink || null,
          updatedAt: new Date().toISOString()
        };
        programIndex[monthLabel].programs.push(programItem);
      }

      programIndex[monthLabel].updatedAt = new Date().toISOString();
      programIndex[monthLabel].sheetsCount = programIndex[monthLabel].programs.length;

      // Clean expired session programs
      cleanExpiredProgramSessions(programIndex);

      fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

      const totalSlides = programItem.images ? programItem.images.length : 1;
      const successMessage = isAppended
        ? `Berhasil menambahkan slide ke-${totalSlides} untuk Program "${sheetName}" (${monthLabel}) ke Cloudinary!`
        : `Berhasil mengunggah Gambar Program "${sheetName}" (${monthLabel}) ke Cloudinary!`;

      res.json({
        success: true,
        message: successMessage,
        monthLabel,
        program: programItem,
        isAppended,
        totalSlides,
        newImageItem,
        scannedLink,
        detailUrl,
        imageUrl,
        sheetsCount: programIndex[monthLabel].programs.length,
        programs: programIndex[monthLabel].programs
      });
    } catch (err) {
      console.error('Error uploading program image:', err);
      res.status(500).json({ error: 'Gagal memproses gambar program: ' + err.message });
    }
  });
});

// Helper: Case-insensitive & normalized month label lookup
function findMonthKey(programIndex, label) {
  if (!programIndex || typeof programIndex !== 'object' || !label) return null;
  const target = label.trim().toLowerCase();
  return Object.keys(programIndex).find(k => k.trim().toLowerCase() === target) || null;
}

// Helper: Load & initialize program index with fallback file persistence
function getOrInitializeProgramIndex() {
  const indexPath = path.join(programsDir, 'index.json');
  let programIndex = {};

  if (fs.existsSync(indexPath)) {
    try {
      programIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch {}
  }

  // Clean expired session programs
  const wasPruned = cleanExpiredProgramSessions(programIndex);
  let modified = wasPruned;

  // Fallback to default August 2026 file if index doesn't have it AND it wasn't explicitly marked deleted
  const hasAgustus = findMonthKey(programIndex, 'Agustus 2026');
  if (!hasAgustus && !programIndex['__deleted_Agustus_2026']) {
    const localFilePath = path.join(__dirname, 'data/Tracking_Program_August_2026.xlsx');
    const fallbackPath = 'C:\\Users\\gatfa\\Downloads\\Telegram Desktop\\Tracking Program - August 2026.xlsx';
    const targetPath = fs.existsSync(localFilePath) ? localFilePath : fs.existsSync(fallbackPath) ? fallbackPath : null;

    if (targetPath) {
      const sheets = parseProgramExcelFile(targetPath);
      if (sheets && sheets.length > 0) {
        programIndex['Agustus 2026'] = {
          monthLabel: 'Agustus 2026',
          updatedAt: new Date().toISOString(),
          sheetsCount: sheets.length,
          programs: sheets
        };
        modified = true;
      }
    }
  }

  if (modified) {
    try {
      fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save program index.json:', e.message);
    }
  }

  return programIndex;
}

// --- GET /api/programs: Get program sheet data ---
app.get('/api/programs', (req, res) => {
  const programIndex = getOrInitializeProgramIndex();

  const cleanMonthsData = {};
  Object.keys(programIndex).forEach(k => {
    if (!k.startsWith('__')) {
      cleanMonthsData[k] = programIndex[k];
    }
  });

  const requestedMonth = req.query.month;
  if (requestedMonth) {
    const matchedKey = findMonthKey(cleanMonthsData, requestedMonth);
    if (matchedKey && cleanMonthsData[matchedKey]) {
      return res.json(cleanMonthsData[matchedKey]);
    } else {
      return res.json({
        monthLabel: requestedMonth,
        updatedAt: new Date().toISOString(),
        sheetsCount: 0,
        programs: []
      });
    }
  }

  const defaultAgustusKey = findMonthKey(cleanMonthsData, 'Agustus 2026');
  res.json({
    monthsData: cleanMonthsData,
    month: 'Agustus 2026',
    programs: defaultAgustusKey ? cleanMonthsData[defaultAgustusKey].programs : []
  });
});

// --- DELETE /api/admin/programs: Admin Delete Registered Program (Specific or All in Month) ---
app.delete('/api/admin/programs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rawMonthLabel = req.body?.monthLabel || req.query?.monthLabel;
    const programName = req.body?.programName || req.query?.programName;
    const imageId = req.body?.imageId || req.query?.imageId;

    if (!rawMonthLabel) {
      return res.status(400).json({ error: 'Parameter monthLabel wajib diisi.' });
    }

    const indexPath = path.join(programsDir, 'index.json');
    const programIndex = getOrInitializeProgramIndex();

    const monthKey = findMonthKey(programIndex, rawMonthLabel);

    if (!monthKey || !programIndex[monthKey] || !programIndex[monthKey].programs || programIndex[monthKey].programs.length === 0) {
      return res.status(404).json({ error: `Data program untuk periode "${rawMonthLabel}" tidak ditemukan.` });
    }

    const monthLabel = programIndex[monthKey].monthLabel || monthKey;
    const monthSlug = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const physicalExcelFile = path.join(programsDir, `program_${monthSlug}.xlsx`);

    // Check if programName requested is ALL or emoji option
    const isDeleteAll = !programName || programName === 'ALL' || programName.trim() === '' || programName.startsWith('💥');

    if (!isDeleteAll) {
      const targetName = programName.trim().replace(/\s+/g, ' ').toLowerCase();

      // If specific imageId is requested for deletion within this program
      if (imageId) {
        const targetProg = programIndex[monthKey].programs.find(p => {
          const name = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
          return name === targetName;
        });

        if (!targetProg) {
          return res.status(404).json({ error: `Program "${programName}" tidak ditemukan pada periode ${monthLabel}.` });
        }

        if (Array.isArray(targetProg.images) && targetProg.images.length > 0) {
          const initialImgCount = targetProg.images.length;
          targetProg.images = targetProg.images.filter(img => img.id !== imageId && img.imageUrl !== imageId);

          if (targetProg.images.length === initialImgCount) {
            return res.status(404).json({ error: `Slide gambar tidak ditemukan dalam program "${programName}".` });
          }

          if (targetProg.images.length > 0) {
            targetProg.imageUrl = targetProg.images[0].imageUrl;
            targetProg.detailUrl = targetProg.images[0].detailUrl;
            targetProg.scannedLink = targetProg.images[0].scannedLink;
            targetProg.updatedAt = new Date().toISOString();
          } else {
            // If all slides are deleted, remove program from programs array
            programIndex[monthKey].programs = programIndex[monthKey].programs.filter(p => {
              const name = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
              return name !== targetName;
            });
            programIndex[monthKey].sheetsCount = programIndex[monthKey].programs.length;
          }

          programIndex[monthKey].updatedAt = new Date().toISOString();
          fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

          return res.json({
            success: true,
            message: `Berhasil menghapus slide gambar dari program "${programName}".`,
            monthLabel,
            program: targetProg,
            remainingSlides: targetProg.images ? targetProg.images.length : 0
          });
        }
      }

      const initialCount = programIndex[monthKey].programs.length;
      
      programIndex[monthKey].programs = programIndex[monthKey].programs.filter(p => {
        const name = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
        return name !== targetName;
      });

      const newCount = programIndex[monthKey].programs.length;
      if (initialCount === newCount) {
        return res.status(404).json({ error: `Program "${programName}" tidak ditemukan pada periode ${monthLabel}.` });
      }

      programIndex[monthKey].sheetsCount = newCount;
      programIndex[monthKey].updatedAt = new Date().toISOString();

      // If programs array is now empty, remove month key entirely
      if (newCount === 0) {
        delete programIndex[monthKey];
        if (monthLabel.toLowerCase().includes('agustus 2026')) {
          programIndex['__deleted_Agustus_2026'] = true;
        }
        if (fs.existsSync(physicalExcelFile)) {
          try { fs.unlinkSync(physicalExcelFile); } catch {}
        }
      }

      fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

      return res.json({
        success: true,
        message: `Berhasil menghapus program "${programName}" dari periode ${monthLabel}.`,
        monthLabel,
        remainingProgramsCount: newCount
      });
    } else {
      // Deleting all programs for the month
      delete programIndex[monthKey];
      if (monthLabel.toLowerCase().includes('agustus 2026')) {
        programIndex['__deleted_Agustus_2026'] = true;
      }

      if (fs.existsSync(physicalExcelFile)) {
        try {
          fs.unlinkSync(physicalExcelFile);
          console.log(`  └─ Deleted physical Excel file: ${physicalExcelFile}`);
        } catch (e) {
          console.error(`  └─ Failed to delete physical Excel file:`, e.message);
        }
      }

      fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

      return res.json({
        success: true,
        message: `Berhasil menghapus seluruh program terdaftar pada periode ${monthLabel}.`,
        monthLabel
      });
    }
  } catch (err) {
    console.error('Error deleting program:', err);
    res.status(500).json({ error: 'Gagal menghapus data program: ' + err.message });
  }
});




// --- TSEL ONE PAIRING STORAGE & FAST LOOKUP SEARCH SYSTEM ---

const pairingDir = path.join(__dirname, 'data/pairing');
if (!fs.existsSync(pairingDir)) {
  try { fs.mkdirSync(pairingDir, { recursive: true }); } catch {}
}

let cachedPairingRecords = null;
let pairingLookupMap = null;

function formatExcelDate(val) {
  if (val === undefined || val === null || val === '' || val === '\\N' || val === 'N/A') return '';
  const num = Number(val);
  if (!isNaN(num) && num > 25000 && num < 70000) {
    try {
      const dateObj = xlsx.SSF.parse_date_code(num);
      if (dateObj) {
        const yyyy = dateObj.y;
        const mm = String(dateObj.m).padStart(2, '0');
        const dd = String(dateObj.d).padStart(2, '0');
        const hh = String(dateObj.H || 0).padStart(2, '0');
        const min = String(dateObj.M || 0).padStart(2, '0');
        const ss = String(dateObj.S || 0).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
      }
    } catch {}
  }
  return String(val).replace(/^\\N$/, '').trim();
}

function parsePairingExcelFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames.includes('Unstacked_Pairing_Data')
      ? 'Unstacked_Pairing_Data'
      : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return null;

    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    if (!rawRows || rawRows.length === 0) return null;

    const parsedRecords = rawRows.map(row => {
      const getValRaw = (keys) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null) return row[k];
        }
        return '';
      };

      const getValStr = (keys) => {
        const val = getValRaw(keys);
        if (val === undefined || val === null || val === '\\N') return '';
        return String(val).trim();
      };

      const getValDate = (keys) => {
        const val = getValRaw(keys);
        return formatExcelDate(val);
      };

      return {
        bb_id: getValStr(['bb_id', 'BB_ID', 'bb id', 'BB ID']),
        msisdn_parent: getValStr(['msisdn_parent', 'MSISDN_PARENT', 'msisdn parent']),
        msisdn_child1: getValStr(['msisdn_child1', 'MSISDN_CHILD1', 'msisdn_child', 'MSISDN_CHILD']),
        msisdn_child2: getValStr(['msisdn_child2', 'MSISDN_CHILD2']),
        msisdn_child3: getValStr(['msisdn_child3', 'MSISDN_CHILD3']),
        msisdn_child4: getValStr(['msisdn_child4', 'MSISDN_CHILD4']),
        msisdn_child5: getValStr(['msisdn_child5', 'MSISDN_CHILD5']),
        msisdn_child6: getValStr(['msisdn_child6', 'MSISDN_CHILD6']),
        product_commercial_name: getValStr(['product_commercial_name', 'PRODUCT_COMMERCIAL_NAME']),
        activation_date_ih: getValDate(['activation_date_ih', 'ACTIVATION_DATE_IH']),
        activation_date_parent: getValDate(['activation_date_parent', 'ACTIVATION_DATE_PARENT']),
        activation_date_child1: getValDate(['activation_date_child1', 'ACTIVATION_DATE_CHILD1', 'activation_date_child', 'ACTIVATION_DATE_CHILD']),
        activation_date_child2: getValDate(['activation_date_child2', 'ACTIVATION_DATE_CHILD2']),
        activation_date_child3: getValDate(['activation_date_child3', 'ACTIVATION_DATE_CHILD3']),
        activation_date_child4: getValDate(['activation_date_child4', 'ACTIVATION_DATE_CHILD4']),
        activation_date_child5: getValDate(['activation_date_child5', 'ACTIVATION_DATE_CHILD5']),
        activation_date_child6: getValDate(['activation_date_child6', 'ACTIVATION_DATE_CHILD6']),
        city: getValStr(['city', 'CITY', 'kota', 'KOTA']),
        region: getValStr(['region', 'REGION']),
        area: getValStr(['area', 'AREA']),
        cluster: getValStr(['cluster', 'CLUSTER']),
        sto: getValStr(['sto', 'STO']),
        tsel_id_ih: getValStr(['tsel_id_ih', 'TSEL_ID_IH']),
        tsel_id_mobile_parent: getValStr(['tsel_id_mobile_parent', 'TSEL_ID_MOBILE_PARENT']),
        tsel_id_mobile_child1: getValStr(['tsel_id_mobile_child1', 'TSEL_ID_MOBILE_CHILD1', 'tsel_id_mobile_child', 'TSEL_ID_MOBILE_CHILD']),
        tsel_id_mobile_child2: getValStr(['tsel_id_mobile_child2', 'TSEL_ID_MOBILE_CHILD2']),
        tsel_id_mobile_child3: getValStr(['tsel_id_mobile_child3', 'TSEL_ID_MOBILE_CHILD3']),
        tsel_id_mobile_child4: getValStr(['tsel_id_mobile_child4', 'TSEL_ID_MOBILE_CHILD4']),
        tsel_id_mobile_child5: getValStr(['tsel_id_mobile_child5', 'TSEL_ID_MOBILE_CHILD5']),
        tsel_id_mobile_child6: getValStr(['tsel_id_mobile_child6', 'TSEL_ID_MOBILE_CHILD6']),
        order_id: getValStr(['order_id', 'ORDER_ID', 'Order ID', 'order id']),
        source_perdana_parent: getValStr(['Source Perdana Parent', 'source_perdana_parent', 'SOURCE_PERDANA_PARENT']),
        source_perdana_child1: getValStr(['Source Perdana Child1', 'source_perdana_child1', 'SOURCE_PERDANA_CHILD1', 'Source Perdana Child', 'source_perdana_child']),
        source_perdana_child2: getValStr(['Source Perdana Child2', 'source_perdana_child2', 'SOURCE_PERDANA_CHILD2']),
        source_perdana_child3: getValStr(['Source Perdana Child3', 'source_perdana_child3', 'SOURCE_PERDANA_CHILD3']),
        source_perdana_child4: getValStr(['Source Perdana Child4', 'source_perdana_child4', 'SOURCE_PERDANA_CHILD4']),
        source_perdana_child5: getValStr(['Source Perdana Child5', 'source_perdana_child5', 'SOURCE_PERDANA_CHILD5']),
        source_perdana_child6: getValStr(['Source Perdana Child6', 'source_perdana_child6', 'SOURCE_PERDANA_CHILD6'])
      };
    });

    return parsedRecords;
  } catch (err) {
    console.error('Error parsing pairing excel file:', err);
    return null;
  }
}

function buildPairingLookupMap() {
  pairingLookupMap = new Map();
  if (!cachedPairingRecords) return;

  const addSingleKey = (key, idx) => {
    if (!key) return;
    const strKey = String(key).trim();
    if (strKey.length < 3) return;
    if (!pairingLookupMap.has(strKey)) {
      pairingLookupMap.set(strKey, []);
    }
    const arr = pairingLookupMap.get(strKey);
    if (!arr.includes(idx)) {
      arr.push(idx);
    }
  };

  const addMsisdnKeys = (val, idx) => {
    if (!val) return;
    const strVal = String(val).trim();
    if (strVal.length < 3) return;

    addSingleKey(strVal, idx);

    if (strVal.startsWith('628')) {
      const alias08 = '08' + strVal.slice(3);
      addSingleKey(alias08, idx);
    } else if (strVal.startsWith('08')) {
      const alias62 = '628' + strVal.slice(2);
      addSingleKey(alias62, idx);
    }
  };

  cachedPairingRecords.forEach((rec, idx) => {
    addSingleKey(rec.bb_id, idx);
    addSingleKey(rec.order_id, idx);

    addMsisdnKeys(rec.msisdn_parent, idx);
    addMsisdnKeys(rec.msisdn_child1, idx);
    addMsisdnKeys(rec.msisdn_child2, idx);
    addMsisdnKeys(rec.msisdn_child3, idx);
    addMsisdnKeys(rec.msisdn_child4, idx);
    addMsisdnKeys(rec.msisdn_child5, idx);
    addMsisdnKeys(rec.msisdn_child6, idx);
  });
}

function getPairingData() {
  if (cachedPairingRecords) return { records: cachedPairingRecords, lookupMap: pairingLookupMap };

  const jsonPath = path.join(pairingDir, 'records.json');
  const excelPath = path.join(pairingDir, 'tsel_one_pairing.xlsx');

  if (fs.existsSync(jsonPath)) {
    try {
      console.log('⚡ Loading Tsel One Pairing index from disk...');
      const start = Date.now();
      const raw = fs.readFileSync(jsonPath, 'utf8');
      cachedPairingRecords = JSON.parse(raw);

      // Auto upgrade cache if existing records.json lacks source_perdana_parent
      if (cachedPairingRecords.length > 0 && cachedPairingRecords[0].source_perdana_parent === undefined && fs.existsSync(excelPath)) {
        console.log('🔄 Upgrading pairing records cache to include Source Perdana fields...');
        const freshRecords = parsePairingExcelFile(excelPath);
        if (freshRecords && freshRecords.length > 0) {
          cachedPairingRecords = freshRecords;
          fs.writeFileSync(jsonPath, JSON.stringify(cachedPairingRecords));
          console.log(`✅ Cache upgraded with ${freshRecords.length} records.`);
        }
      }

      buildPairingLookupMap();
      console.log(`✅ Tsel One Pairing loaded: ${cachedPairingRecords.length} records in ${Date.now() - start}ms`);
      return { records: cachedPairingRecords, lookupMap: pairingLookupMap };
    } catch (e) {
      console.error('Failed to load pairing JSON cache:', e);
    }
  }
  return { records: [], lookupMap: new Map() };
}

function searchPairingData(query) {
  if (!query || typeof query !== 'string') return [];
  const cleanQ = query.trim();

  if (cleanQ.length < 6) return [];

  const { records, lookupMap } = getPairingData();
  if (!records || records.length === 0 || !lookupMap) return [];

  // Strict exact match from Map (O(1))
  if (lookupMap.has(cleanQ)) {
    const matchedIndices = lookupMap.get(cleanQ);
    return matchedIndices.map(i => records[i]);
  }

  // Alias lookup for MSISDN 08... <-> 628...
  if (cleanQ.startsWith('08')) {
    const alias62 = '628' + cleanQ.slice(2);
    if (lookupMap.has(alias62)) {
      const matchedIndices = lookupMap.get(alias62);
      return matchedIndices.map(i => records[i]);
    }
  } else if (cleanQ.startsWith('628')) {
    const alias08 = '08' + cleanQ.slice(3);
    if (lookupMap.has(alias08)) {
      const matchedIndices = lookupMap.get(alias08);
      return matchedIndices.map(i => records[i]);
    }
  }

  // Strict exact match requirement: NO substring/partial fallback!
  return [];
}

// --- POST /api/admin/upload-pairing-excel: Upload Data Tsel One Pairing ---
app.post('/api/admin/upload-pairing-excel', authenticateToken, requireAdmin, (req, res) => {
  pairingUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer Error in pairing upload:', err.message);
      return res.status(400).json({ error: err.message || 'Gagal mengunggah file Excel pairing.' });
    }

    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Tidak ada file Excel pairing yang diunggah.' });
      }

      const targetPath = path.join(pairingDir, 'tsel_one_pairing.xlsx');
      fs.writeFileSync(targetPath, req.file.buffer);

      const records = parsePairingExcelFile(targetPath);
      if (!records || records.length === 0) {
        return res.status(400).json({ error: 'Gagal menguraikan file Excel pairing. Pastikan format tabel dan header sesuai.' });
      }

      const recordsJsonPath = path.join(pairingDir, 'records.json');
      fs.writeFileSync(recordsJsonPath, JSON.stringify(records), 'utf8');

      cachedPairingRecords = records;
      buildPairingLookupMap();

      const metaPath = path.join(pairingDir, 'meta.json');
      const meta = {
        updatedAt: new Date().toISOString(),
        totalRows: records.length,
        fileName: req.file.originalname
      };
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

      res.json({
        success: true,
        message: `Berhasil mengimpor Data Tsel One Pairing! (${records.length.toLocaleString('id-ID')} baris terproses)`,
        totalRows: records.length,
        updatedAt: meta.updatedAt
      });
    } catch (err) {
      console.error('Error uploading pairing excel:', err);
      res.status(500).json({ error: 'Gagal memproses file Excel pairing: ' + err.message });
    }
  });
});

// --- GET /api/pairing/search: Cari Data Pairing berdasarkan BB ID / MSISDN / Order ID (Auth Required) ---
app.get('/api/pairing/search', authenticateToken, (req, res) => {
  try {
    const q = req.query.q || req.query.query || '';
    const cleanQ = String(q).trim();

    if (!cleanQ || cleanQ.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Kata kunci terlalu umum. Masukkan nilai yang akurat dan lengkap (minimal 6 karakter).'
      });
    }

    const start = Date.now();
    const results = searchPairingData(cleanQ);
    const durationMs = Date.now() - start;

    res.json({
      success: true,
      query: cleanQ,
      count: results.length,
      durationMs,
      results
    });
  } catch (err) {
    console.error('Error searching pairing data:', err);
    res.status(500).json({ success: false, error: 'Gagal melakukan pencarian data pairing: ' + err.message });
  }
});

// Dedicated API 404 handler: ensure API requests never fall back to HTML index.html
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Endpoint API "${req.originalUrl}" tidak ditemukan pada server.` });
});

// Dedicated Express error middleware for API & uploads
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Terjadi kesalahan internal pada server.' });
});

const staticPath = path.join(__dirname, '../gtm-monitor-frontend/dist');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.use((req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

