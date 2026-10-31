// Verifikasi token Cloudflare Turnstile ke server Cloudflare (siteverify). Token hanya berlaku sekali & ±5 menit.
const { TURNSTILE_SECRET_KEY } = require('../config/env');

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 8000;

// Hasil: { success, errorCodes, action, hostname }. Gangguan jaringan ke Cloudflare dilempar sebagai error.
async function verifyTurnstileToken({ token, remoteIp, secret = TURNSTILE_SECRET_KEY }) {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  const res = await fetch(SITEVERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Turnstile siteverify HTTP ${res.status}`);
  const data = await res.json();
  return {
    success: data.success === true,
    errorCodes: data['error-codes'] || [],
    action: data.action || null,
    hostname: data.hostname || null
  };
}

module.exports = { verifyTurnstileToken };
