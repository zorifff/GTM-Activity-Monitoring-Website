// Uji Centralized Error Handling (Fase 2 Task 1). Dijalankan oleh tests/run.js (npm test); TEST_PORT = port server uji.
const path = require('path');
const fs = require('fs');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const BASE = `http://localhost:${process.env.TEST_PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };

const errorHandler = require(path.join(backendDir, 'src/middlewares/errorHandler'));
const AppError = require(path.join(backendDir, 'src/utils/AppError'));
const asyncHandler = require(path.join(backendDir, 'src/utils/asyncHandler'));
const { multer } = require(path.join(backendDir, 'src/middlewares/uploads'));

// res tiruan untuk menguji middleware tanpa server
const mockRes = () => {
  const res = { statusCode: 200, body: undefined, headersSent: false };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};
const mockReq = { id: 'req-uji-123', method: 'POST', originalUrl: '/api/uji' };
const runHandler = (err) => {
  const res = mockRes();
  const originalError = console.error;
  console.error = () => {}; // log internal sengaja tidak ditampilkan saat uji
  try { errorHandler(err, mockReq, res, () => {}); } finally { console.error = originalError; }
  return res;
};

(async () => {
  console.log('— Error internal tidak bocor ke klien');
  const prismaLike = Object.assign(new Error('Invalid `prisma.projectActivityPhoto.delete()` invocation: table "public"."ProjectActivityPhoto" ... at C:\\server\\src\\x.js:10'), { code: 'P2025' });
  let res = runHandler(prismaLike);
  const text = JSON.stringify(res.body);
  check('Status 500 dengan code INTERNAL_ERROR', res.statusCode === 500 && res.body.code === 'INTERNAL_ERROR');
  check('Pesan asli/nama tabel/stack TIDAK ikut terkirim', !/prisma|ProjectActivityPhoto|public|\.js:|P2025|at /.test(text), text);
  check('Respons memuat requestId untuk pelacakan', res.body.requestId === 'req-uji-123');
  check('Pesan umum default bila endpoint tidak menentukan', res.body.message === 'Terjadi kesalahan internal pada server.' && res.body.error === res.body.message);

  const withPublic = Object.assign(new Error('ECONNRESET db.internal:5432'), { publicMessage: 'Gagal menghapus foto kegiatan.' });
  res = runHandler(withPublic);
  check('Pesan umum per endpoint dipakai (publicMessage)', res.statusCode === 500 && res.body.message === 'Gagal menghapus foto kegiatan.' && !JSON.stringify(res.body).includes('ECONNRESET'));

  console.log('\n— Error untuk klien tetap utuh');
  res = runHandler(new AppError(404, { success: false, message: 'Proyek "X" tidak ditemukan.' }));
  check('AppError: status & body persis seperti yang dilempar service', res.statusCode === 404 && JSON.stringify(res.body) === JSON.stringify({ success: false, message: 'Proyek "X" tidak ditemukan.' }));
  res = runHandler(new AppError(400, 'Input salah.', 'BAD_INPUT'));
  check('AppError dengan pesan teks → { success, code, message, error }', res.statusCode === 400 && res.body.code === 'BAD_INPUT' && res.body.message === 'Input salah.' && res.body.error === 'Input salah.');
  res = runHandler(new multer.MulterError('LIMIT_FILE_SIZE'));
  check('Multer: file terlalu besar → 400', res.statusCode === 400 && /melebihi batas/.test(res.body.message));
  res = runHandler(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 }));
  check('JSON rusak → 400', res.statusCode === 400 && res.body.message === 'Format data JSON tidak valid.');
  res = runHandler(Object.assign(new Error('Hanya file gambar'), { status: 400 }));
  check('Error 4xx eksplisit diteruskan apa adanya', res.statusCode === 400 && res.body.message === 'Hanya file gambar');

  console.log('\n— asyncHandler');
  const forwarded = await new Promise(resolve => {
    asyncHandler(async () => { throw new Error('rahasia internal'); }, 'Gagal menyimpan kegiatan')({}, mockRes(), resolve);
  });
  check('Error async diteruskan ke error handler + publicMessage terpasang', forwarded instanceof Error && forwarded.publicMessage === 'Gagal menyimpan kegiatan');
  const forwardedApp = await new Promise(resolve => {
    asyncHandler(async () => { throw new AppError(403, { error: 'Akses ditolak.' }); }, 'X')({}, mockRes(), resolve);
  });
  check('AppError tidak diberi publicMessage (tetap pesan aslinya)', forwardedApp instanceof AppError && !forwardedApp.publicMessage);

  console.log('\n— Lewat HTTP');
  const health = await fetch(`${BASE}/api/health`);
  check('Header X-Request-Id ada di respons API', /^[0-9a-f-]{36}$/.test(health.headers.get('x-request-id') || ''));
  const nf = await fetch(`${BASE}/api/endpoint-tidak-ada`);
  const nfBody = await nf.json().catch(() => null);
  check('Endpoint API tak dikenal → 404 JSON (bukan halaman HTML)', nf.status === 404 && nfBody && /tidak ditemukan/.test(nfBody.error));
  const bad = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"rusak' });
  check('JSON rusak via HTTP → 400 dengan requestId di header', bad.status === 400 && !!bad.headers.get('x-request-id'));

  console.log('\n— Pemindaian kode: tidak ada pesan error internal yang dikirim ke klien');
  const offenders = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
      // pola lama: res.status(500).json({ ...: '...' + error.message }) / AppError berisi err.message
      // Baris bertanda "pesan input aman" = penolakan input (400) yang memang ditujukan untuk pengguna
      if (/(json|AppError)\(.*\b(err|error|e)\.(message|stack)/.test(l) && !l.includes('pesan input aman')) offenders.push(`${path.relative(backendDir, p)}:${i + 1}`);
    });
  });
  walk(path.join(backendDir, 'src'));
  check('Tidak ada error.message / stack di respons (src/**)', offenders.length === 0, offenders.join(', '));
  const serverJs = fs.readFileSync(path.join(backendDir, 'server.js'), 'utf8');
  check('server.js menjadi entry point tipis (< 30 baris)', serverJs.split('\n').length < 30, `${serverJs.split('\n').length} baris`);

  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
