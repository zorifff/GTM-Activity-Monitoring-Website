// Controller auth: baca request → panggil auth.service → pasang/hapus cookie & kirim respons
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAccessCookie,
  setRefreshCookie,
  clearAccessCookie,
  clearAuthCookies
} = require('../utils/authCookies');

// Pasang cookie baru / hapus cookie sesuai hasil rotasi refresh token
const applyRotationCookies = (req, res, result) => {
  if (result.ok) {
    setAccessCookie(req, res, result.accessToken);
    setRefreshCookie(req, res, result.refreshToken, result.sessionExpiresAt);
  } else if (result.clearCookies) {
    clearAuthCookies(req, res);
  }
};

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const { publicUser, accessToken, refreshToken, sessionExpiresAt } = await authService.login({
    username,
    password,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip
  });

  setAccessCookie(req, res, accessToken);
  setRefreshCookie(req, res, refreshToken, sessionExpiresAt);
  res.json({
    success: true,
    user: publicUser,
    expiresAt: sessionExpiresAt.getTime()
  });
}, 'Terjadi kesalahan internal saat login.');

// POST /api/auth/refresh — tukar refresh token dengan access token baru (Refresh Token Rotation)
const refresh = asyncHandler(async (req, res) => {
  const result = await authService.rotateRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  applyRotationCookies(req, res, result);
  if (result.ok) return res.json({ success: true, user: result.user, expiresAt: result.expiresAt });
  res.status(result.status).json({ success: false, code: result.code, message: result.message });
}, 'Gagal memperbarui sesi.');

// GET /api/auth/session — status login saat aplikasi dibuka; selalu 200 (pengunjung tanpa sesi bukan error).
// Bila access token habis tapi refresh token masih sah, sesi diperbarui sekaligus dalam request ini.
const session = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const accessToken = req.cookies?.[ACCESS_COOKIE];
    const active = await authService.getSessionFromAccessToken(accessToken);
    if (active) {
      return res.json({ success: true, authenticated: true, user: active.user, expiresAt: active.expiresAt });
    }

    if (req.cookies?.[REFRESH_COOKIE]) {
      const result = await authService.rotateRefreshToken(req.cookies[REFRESH_COOKIE]);
      applyRotationCookies(req, res, result);
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
    // 503 (bukan 500): frontend memperlakukannya sebagai "server sementara tidak bisa memeriksa sesi"
    console.error(`❌ [${req.id || '-'}] Error in /api/auth/session:`, error);
    res.status(503).json({ success: false, message: 'Gagal memeriksa sesi login.', requestId: req.id });
  }
};

// GET /api/auth/me — validasi sesi aktif (frontend menanyakan siapa yang sedang login)
const me = (req, res) => {
  res.json({ success: true, user: authService.toPublicUser(req.user), expiresAt: req.authSession.expiresAt });
};

// POST /api/auth/logout — cabut sesi di server lalu hapus cookie (cookie HttpOnly hanya bisa dihapus oleh server)
const logout = async (req, res) => {
  await authService.logout({
    rawRefreshToken: req.cookies?.[REFRESH_COOKIE],
    rawAccessToken: req.cookies?.[ACCESS_COOKIE]
  });
  clearAuthCookies(req, res);
  res.json({ success: true });
};

// GET /api/admin/sessions — daftar sesi login aktif
const listSessions = asyncHandler(async (req, res) => {
  res.json(await authService.listActiveSessions());
}, 'Gagal memuat daftar sesi.');

// POST /api/admin/sessions/revoke — pembatalan sesi paksa
const revokeSessions = asyncHandler(async (req, res) => {
  // Sudah divalidasi skema: tepat salah satu dari userId (integer) atau sessionId (UUID)
  const { userId, sessionId } = req.body;
  res.json(await authService.revokeSessionsByAdmin({ userId, sessionId, adminUsername: req.user.username }));
}, 'Gagal membatalkan sesi.');

module.exports = { login, refresh, session, me, logout, listSessions, revokeSessions };
