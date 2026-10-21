// Uji Fase 1 Task 4: validasi skema terpusat (Zod). Dijalankan oleh tests/run.js (npm test); TEST_PORT = port server uji.
const path = require('path');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();
const BASE = `http://localhost:${process.env.TEST_PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };
let cookie = '';

const call = async (url, { method = 'GET', json, form, raw, headers = {} } = {}) => {
  const init = { method, headers: { Cookie: cookie, ...headers } };
  if (json !== undefined) { init.body = JSON.stringify(json); init.headers['Content-Type'] = 'application/json'; }
  if (form) init.body = form;
  if (raw !== undefined) { init.body = raw; init.headers['Content-Type'] = 'application/json'; }
  const res = await fetch(BASE + url, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, msg: body.message || body.error || '' };
};
const isValidationError = (r) => r.status === 400 && r.body.code === 'VALIDATION_ERROR';
const fd = (fields, file) => { const f = new FormData(); Object.entries(fields).forEach(([k, v]) => f.append(k, v)); if (file) f.append(file.field, new Blob([file.content], { type: file.type }), file.name); return f; };

(async () => {
  console.log('— Login');
  const ok = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: `  ${process.env.ADMIN_USERNAME}  `, password: process.env.ADMIN_PASSWORD }) });
  cookie = ok.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  check('Login sah (username dengan spasi dipangkas) → 200', ok.status === 200);
  let r = await call('/api/auth/login', { method: 'POST', json: { username: { $ne: '' }, password: 'x' } });
  check('Username berupa objek (injeksi) → 400', isValidationError(r), r.msg);
  r = await call('/api/auth/login', { method: 'POST', json: { username: 'jateng' } });
  check('Password kosong → 400 "Password wajib diisi."', isValidationError(r) && r.msg === 'Password wajib diisi.', r.msg);
  r = await call('/api/auth/login', { method: 'POST', raw: '{"username": "jateng", rusak' });
  check('JSON rusak → 400 (bukan 500)', r.status === 400, r.msg);

  console.log('\n— Upload kegiatan (form data multipart)');
  const actBase = { branchName: '__CABANG_UJI__', projectName: 'Proyek Uji', type: 'tsel_menyapa', planDate: '2026-10-21', wokName: 'WOK', fieldAsing: 'x' };
  r = await call('/api/activities', { method: 'POST', form: fd(actBase) });
  check('Form data sah lolos validasi (berlanjut ke logika bisnis → 404 branch)', r.status === 404, r.msg);
  r = await call('/api/activities', { method: 'POST', form: fd({ ...actBase, type: 'hapus_semua' }) });
  check('Jenis kegiatan di luar daftar → 400', isValidationError(r), r.msg);
  r = await call('/api/activities', { method: 'POST', form: fd({ ...actBase, planDate: 'besok' }) });
  check('Tanggal tidak valid → 400 (sebelumnya error 500)', isValidationError(r), r.msg);
  r = await call('/api/activities', { method: 'POST', form: fd({ ...actBase, branchName: '' }) });
  check('Nama branch kosong → 400', isValidationError(r), r.msg);
  r = await call('/api/activities', { method: 'POST', form: fd({ ...actBase, keterangan: 'x'.repeat(501) }) });
  check('Keterangan > 500 karakter → 400', isValidationError(r), r.msg);
  r = await call('/api/activities', { method: 'POST', form: fd(actBase, { field: 'photo', content: 'MZ-bukan-gambar', type: 'application/x-msdownload', name: 'virus.exe' }) });
  check('File bukan gambar → 400 dengan pesan (sebelumnya 500)', r.status === 400 && /Hanya file gambar/.test(r.msg), r.msg);

  console.log('\n— Hapus foto / verifikasi / tolak');
  r = await call('/api/activities/delete-photo', { method: 'POST', json: { projectName: 'Proyek Uji', type: { not: 'x' } } });
  check('Injeksi operator Prisma pada "type" → 400', isValidationError(r), r.msg);
  r = await call('/api/activities/delete-photo', { method: 'POST', json: { type: 'bumdes' } });
  check('Tanpa identitas proyek → 400', isValidationError(r), r.msg);
  r = await call('/api/activities/delete-photo', { method: 'POST', json: { projectName: '__PROYEK_UJI_TIDAK_ADA__', type: 'bumdes', photoId: null } });
  check('Input sah (photoId null dari frontend) lolos → 404 proyek', r.status === 404, r.msg);
  r = await call('/api/verify', { method: 'POST', json: { branchName: 'X', projectName: '__PROYEK_UJI_TIDAK_ADA__', type: 'open_table', photoUrl: 'https://evil.example/x.jpg' } });
  check('Verify: field asing photoUrl dibuang, input sah lolos → 404', r.status === 404, r.msg);
  r = await call('/api/reject', { method: 'POST', json: { projectId: ['a', 'b'], type: 'bumdes' } });
  check('Reject: projectId berupa array → 400', isValidationError(r), r.msg);

  console.log('\n— Program (gambar, daftar, hapus)');
  r = await call('/api/admin/upload-program-image', { method: 'POST', form: fd({ monthLabel: 'Agustus 2026', programName: 'Uji', detailUrl: 'javascript:alert(document.cookie)' }) });
  check('detailUrl "javascript:" → 400', isValidationError(r), r.msg);
  r = await call('/api/admin/upload-program-image', { method: 'POST', form: fd({ monthLabel: '__proto__', programName: 'Uji' }) });
  check('monthLabel "__proto__" → 400 (sebelumnya error 500)', isValidationError(r), r.msg);
  r = await call('/api/admin/upload-program-image', { method: 'POST', form: fd({ monthLabel: 'Agustus 2026', programName: 'Uji', detailUrl: 'https://bit.ly/abc' }) });
  check('Form data sah lolos → 400 karena file belum dipilih (logika bisnis)', r.status === 400 && /Tidak ada file gambar/.test(r.msg), r.msg);
  r = await call('/api/programs?month=agustus%202026');
  check('GET program: "agustus 2026" dinormalisasi → data Agustus 2026', r.status === 200 && r.body.monthLabel === 'Agustus 2026' && r.body.programs.length > 0, `${r.body.programs?.length} program`);
  r = await call('/api/programs?month=__proto__');
  check('GET program: month tidak valid → 400', isValidationError(r), r.msg);
  r = await call('/api/programs');
  check('GET program tanpa query tetap 200', r.status === 200 && !!r.body.monthsData);
  r = await call('/api/admin/programs', { method: 'DELETE', json: { monthLabel: 'constructor' } });
  check('DELETE program: monthLabel tidak valid → 400', isValidationError(r), r.msg);
  r = await call('/api/admin/programs', { method: 'DELETE', json: { monthLabel: 'Januari 2030', programName: 'ALL' } });
  check('DELETE program: input sah, periode tidak ada → 404 (data asli aman)', r.status === 404, r.msg);

  console.log('\n— Cek pairing (query parameter)');
  r = await call('/api/pairing/search?q=abc');
  check('Kata kunci < 6 karakter → 400 + pesan lama', isValidationError(r) && /minimal 6 karakter/.test(r.msg), r.msg);
  r = await call('/api/pairing/search?q=123456&q=789012');
  check('Parameter q ganda (array) → 400', isValidationError(r), r.msg);
  r = await call(`/api/pairing/search?q=${'9'.repeat(65)}`);
  check('Kata kunci > 64 karakter → 400', isValidationError(r), r.msg);
  r = await call('/api/pairing/search?query=08123456789');
  check('Alias ?query= tetap didukung → 200', r.status === 200 && r.body.success);

  console.log('\n— Admin sesi & import file');
  r = await call('/api/admin/sessions/revoke', { method: 'POST', json: { userId: 1, sessionId: '00000000-0000-4000-8000-000000000000' } });
  check('Revoke: userId & sessionId bersamaan → 400', isValidationError(r), r.msg);
  r = await call('/api/admin/sessions/revoke', { method: 'POST', json: { sessionId: 'bukan-uuid' } });
  check('Revoke: sessionId bukan UUID → 400', isValidationError(r), r.msg);
  r = await call('/api/admin/sessions/revoke', { method: 'POST', json: { sessionId: '00000000-0000-4000-8000-000000000000' } });
  check('Revoke: input sah → 200 (0 sesi)', r.status === 200 && r.body.revokedCount === 0);
  r = await call('/api/admin/import-excel', { method: 'POST', form: fd({ fieldAsing: 'x' }) });
  check('Import ODP: field asing dibuang, tanpa file → 400 "No file uploaded"', r.status === 400 && r.msg === 'No file uploaded', r.msg);
  r = await call('/api/admin/upload-pairing-excel', { method: 'POST', form: fd({}, { field: 'file', content: 'x', type: 'application/pdf', name: 'a.pdf' }) });
  check('Import pairing: file PDF → 400', r.status === 400, r.msg);

  console.log('\n— Format respons error');
  r = await call('/api/activities', { method: 'POST', form: fd({ type: 'x' }) });
  check('Respons memuat success:false, code, message, error, errors[{field,message}]', r.body.success === false && r.body.code === 'VALIDATION_ERROR' && r.body.message === r.body.error && Array.isArray(r.body.errors) && r.body.errors.every(e => e.field && e.message), JSON.stringify(r.body.errors.map(e => e.field)));

  await fetch(BASE + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
  await prisma.authSession.updateMany({ where: { userAgent: 'node', revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'logout' } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  await prisma.$disconnect();
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
