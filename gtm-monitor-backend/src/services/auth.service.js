// ─── AUTH SERVICE: Dual-Token (Access Token 15 menit + Refresh Token 7 hari, rotasi & revocation list) ───
// Logika bisnis sesi & token tanpa req/res — pemasangan cookie dilakukan controller (utils/authCookies.js).
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { JWT_SECRET, REFRESH_TOKEN_SECRET } = require('../config/env');
const {
  ACCESS_TOKEN_TTL_MS,
  SESSION_TTL_MS,
  REFRESH_REUSE_GRACE_MS,
  SESSION_CACHE_TTL_MS
} = require('../utils/authCookies');

// Database hanya menyimpan sidik jari HMAC-SHA256 — token asli tidak bisa dipulihkan meski database bocor
const hashRefreshToken = (token) => crypto.createHmac('sha256', REFRESH_TOKEN_SECRET).update(token).digest('hex');
const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const toPublicUser = ({ id, username, role, branchName, fullName }) => ({ id, username, role, branchName, fullName });
const buildPublicUser = (dbUser) => toPublicUser({ ...dbUser, branchName: dbUser.branch ? dbUser.branch.name : null });

const signAccessToken = (publicUser, sessionId) =>
  jwt.sign({ ...publicUser, sid: sessionId }, JWT_SECRET, { expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) });

const verifyAccessToken = (token, options) => jwt.verify(token, JWT_SECRET, options);

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

// Login: verifikasi kredensial, buat sesi + refresh token pertama.
// Hasil: { publicUser, accessToken, refreshToken, sessionExpiresAt }
async function login({ username, password, userAgent, ipAddress }) {
  if (!username || !password) {
    throw new AppError(400, { success: false, message: 'Username dan password wajib diisi.' });
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
    throw new AppError(401, { success: false, message: 'Username atau password salah.' });
  }

  const validPassword = await bcrypt.compare(cleanPassword, user.password).catch(() => false);

  if (!validPassword) {
    throw new AppError(401, { success: false, message: 'Username atau password salah.' });
  }

  const publicUser = buildPublicUser(user);
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const refreshToken = generateRefreshToken();

  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      expiresAt: sessionExpiresAt,
      userAgent: (userAgent || '').slice(0, 255) || null,
      ipAddress: ipAddress || null,
      refreshTokens: {
        create: { tokenHash: hashRefreshToken(refreshToken), expiresAt: sessionExpiresAt }
      }
    }
  });

  return { publicUser, accessToken: signAccessToken(publicUser, session.id), refreshToken, sessionExpiresAt };
}

// Refresh Token Rotation: tukar refresh token dengan access token + refresh token baru.
// Hasil sukses: { ok: true, user, expiresAt, accessToken, refreshToken, sessionExpiresAt }
// Hasil gagal : { ok: false, status, code, message, clearCookies }  (clearCookies=false untuk balapan antar-tab)
async function rotateRefreshToken(rawToken) {
  const failure = (message, code) => ({ ok: false, status: 401, code, message, clearCookies: true });
  const race = { ok: false, status: 409, code: 'REFRESH_RACE', message: 'Sesi baru saja diperbarui oleh tab lain.', clearCookies: false };

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
  return {
    ok: true,
    user: publicUser,
    expiresAt: session.expiresAt.getTime(),
    accessToken: signAccessToken(publicUser, session.id),
    refreshToken: newRefreshToken,
    sessionExpiresAt: session.expiresAt
  };
}

// Status sesi dari access token (tanpa melempar error). Hasil: { user, expiresAt } atau null
async function getSessionFromAccessToken(accessToken) {
  if (!accessToken) return null;
  try {
    const payload = verifyAccessToken(accessToken);
    const session = await getActiveSession(payload.sid);
    if (session) return { user: toPublicUser(payload), expiresAt: session.expiresAt };
  } catch { /* access token habis / tidak sah */ }
  return null;
}

// Logout: cabut sesi milik refresh token (atau sid pada access token). Kegagalan hanya dicatat, logout tetap berhasil.
async function logout({ rawRefreshToken, rawAccessToken }) {
  try {
    let sessionId = null;
    if (rawRefreshToken) {
      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(rawRefreshToken) },
        select: { sessionId: true }
      });
      sessionId = stored?.sessionId || null;
    }
    if (!sessionId && rawAccessToken) {
      try {
        sessionId = verifyAccessToken(rawAccessToken, { ignoreExpiration: true }).sid || null;
      } catch { /* token tidak sah: tidak ada sesi yang perlu dicabut */ }
    }
    if (sessionId) await revokeSessions({ id: sessionId }, 'logout');
  } catch (error) {
    console.error('Error revoking session on logout:', error);
  }
}

// Admin: daftar sesi login yang masih aktif (tanpa token / hash)
async function listActiveSessions() {
  const sessions = await prisma.authSession.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true, userId: true, createdAt: true, lastUsedAt: true, expiresAt: true, userAgent: true, ipAddress: true,
      user: { select: { username: true, fullName: true, role: true } }
    }
  });
  return { success: true, count: sessions.length, sessions };
}

// Admin: pembatalan sesi paksa — semua sesi milik satu user ({ userId }) atau satu sesi tertentu ({ sessionId })
async function revokeSessionsByAdmin({ userId, sessionId, adminUsername }) {
  const where = userId !== undefined ? { userId } : { id: sessionId };
  const revokedCount = await revokeSessions(where, 'admin_revoked');
  console.log(`🔒 [Auth] Admin ${adminUsername} mencabut ${revokedCount} sesi (${JSON.stringify(where)}).`);
  return { success: true, revokedCount, message: `${revokedCount} sesi berhasil dibatalkan.` };
}

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

const startAuthCleanupJob = () => setInterval(cleanupAuthRecords, 60 * 60 * 1000).unref();

module.exports = {
  toPublicUser,
  verifyAccessToken,
  getActiveSession,
  revokeSessions,
  login,
  rotateRefreshToken,
  getSessionFromAccessToken,
  logout,
  listActiveSessions,
  revokeSessionsByAdmin,
  startAuthCleanupJob
};
