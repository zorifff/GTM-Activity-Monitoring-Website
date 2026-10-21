// Uji Fase 1 Task 2: dual-token, rotasi, reuse detection, revocation. Dijalankan oleh tests/run.js (npm test); TEST_PORT = port server uji.
const path = require('path');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const jwt = require(path.join(backendDir, 'node_modules/jsonwebtoken'));
const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const crypto = require('crypto');
const prisma = new PrismaClient();
const BASE = `http://localhost:${process.env.TEST_PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };

// Cookie jar sederhana per "browser"
const jar = () => ({ cookies: {}, raw: {} });
const store = (j, res) => {
  for (const sc of res.headers.getSetCookie()) {
    const [pair, ...attrs] = sc.split(';');
    const [name, value] = [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)];
    j.raw[name] = sc;
    if (!value || attrs.some(a => /expires=Thu, 01 Jan 1970/i.test(a))) delete j.cookies[name]; else j.cookies[name] = value;
  }
};
const cookieHeader = (j, url) => !j ? "" : Object.entries(j.cookies)
  .filter(([n]) => n !== 'gtm_refresh_token' || url.startsWith('/api/auth'))   // mensimulasikan Path=/api/auth
  .map(([n, v]) => `${n}=${v}`).join('; ');
const call = async (j, url, opts = {}) => {
  const res = await fetch(BASE + url, { ...opts, headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(j, url), ...(opts.headers || {}) } });
  if (j) store(j, res);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};
const login = async (j) => call(j, '/api/auth/login', { method: 'POST', body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
const hmac = (t) => crypto.createHmac('sha256', process.env.REFRESH_TOKEN_SECRET).update(t).digest('hex');

(async () => {
  console.log('\n— 1. Login');
  const A = jar();
  const lg = await login(A);
  check('Login sukses', lg.status === 200 && lg.body.success);
  check('Respons tidak berisi token', !('token' in lg.body) && !JSON.stringify(lg.body).includes(A.cookies.gtm_refresh_token || '###'));
  check('expiresAt sesi ≈ 7 hari', Math.abs(lg.body.expiresAt - Date.now() - 7 * 864e5) < 60e3, ((lg.body.expiresAt - Date.now()) / 864e5).toFixed(2) + ' hari');
  const acc = A.raw.gtm_access_token, ref = A.raw.gtm_refresh_token;
  check('Access cookie: HttpOnly, SameSite=Strict, Max-Age=900 (15 menit), Path=/', /HttpOnly/.test(acc) && /SameSite=Strict/.test(acc) && /Max-Age=900/.test(acc) && /Path=\//.test(acc));
  check('Refresh cookie: HttpOnly, SameSite=Strict, Path=/api/auth, ±7 hari', /HttpOnly/.test(ref) && /SameSite=Strict/.test(ref) && /Path=\/api\/auth/.test(ref) && Math.abs(new Date(/Expires=([^;]+)/.exec(ref)[1]) - Date.now() - 7 * 864e5) < 120e3, ref.replace(/=[^;]+;/, '=***;'));
  const payload = jwt.decode(A.cookies.gtm_access_token);
  check('Access token: masa aktif 15 menit & membawa sid', payload.exp - payload.iat === 900 && !!payload.sid);
  const sid = payload.sid;
  const rows = await prisma.refreshToken.findMany({ where: { sessionId: sid } });
  check('DB menyimpan hash HMAC-SHA256, bukan token asli', rows.length === 1 && rows[0].tokenHash === hmac(A.cookies.gtm_refresh_token) && rows[0].tokenHash !== A.cookies.gtm_refresh_token && /^[0-9a-f]{64}$/.test(rows[0].tokenHash));

  console.log('\n— 2. Access token');
  check('/me dengan access token = 200', (await call(A, '/api/auth/me')).status === 200);
  const { iat: _iat, exp: _exp, ...claims } = payload;
  const expired = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);
  const ex = await call(null, '/api/auth/me', { headers: { Cookie: `gtm_access_token=${expired}` } });
  check('Access token kedaluwarsa = 401 TOKEN_EXPIRED', ex.status === 401 && ex.body.code === 'TOKEN_EXPIRED');
  const oldStyle = jwt.sign({ id: 1, username: 'x', role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  const os = await call(null, '/api/auth/me', { headers: { Cookie: `gtm_access_token=${oldStyle}` } });
  check('Token lama Task 1 (tanpa sid) ditolak', os.status === 401 && os.body.code === 'SESSION_REVOKED');

  console.log('\n— 3. Refresh Token Rotation');
  const oldRefresh = A.cookies.gtm_refresh_token, oldAccess = A.cookies.gtm_access_token;
  await new Promise(r => setTimeout(r, 1100)); // agar iat access token baru berbeda
  const rf = await call(A, '/api/auth/refresh', { method: 'POST' });
  check('Refresh = 200 & mengembalikan user', rf.status === 200 && rf.body.user?.username === process.env.ADMIN_USERNAME);
  check('Refresh token baru berbeda dari lama', A.cookies.gtm_refresh_token && A.cookies.gtm_refresh_token !== oldRefresh);
  check('Access token baru berbeda & sid sama', A.cookies.gtm_access_token !== oldAccess && jwt.decode(A.cookies.gtm_access_token).sid === sid);
  const oldRow = await prisma.refreshToken.findUnique({ where: { tokenHash: hmac(oldRefresh) } });
  check('Refresh token lama ditandai sudah dipakai (rotatedAt)', !!oldRow?.rotatedAt);

  console.log('\n— 4. Deteksi pemakaian ulang refresh token');
  const thief = jar(); thief.cookies.gtm_refresh_token = oldRefresh;
  const race = await call(thief, '/api/auth/refresh', { method: 'POST' });
  check('Token lama dipakai ulang < 30 dtk = 409 (balapan antar-tab, sesi aman)', race.status === 409 && race.body.code === 'REFRESH_RACE');
  check('…sesi masih aktif', (await call(A, '/api/auth/me')).status === 200);
  console.log('   ⏳ menunggu 31 detik untuk melewati jendela toleransi…');
  await new Promise(r => setTimeout(r, 31000));
  const reuse = await call(thief, '/api/auth/refresh', { method: 'POST' });
  check('Token lama dipakai ulang > 30 dtk = 401 SESSION_REVOKED', reuse.status === 401 && reuse.body.code === 'SESSION_REVOKED');
  const sess = await prisma.authSession.findUnique({ where: { id: sid } });
  check('Seluruh sesi dicabut dengan alasan reuse_detected', sess.revokedReason === 'reuse_detected' && !!sess.revokedAt);
  check('Access token korban yang masih berlaku langsung ditolak (seketika)', (await call(A, '/api/auth/me')).status === 401);
  check('Refresh token terbaru korban juga tidak bisa dipakai', (await call(A, '/api/auth/refresh', { method: 'POST' })).status === 401);

  console.log('\n— 5. Logout');
  const B = jar(); await login(B);
  const sidB = jwt.decode(B.cookies.gtm_access_token).sid;
  const keepAccessB = B.cookies.gtm_access_token, keepRefreshB = B.cookies.gtm_refresh_token;
  const lo = await call(B, '/api/auth/logout', { method: 'POST' });
  check('Logout = 200 & cookie dihapus', lo.status === 200 && !B.cookies.gtm_access_token && !B.cookies.gtm_refresh_token);
  check('Sesi di DB dicabut (logout)', (await prisma.authSession.findUnique({ where: { id: sidB } })).revokedReason === 'logout');
  const C = jar(); C.cookies = { gtm_access_token: keepAccessB, gtm_refresh_token: keepRefreshB };
  check('Salinan access token setelah logout ditolak', (await call(C, '/api/auth/me')).status === 401);
  check('Salinan refresh token setelah logout ditolak', (await call(C, '/api/auth/refresh', { method: 'POST' })).status === 401);

  console.log('\n— 6. Pencabutan sesi oleh Admin');
  const D = jar(), E = jar(); await login(D); await login(E);
  const sidE = jwt.decode(E.cookies.gtm_access_token).sid;
  const list = await call(D, '/api/admin/sessions');
  check('GET /api/admin/sessions menampilkan sesi tanpa token/hash', list.status === 200 && list.body.sessions.some(s => s.id === sidE) && !JSON.stringify(list.body).includes('tokenHash'));
  check('Input tidak valid ditolak (400)', (await call(D, '/api/admin/sessions/revoke', { method: 'POST', body: JSON.stringify({}) })).status === 400 && (await call(D, '/api/admin/sessions/revoke', { method: 'POST', body: JSON.stringify({ userId: 'abc' }) })).status === 400);
  const rv = await call(D, '/api/admin/sessions/revoke', { method: 'POST', body: JSON.stringify({ sessionId: sidE }) });
  check('Admin mencabut 1 sesi', rv.status === 200 && rv.body.revokedCount === 1);
  check('Sesi yang dicabut langsung tidak bisa dipakai', (await call(E, '/api/auth/me')).status === 401);
  check('Sesi admin sendiri tetap aktif', (await call(D, '/api/auth/me')).status === 200);

  console.log('\n— 7. Refresh paralel (dua tab bersamaan)');
  const F = jar(); await login(F);
  const sidF = jwt.decode(F.cookies.gtm_access_token).sid;
  const [r1, r2] = await Promise.all([call({ ...F, cookies: { ...F.cookies } }, '/api/auth/refresh', { method: 'POST' }), call({ ...F, cookies: { ...F.cookies }, raw: {} }, '/api/auth/refresh', { method: 'POST' })]);
  const statuses = [r1.status, r2.status].sort().join(',');
  check('Satu sukses, satu 409 (tidak dua-duanya sukses)', statuses === '200,409', statuses);
  check('Sesi tidak dicabut karena balapan wajar', !(await prisma.authSession.findUnique({ where: { id: sidF } })).revokedAt);

  // Bersihkan sesi uji
  await prisma.authSession.updateMany({ where: { id: { in: [sidF, jwt.decode(D.cookies.gtm_access_token).sid] }, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'logout' } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  await prisma.$disconnect();
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
