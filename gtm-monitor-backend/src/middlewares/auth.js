// Middleware autentikasi: access token (cookie HttpOnly) + pengecekan revocation list per request
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { ACCESS_COOKIE, clearAccessCookie } = require('../utils/authCookies');
const { getActiveSession } = require('../services/auth.service');

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

module.exports = { sendUnauthorized, authenticateToken, optionalAuthenticateToken, requireAdmin };
