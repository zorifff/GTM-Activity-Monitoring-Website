// Uji GET /api/auth/session. Dijalankan oleh tests/run.js (npm test); TEST_PORT = port server uji.
const path = require('path');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const jwt = require(path.join(backendDir, 'node_modules/jsonwebtoken'));
const BASE = `http://localhost:${process.env.TEST_PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };
const parse = (res) => Object.fromEntries(res.headers.getSetCookie().map(c => { const p = c.split(';')[0]; return [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)]; }));
const req = async (url, cookies = {}, method = 'GET', body) => {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body && JSON.stringify(body) });
  return { status: res.status, set: parse(res), body: await res.json().catch(() => ({})), cache: res.headers.get('cache-control') };
};

(async () => {
  const anon = await req('/api/auth/session');
  check('Pengunjung tanpa cookie → 200, authenticated:false (tidak ada 401 merah)', anon.status === 200 && anon.body.authenticated === false);
  check('Respons tidak di-cache browser', anon.cache === 'no-store');

  const lg = await req('/api/auth/login', {}, 'POST', { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  let { gtm_access_token: acc, gtm_refresh_token: ref } = lg.set;
  const s1 = await req('/api/auth/session', { gtm_access_token: acc, gtm_refresh_token: ref });
  check('Access token valid → authenticated:true tanpa rotasi', s1.status === 200 && s1.body.authenticated && s1.body.user?.username === process.env.ADMIN_USERNAME && !s1.set.gtm_refresh_token);

  const s2 = await req('/api/auth/session', { gtm_refresh_token: ref });
  check('Access token hilang/habis + refresh sah → authenticated:true & cookie baru', s2.body.authenticated === true && !!s2.set.gtm_access_token && s2.set.gtm_refresh_token && s2.set.gtm_refresh_token !== ref);
  const payload = jwt.decode(acc); const { iat, exp, ...claims } = payload;
  const expired = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 5 }, process.env.JWT_SECRET);
  ref = s2.set.gtm_refresh_token;
  const s3 = await req('/api/auth/session', { gtm_access_token: expired, gtm_refresh_token: ref });
  check('Access token kedaluwarsa + refresh sah → diperbarui', s3.body.authenticated === true && !!s3.set.gtm_refresh_token);
  ref = s3.set.gtm_refresh_token;

  const [p1, p2] = await Promise.all([req('/api/auth/session', { gtm_refresh_token: ref }), req('/api/auth/session', { gtm_refresh_token: ref })]);
  const outcomes = [p1.body.authenticated ? 'ok' : p1.body.retry ? 'retry' : 'x', p2.body.authenticated ? 'ok' : p2.body.retry ? 'retry' : 'x'].sort().join(',');
  check('Dua tab bersamaan → satu ok, satu retry (StrictMode / multi-tab aman)', outcomes === 'ok,retry', outcomes);
  ref = (p1.set.gtm_refresh_token || p2.set.gtm_refresh_token);
  acc = (p1.set.gtm_access_token || p2.set.gtm_access_token);

  const bad = await req('/api/auth/session', { gtm_refresh_token: 'palsu' });
  check('Refresh token palsu → authenticated:false & cookie dibersihkan', bad.status === 200 && bad.body.authenticated === false && bad.set.gtm_refresh_token === '');

  const rf = await req('/api/auth/refresh', { gtm_refresh_token: ref }, 'POST');
  check('POST /api/auth/refresh tetap berfungsi', rf.status === 200 && rf.body.success);
  await req('/api/auth/logout', { gtm_refresh_token: rf.set.gtm_refresh_token }, 'POST');
  const after = await req('/api/auth/session', { gtm_access_token: rf.set.gtm_access_token, gtm_refresh_token: rf.set.gtm_refresh_token });
  check('Setelah logout → authenticated:false', after.body.authenticated === false);

  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
