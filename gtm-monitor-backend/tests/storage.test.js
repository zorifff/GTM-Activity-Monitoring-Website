// Uji Fase 2 Task 3: object storage S3-compatible untuk foto terverifikasi (/media, wajib login) & helper penyimpanan.
// Dijalankan oleh tests/run.js (npm test). Objek uji ditulis di bucket dengan awalan verified/__uji__/<uuid>/ lalu dihapus.
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const PORT = Number(process.env.TEST_PORT);
const BASE = `http://localhost:${PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };

const jwt = require(path.join(backendDir, 'node_modules/jsonwebtoken'));
const storage = require(path.join(backendDir, 'src/lib/objectStorage'));
const photo = require(path.join(backendDir, 'src/services/photoStorage.service'));
const { sanitizeFolderName, getActivityLabel } = require(path.join(backendDir, 'src/utils/files'));

// Salinan logika penamaan versi lama (saveVerifiedPhotoToLocal, sebelum Task 3) sebagai acuan
const legacyRelativePath = (photoUrl, rawBranch, rawWok, rawProjectName, type, planDate, now) => {
  const branchFolder = sanitizeFolderName(rawBranch || 'UNKNOWN_BRANCH').toUpperCase();
  const wokFolder = sanitizeFolderName(rawWok || 'UNKNOWN_WOK').toUpperCase();
  const projectFolder = sanitizeFolderName(rawProjectName || 'UNKNOWN_PROJECT');
  const actLabel = getActivityLabel(type).toUpperCase();
  const d = planDate ? new Date(planDate) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const day = String(validDate.getDate()).padStart(2, '0');
  const hhmmss = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  let ext = '.jpg';
  const matchExt = photoUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i);
  if (matchExt) ext = `.${matchExt[1].toLowerCase()}`;
  const fileName = `${actLabel.substring(0, 3).toUpperCase()}_${branchFolder.substring(0, 3).toUpperCase()}_${wokFolder.substring(0, 3).toUpperCase()}_${projectFolder}_${day}${month}${year}_${hhmmss}${ext}`;
  return `${branchFolder}/${wokFolder}/${projectFolder}/${actLabel}/${month}_${year}/${fileName}`;
};

// Request mentah (tanpa normalisasi URL oleh fetch) untuk menguji path seperti %2E%2E
const rawGet = (urlPath, headers = {}) => new Promise((resolve, reject) => {
  http.get({ host: 'localhost', port: PORT, path: urlPath, headers }, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  }).on('error', reject);
});

(async () => {
  const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
  const cookies = login.headers.getSetCookie().map(c => c.split(';')[0]);
  const cookie = cookies.join('; ');
  const accessToken = cookies.find(c => c.startsWith('gtm_access_token=')).split('=')[1];

  console.log('— 1. Object storage (S3-compatible)');
  const testDir = `verified/__uji__/${crypto.randomUUID()}`;
  const key = `${testDir}/FOTO UJI_${Date.now()}.png`;
  const image = fs.readFileSync(path.join(__dirname, 'fixtures/ocr-sample.png'));
  try {
    await storage.putObject(key, image, 'image/png');
    check('Unggah objek ke bucket', await storage.objectExists(key));
  } catch (e) {
    check('Object storage dapat diakses', false, `${e.message} — jalankan dulu: npm run storage (root)`);
    console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
    storage.closeStorage();
    process.exitCode = 1;
    return;
  }
  check('Daftar objek per awalan', (await storage.listObjects(`${testDir}/`)).some(o => o.key === key));
  check('Objek tidak ada → null (bukan error)', (await storage.getObject(`${testDir}/tidak-ada.png`)) === null);

  console.log('\n— 2. Penyajian foto /media (wajib login)');
  const mediaUrl = `/media/${key.split('/').map(encodeURIComponent).join('/')}`;
  let res = await fetch(BASE + mediaUrl, { headers: { Cookie: cookie } });
  let bytes = Buffer.from(await res.arrayBuffer());
  const etag = res.headers.get('etag');
  check('Login → 200 + isi identik', res.status === 200 && bytes.equals(image), `${res.status}, ${bytes.length} byte`);
  check('Content-Type & Cache-Control private', res.headers.get('content-type') === 'image/png' && /private/.test(res.headers.get('cache-control') || ''), `${res.headers.get('content-type')} | ${res.headers.get('cache-control')}`);
  res = await fetch(BASE + mediaUrl, { headers: { Cookie: cookie, 'If-None-Match': etag } });
  check('ETag sama → 304 Not Modified', res.status === 304);
  res = await fetch(BASE + mediaUrl);
  check('Tanpa login → 401', res.status === 401);
  const payload = jwt.decode(accessToken);
  const now = Math.floor(Date.now() / 1000);
  const expired = jwt.sign({ ...payload, iat: now - 3600, exp: now - 60 }, process.env.JWT_SECRET || 'gtm-super-secret-key-2026');
  res = await fetch(BASE + mediaUrl, { headers: { Cookie: `gtm_access_token=${expired}` } });
  check('Access token lewat 15 menit tetapi sesi aktif → foto tetap tampil (200)', res.status === 200);
  res = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: `gtm_access_token=${expired}` } });
  check('Token yang sama tetap ditolak di API biasa (401)', res.status === 401);
  const forged = jwt.sign({ ...payload }, 'kunci-palsu');
  res = await fetch(BASE + mediaUrl, { headers: { Cookie: `gtm_access_token=${forged}` } });
  check('Token palsu (tanda tangan salah) → 401', res.status === 401);
  res = await fetch(`${BASE}/media/${testDir}/tidak-ada.png`, { headers: { Cookie: cookie } });
  check('Foto tidak ada → 404', res.status === 404);
  const tmpKey = `tmp/odp-import/__uji__-${crypto.randomUUID()}.xlsx`;
  await storage.putObject(tmpKey, Buffer.from('rahasia'), 'application/octet-stream');
  res = await fetch(`${BASE}/media/${tmpKey}`, { headers: { Cookie: cookie } });
  check('File sementara (tmp/) tidak pernah disajikan → 404', res.status === 404);
  await storage.deleteObject(tmpKey);
  const traversal = await rawGet('/media/verified/%2E%2E/tmp/odp-import/x.xlsx', { Cookie: cookie });
  check('Path traversal (..) ditolak → 400', traversal.status === 400, `${traversal.status}`);
  const legacy = await rawGet('/database%20foto/PEKALONGAN/BATANG/X/A%20B.jpg');
  check('URL lama /database foto/... → 301 ke /media/verified/...', legacy.status === 301 && legacy.headers.location === '/media/verified/PEKALONGAN/BATANG/X/A%20B.jpg', `${legacy.status} ${legacy.headers.location}`);

  console.log('\n— 3. Helper penyimpanan foto');
  const fixedNow = new Date(2026, 9, 21, 14, 14, 14);
  const cases = [
    ['https://res.cloudinary.com/x/image/upload/v1/gtm_staging/a.png', 'pekalongan', 'batang', '250_-3074_6537', 'tsel_menyapa', '2026-08-07T00:00:00.000Z'],
    ['https://res.cloudinary.com/x/image/upload/v1/gtm_staging/b.jpeg?x=1', 'Semarang', 'Kudus/Pati', 'Proyek: "A"', 'bumdes', null],
    ['https://res.cloudinary.com/x/c', null, null, null, 'branding_outlet', 'bukan-tanggal']
  ];
  const sameAsLegacy = cases.every(([url, b, w, p, t, d]) => {
    const { folder, baseFileName, ext } = photo.buildVerifiedPhotoKey({ photoUrl: url, rawBranch: b, rawWok: w, rawProjectName: p, type: t, planDate: d }, fixedNow);
    return `${folder}/${baseFileName}${ext}` === legacyRelativePath(url, b, w, p, t, d, fixedNow);
  });
  const sample = photo.buildVerifiedPhotoKey({ photoUrl: cases[0][0], rawBranch: 'pekalongan', rawWok: 'batang', rawProjectName: '250_-3074_6537', type: 'tsel_menyapa', planDate: cases[0][5] }, fixedNow);
  check('Hierarki folder & nama file sama persis dengan versi lama', sameAsLegacy, `${sample.folder}/${sample.baseFileName}${sample.ext}`);
  check('photoUrlToStorageKey: /media/verified/...', photo.photoUrlToStorageKey('/media/verified/A/B C.jpg') === 'verified/A/B C.jpg');
  check('photoUrlToStorageKey: format lama (spasi & %20)', photo.photoUrlToStorageKey('/database foto/A/B C.jpg') === 'verified/A/B C.jpg' && photo.photoUrlToStorageKey('/database%20foto/A/B%20C.jpg') === 'verified/A/B C.jpg');
  check('photoUrlToStorageKey: Cloudinary / kosong → null', photo.photoUrlToStorageKey('https://res.cloudinary.com/x.jpg') === null && photo.photoUrlToStorageKey(null) === null);
  check('URL non-Cloudinary tidak diproses ulang saat verifikasi', (await photo.saveVerifiedPhotoToStorage('/media/verified/A/x.jpg', 'B', 'W', 'P', 'bumdes', null)) === '/media/verified/A/x.jpg');
  await photo.deleteStoredPhoto(`/media/${key}`);
  check('deleteStoredPhoto menghapus objek di bucket', !(await storage.objectExists(key)));
  const legacyKey = `${testDir}/lama.jpg`;
  await storage.putObject(legacyKey, Buffer.from('x'), 'image/jpeg');
  await photo.deleteStoredPhoto(`/database foto/${legacyKey.slice('verified/'.length)}`);
  check('deleteStoredPhoto memahami URL format lama', !(await storage.objectExists(legacyKey)));
  res = await fetch(BASE + mediaUrl, { headers: { Cookie: cookie } });
  check('Foto yang sudah dihapus → 404', res.status === 404);

  console.log('\n— 4. Logout memblokir akses foto');
  await storage.putObject(key, image, 'image/png');
  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  res = await fetch(BASE + mediaUrl, { headers: { Cookie: `gtm_access_token=${accessToken}` } });
  check('Access token dari sesi yang sudah logout → 401', res.status === 401);
  await storage.deleteObject(key);
  check('Objek uji dibersihkan', (await storage.listObjects(`${testDir}/`)).length === 0);

  storage.closeStorage();
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
