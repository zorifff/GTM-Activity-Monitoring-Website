// Cookie sesi HttpOnly (access token & refresh token) beserta konstanta masa berlaku

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

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  ACCESS_TOKEN_TTL_MS,
  SESSION_TTL_MS,
  REFRESH_REUSE_GRACE_MS,
  SESSION_CACHE_TTL_MS,
  getCookieOptions,
  setAccessCookie,
  setRefreshCookie,
  clearAccessCookie,
  clearAuthCookies
};
