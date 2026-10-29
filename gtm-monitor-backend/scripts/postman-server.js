// Server khusus pengujian Postman (port 3200) — data Neon TIDAK pernah diubah:
//   1. Layanan pendukung di WSL (Redis, Garage, PostgreSQL uji) dinyalakan bila belum berjalan.
//   2. Cadangan Neon terbaru dibuat (pg_dump, hanya membaca) lalu dipulihkan ke database lokal "gtm_postman".
//   3. File uji dibuat di postman/fixtures/ (Excel ODP dari data salinan, Excel pairing contoh, gambar, file salah format).
//   4. Server API + worker dijalankan memakai database salinan, antrean Redis berawalan "gtm-postman", dan cookie
//      tanpa atribut Secure (Postman tidak mengirim cookie Secure lewat http://localhost).
// Ctrl+C → server, worker & layanan yang dinyalakan skrip ini dimatikan.
//   node gtm-monitor-backend/scripts/postman-server.js           (atau: npm run postman:server dari root)
//   node gtm-monitor-backend/scripts/postman-server.js --reuse   → pakai database gtm_postman yang sudah ada (tanpa memulihkan ulang)
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
require('../src/config/env');

const BACKEND_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(BACKEND_DIR, '..');
const FIXTURES_DIR = path.join(ROOT_DIR, 'postman', 'fixtures');
const DISTRO = process.env.POSTGRES_WSL_DISTRO || 'Ubuntu';
const PORT = Number(process.env.POSTMAN_PORT) || 3200;
const DATABASE = 'gtm_postman';
const QUEUE_PREFIX = 'gtm-postman';
const REUSE = process.argv.includes('--reuse');

const log = (msg) => console.log(`[postman-server] ${msg}`);
const fail = (msg) => { console.error(`❌ [postman-server] ${msg}`); process.exit(1); };

if (!process.env.TEST_DATABASE_URL || !process.env.TEST_DIRECT_URL) {
  fail('TEST_DATABASE_URL / TEST_DIRECT_URL belum ada di .env. Jalankan sekali: npm run db:test:setup (root).');
}
const withDatabase = (raw) => { const u = new URL(raw); u.pathname = `/${DATABASE}`; return u.toString(); };
const POOLED_URL = withDatabase(process.env.TEST_DATABASE_URL);
const DIRECT_URL = withDatabase(process.env.TEST_DIRECT_URL);
const PG_PORT = Number(new URL(DIRECT_URL).port || 5433);

const isPortOpen = (port) => new Promise(resolve => {
  const socket = net.connect(port, '127.0.0.1');
  const done = (open) => { socket.destroy(); resolve(open); };
  socket.setTimeout(1500, () => done(false));
  socket.once('connect', () => done(true));
  socket.once('error', () => done(false));
});
const waitForPort = async (port, seconds = 60) => {
  for (let i = 0; i < seconds * 2; i++) {
    if (await isPortOpen(port)) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
};

// ─── 1. Layanan pendukung ───
const INFRA = [
  { name: 'Redis', script: 'scripts/redis-wsl.js', port: Number(new URL(process.env.REDIS_URL || 'redis://127.0.0.1:6379').port || 6379) },
  { name: 'Object storage (Garage)', script: 'scripts/storage-wsl.js', port: Number(new URL(process.env.S3_ENDPOINT || 'http://127.0.0.1:3900').port || 3900) },
  { name: 'PostgreSQL uji', script: 'scripts/postgres-wsl.js', port: Number(new URL(process.env.TEST_DATABASE_URL).port || 6433) }
];
const startedInfra = [];
const children = [];

async function startInfra() {
  for (const svc of INFRA) {
    if (await isPortOpen(svc.port)) continue;
    log(`Menyalakan ${svc.name}...`);
    const proc = spawn(process.execPath, [svc.script], { cwd: BACKEND_DIR, stdio: 'ignore', windowsHide: true });
    startedInfra.push({ ...svc, proc });
    if (!(await waitForPort(svc.port))) fail(`${svc.name} gagal menyala dalam 60 detik.`);
  }
}

// ─── 2. Salinan database ───
function restoreDatabase() {
  log('Membuat cadangan Neon terbaru (pg_dump, hanya membaca)...');
  const backup = spawnSync(process.execPath, ['scripts/backup-db-wsl.js'], { cwd: BACKEND_DIR, stdio: 'inherit', windowsHide: true });
  if (backup.status !== 0) fail('Cadangan Neon gagal dibuat.');
  const backupsDir = path.join(BACKEND_DIR, 'backups');
  const dump = fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.dump'))
    .map(f => ({ f, t: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  const wslDump = spawnSync('wsl.exe', ['-d', DISTRO, '--exec', 'wslpath', '-a', path.join(backupsDir, dump.f)], { encoding: 'utf8', windowsHide: true }).stdout.trim();

  log(`Memulihkan ${dump.f} ke database lokal "${DATABASE}"...`);
  const script = [
    'set -e',
    `su postgres -c "dropdb -p ${PG_PORT} --if-exists --force ${DATABASE}"`,
    `su postgres -c "createdb -p ${PG_PORT} -O gtm ${DATABASE}"`,
    // Objek khusus Neon yang tidak ada di PostgreSQL lokal dilewati (pesan peringatan pg_restore diabaikan)
    `su postgres -c "pg_restore -p ${PG_PORT} --no-owner --no-acl --role=gtm -d ${DATABASE} '$1'" 2>/dev/null || true`,
    `su postgres -c "psql -p ${PG_PORT} -d ${DATABASE} -tAc 'select count(*) from \\"Odp\\"'"`
  ].join('\n');
  const run = spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'root', '--', 'bash', '-s', wslDump], { input: script, encoding: 'utf8', windowsHide: true });
  const odpCount = Number(`${run.stdout || ''}`.replace(/\0/g, '').trim().split('\n').pop());
  if (run.status !== 0 || !odpCount) fail(`Pemulihan database gagal:\n${`${run.stderr || ''}${run.stdout || ''}`.replace(/\0/g, '')}`);
  log(`Database salinan siap: ${odpCount} ODP.`);
}

// ─── 3. File uji ───
async function writeFixtures() {
  const xlsx = require('xlsx');
  const { PrismaClient } = require('@prisma/client');
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // Excel ODP = seluruh data salinan saat ini, 3 ODP pertama port terpakainya +1
  // → import menghasilkan "3 diperbarui, 0 baru, 0 dibersihkan" (data salinan tetap utuh)
  const prisma = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } });
  const odps = await prisma.$queryRawUnsafe(`
    SELECT b.name AS branch, p.name AS project, p.wok, p."typeDesign", o.odp, o.total, o.used, o.avai, o.lat, o.lon, o."occStatus"
    FROM "Odp" o JOIN "Project" p ON p.id = o."projectId" JOIN "Branch" b ON b.id = p."branchId"
    ORDER BY b.name, p.name, o.odp`);
  await prisma.$disconnect();
  let changed = 0;
  const rows = odps.map(o => {
    let { used, avai } = o;
    if (changed < 3 && used < o.total) { used += 1; avai -= 1; changed++; }
    return [o.branch, o.project, o.wok, o.typeDesign, o.odp, o.total, used, avai, o.lat, o.lon, o.occStatus];
  });
  const odpBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(odpBook, xlsx.utils.aoa_to_sheet([
    ['DATA ODP — FILE UJI POSTMAN'],
    ['TELKOMSEL BRANCH', 'PROJECT', 'WOK', 'TYPE DESIGN', 'ODP NAME', 'TOTAL', 'USED', 'AVAI', 'LATITUDE', 'LONGITUDE', 'OCC 2'],
    ...rows
  ]), 'ODP');
  xlsx.writeFile(odpBook, path.join(FIXTURES_DIR, 'odp-uji.xlsx'));

  // Excel Tsel One Pairing contoh (3 baris, nomor fiktif)
  const pairingBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(pairingBook, xlsx.utils.json_to_sheet([
    { bb_id: '131900000001', order_id: 'ORD-POSTMAN-0001', msisdn_parent: '6281200000001', msisdn_child1: '6281200000011', product_commercial_name: 'Paket Uji 1', city: 'SEMARANG', region: 'JATENG DIY', area: 'AREA 3', cluster: 'SEMARANG', sto: 'SMT' },
    { bb_id: '131900000002', order_id: 'ORD-POSTMAN-0002', msisdn_parent: '6281200000002', msisdn_child1: '', product_commercial_name: 'Paket Uji 2', city: 'MAGELANG', region: 'JATENG DIY', area: 'AREA 3', cluster: 'MAGELANG', sto: 'MGL' },
    { bb_id: '131900000003', order_id: 'ORD-POSTMAN-0003', msisdn_parent: '6281200000003', msisdn_child1: '', product_commercial_name: 'Paket Uji 3', city: 'SOLO', region: 'JATENG DIY', area: 'AREA 3', cluster: 'SURAKARTA', sto: 'SLO' }
  ]), 'Unstacked_Pairing_Data');
  xlsx.writeFile(pairingBook, path.join(FIXTURES_DIR, 'pairing-uji.xlsx'));

  fs.copyFileSync(path.join(BACKEND_DIR, 'tests/fixtures/ocr-sample.png'), path.join(FIXTURES_DIR, 'foto-uji.png'));
  fs.writeFileSync(path.join(FIXTURES_DIR, 'salah-format.txt'), 'Bukan file Excel — dipakai untuk uji penolakan tipe file.\n');
  log(`File uji dibuat di ${path.relative(ROOT_DIR, FIXTURES_DIR)} (odp-uji.xlsx: ${rows.length} baris, ${changed} ODP diubah).`);
}

// ─── 4. Server API + worker ───
function startApp(name, entry) {
  const env = {
    ...process.env,
    PORT: String(PORT),
    DATABASE_URL: POOLED_URL,
    DIRECT_URL,
    QUEUE_PREFIX,
    COOKIE_SECURE: 'false'
  };
  const proc = spawn(process.execPath, [entry], { cwd: BACKEND_DIR, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const forward = (stream) => (data) => data.toString().split(/\r?\n/).filter(Boolean).forEach(line => stream.write(`[${name}] ${line}\n`));
  proc.stdout.on('data', forward(process.stdout));
  proc.stderr.on('data', forward(process.stderr));
  proc.on('exit', (code) => { if (!stopping) { console.error(`❌ [${name}] berhenti (kode ${code}).`); shutdown(1); } });
  children.push(proc);
  return proc;
}

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill());
  startedInfra.reverse().forEach(svc => {
    spawnSync(process.execPath, [svc.script, '--stop'], { cwd: BACKEND_DIR, stdio: 'ignore', timeout: 20000, windowsHide: true });
    svc.proc.kill();
  });
  log('Server pengujian dimatikan.');
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  if (await isPortOpen(PORT)) fail(`Port ${PORT} sudah dipakai. Matikan proses lain atau atur POSTMAN_PORT.`);
  await startInfra();
  if (!REUSE) restoreDatabase();
  await writeFixtures();
  startApp('API', 'server.js');
  startApp('WORKER', 'worker.js');
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) break;
    } catch { /* belum siap */ }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`
✅ Server pengujian Postman siap: http://localhost:${PORT}
   Database : salinan Neon di PostgreSQL lokal (${DATABASE}) — perubahan selama pengujian tidak menyentuh Neon
   Antrean  : Redis berawalan "${QUEUE_PREFIX}" (terpisah dari antrean asli)
   File uji : postman/fixtures/
   Tekan Ctrl+C untuk mematikan.
`);
})().catch(err => { console.error(err); shutdown(1); });
