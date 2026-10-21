// Uji Fase 1 Task 3: helmet/CSP & rate limiting. Dijalankan oleh tests/run.js (npm test); TEST_PORT = port server uji.
const path = require('path');
const backendDir = path.resolve(__dirname, '..');
const PORT = Number(process.env.TEST_PORT);
process.loadEnvFile(path.join(backendDir, '.env'));
const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();
const BASE = `http://localhost:${PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CRED = { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD };

const req = async (url, { method = 'GET', body, cookie } = {}) => {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body && JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, body: json };
};
const statuses = async (n, fn) => { const out = []; for (let i = 0; i < n; i++) out.push((await fn()).status); return out; };

(async () => {
  console.log('— 1. Header keamanan (helmet)');
  const page = await fetch(BASE + '/');
  const h = page.headers;
  const csp = h.get('content-security-policy') || '';
  check('CSP terpasang pada halaman web', csp.includes("default-src 'self'") && csp.includes("script-src 'self'"));
  check("CSP: script-src tanpa 'unsafe-inline' (script XSS diblokir)", !/script-src[^;]*unsafe-inline/.test(csp));
  check('CSP: Google Fonts & Cloudinary diizinkan', csp.includes('https://fonts.googleapis.com') && csp.includes('https://fonts.gstatic.com') && csp.includes('https://res.cloudinary.com'));
  check("CSP: object-src 'none' & frame-ancestors 'none'", csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'none'"));
  check('CSP: tanpa upgrade-insecure-requests (akses LAN HTTP aman)', !csp.includes('upgrade-insecure-requests'));
  check('X-Content-Type-Options: nosniff', h.get('x-content-type-options') === 'nosniff');
  check('X-Frame-Options: SAMEORIGIN', h.get('x-frame-options') === 'SAMEORIGIN');
  check('Strict-Transport-Security tanpa includeSubDomains', /max-age=31536000/.test(h.get('strict-transport-security') || '') && !/includeSubDomains/.test(h.get('strict-transport-security')));
  check('Referrer-Policy: no-referrer', h.get('referrer-policy') === 'no-referrer');
  check('X-Powered-By (Express) disembunyikan', !h.get('x-powered-by'));
  const apiH = (await req('/api/programs')).headers;
  check('Header juga ada di respons API', !!apiH.get('content-security-policy') && apiH.get('x-content-type-options') === 'nosniff');

  console.log('\n— 2. Batas umum API: 300 request/menit per IP');
  const health = await statuses(305, () => req('/api/health'));
  check('/api/health dikecualikan (305x tetap 200, aman untuk watchdog)', health.every(s => s === 200));
  const general = await statuses(301, () => req('/api/programs'));
  const firstBlocked = general.indexOf(429) + 1;
  // 1 request /api/programs sudah terpakai di bagian 1 → yang ke-301 dalam menit ini adalah indeks 299 di batch
  check('Request ke-301 dalam 1 menit diblokir 429', general.slice(0, 299).every(s => s === 200) && general[299] === 429, `ke-${firstBlocked + 1} dalam menit ini`);
  const rl = await req('/api/programs');
  check('Pesan 429 berbahasa Indonesia + header RateLimit', rl.body.code === 'RATE_LIMITED' && /Coba lagi dalam \d+ menit/.test(rl.body.message) && /limit=300/.test(rl.headers.get('ratelimit') || '') && /^300;w=60$/.test(rl.headers.get('ratelimit-policy') || ''), rl.body.message);
  console.log('   ⏳ menunggu 61 detik hingga kuota umum reset…');
  await sleep(61000);

  console.log('\n— 3. Login: maksimal 5 percobaan GAGAL per IP / 15 menit');
  const ok1 = await req('/api/auth/login', { method: 'POST', body: CRED });
  const ok2 = await req('/api/auth/login', { method: 'POST', body: CRED });
  check('Login berhasil tidak dihitung (2x sukses)', ok1.status === 200 && ok2.status === 200);
  const wrong = await statuses(10, () => req('/api/auth/login', { method: 'POST', body: { ...CRED, password: 'salah-total' } }));
  check('10 kali password salah → 401', wrong.every(s => s === 401), wrong.join(','));
  const sixth = await req('/api/auth/login', { method: 'POST', body: { ...CRED, password: 'salah-total' } });
  check('Percobaan ke-11 → 429 + pesan 10 menit', sixth.status === 429 && /percobaan login gagal/.test(sixth.body.message) && /dalam 10 menit/.test(sixth.body.message), sixth.body.message);
  const blockedCorrect = await req('/api/auth/login', { method: 'POST', body: CRED });
  check('Selama diblokir, password benar pun ditolak (anti brute-force)', blockedCorrect.status === 429);
  const cookie = ok1.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  check('Sesi yang sudah login tetap bisa dipakai', (await req('/api/auth/me', { cookie })).status === 200);

  // Kunci "1 import ODP sekaligus" kini disimpan di Redis (lintas instance) → diuji di tests/queue.test.js
  const accessOnly = cookie.split('; ').find(c => c.startsWith('gtm_access_token'));

  console.log('\n— 4. Batas per akun: ETL Excel & unggah media (per 15 menit)');
  const odp = await statuses(11, () => req('/api/admin/import-excel', { method: 'POST', cookie: accessOnly }));
  check('Import ODP: request ke-11 → 429', odp.slice(0, 10).every(s => s === 400) && odp[10] === 429, odp.join(','));
  const pairing = await statuses(11, () => req('/api/admin/upload-pairing-excel', { method: 'POST', cookie: accessOnly }));
  check('Import Pairing: limit terpisah, request ke-11 → 429', pairing.slice(0, 10).every(s => s === 400) && pairing[10] === 429, pairing.join(','));
  const program = await statuses(11, () => req('/api/admin/upload-program-image', { method: 'POST', cookie: accessOnly }));
  check('Upload gambar program: request ke-11 → 429', program.slice(0, 10).every(s => s === 400) && program[10] === 429, program.join(','));
  const acts = await statuses(61, () => req('/api/activities', { method: 'POST', cookie: accessOnly, body: { branchName: '__UJI__', projectName: 'x', type: 'bumdes' } }));
  check('Upload foto kegiatan: 60 diterima, request ke-61 → 429', acts.slice(0, 60).every(s => s === 404) && acts[60] === 429, `60x ${acts[0]}, ke-61: ${acts[60]}`);
  const unauth = await req('/api/activities', { method: 'POST', body: {} });
  check('Tanpa login tetap 401 (limiter dipasang setelah autentikasi)', unauth.status === 401);
  check('Endpoint lain tidak terpengaruh limit unggah', (await req('/api/auth/me', { cookie })).status === 200);

  await prisma.authSession.updateMany({ where: { userAgent: 'node', revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'logout' } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  await prisma.$disconnect();
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
