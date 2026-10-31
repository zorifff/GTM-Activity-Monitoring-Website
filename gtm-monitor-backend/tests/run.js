// Test runner regresi backend: npm test
// Menyalakan server uji di port acak, menjalankan seluruh suite, mematikan server, lalu mencabut sesi uji.
// Opsi: --record-snapshots  → rekam ulang acuan snapshot (tests/.snapshots/)
//       --only=<nama>       → jalankan satu suite saja, mis. --only=validation
// Catatan: suite memakai database dari .env & akun admin (ADMIN_USERNAME/ADMIN_PASSWORD). Tidak ada data bisnis yang diubah;
// sesi login yang dibuat selama uji dicabut di akhir. Suite queue & storage butuh Redis & object storage (Garage):
// bila belum berjalan, keduanya dinyalakan otomatis lalu dimatikan lagi setelah uji (yang sudah berjalan tidak diganggu).
// Suite database (migrasi, import transaksional, PostGIS, materialized view, pooling) menulis data, jadi berjalan di
// database UJI lokal (TEST_DATABASE_URL: PostgreSQL + PostGIS di WSL di belakang PgBouncer), bukan di Neon.
const path = require('path');
const net = require('net');
const { spawn, spawnSync } = require('child_process');

const backendDir = path.resolve(__dirname, '..');
// Antrean uji memakai awalan key Redis sendiri → antrean asli (awalan "gtm") tidak tersentuh
process.env.QUEUE_PREFIX = 'gtm-test';
const args = process.argv.slice(2);
const RECORD = args.includes('--record-snapshots');
const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];

// Urutan & server: suite rate-limit menghabiskan kuota login, jadi dijalankan di server tersendiri
const SUITES = [
  { name: 'snapshot', file: 'snapshot.test.js', server: 'main' },
  { name: 'auth-dual-token', file: 'auth-dual-token.test.js', server: 'main' },
  { name: 'auth-session', file: 'auth-session.test.js', server: 'main' },
  { name: 'validation', file: 'validation.test.js', server: 'main' },
  { name: 'errors', file: 'errors.test.js', server: 'main' },
  { name: 'queue', file: 'queue.test.js', server: 'main' },
  { name: 'storage', file: 'storage.test.js', server: 'main' },
  { name: 'pairing', file: 'pairing.test.js', server: 'main' },
  { name: 'spatial', file: 'spatial.test.js', server: 'main' },
  { name: 'security-ratelimit', file: 'security-ratelimit.test.js', server: 'isolated' },
  { name: 'database', file: 'database.test.js', server: 'none' },
  { name: 'turnstile', file: 'turnstile.test.js', server: 'none' }
].filter(s => (RECORD ? s.name === 'snapshot' : !only || s.name === only))
  .filter(s => require('fs').existsSync(path.join(__dirname, s.file)));

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  srv.on('error', reject);
});

const startServer = async () => {
  const port = await freePort();
  // Suite memanggil API langsung (tanpa widget captcha) → Turnstile dimatikan di server uji; diuji terpisah di turnstile.test.js
  const proc = spawn(process.execPath, ['server.js'], { cwd: backendDir, env: { ...process.env, PORT: String(port), TURNSTILE_SECRET_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  proc.stdout.on('data', d => { log += d; });
  proc.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) return { port, proc, getLog: () => log };
    } catch { /* belum siap */ }
    await new Promise(r => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error(`Server uji gagal menyala:\n${log}`);
};

const runSuite = (suite, port) => new Promise(resolve => {
  const proc = spawn(process.execPath, [path.join(__dirname, suite.file)], {
    cwd: backendDir,
    env: { ...process.env, TEST_PORT: port ? String(port) : '', RECORD_SNAPSHOTS: RECORD ? '1' : '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let out = '';
  proc.stdout.on('data', d => { out += d; process.stdout.write(d); });
  proc.stderr.on('data', d => { out += d; process.stderr.write(d); });
  proc.on('close', code => {
    const m = /Hasil: (\d+) lulus, (\d+) gagal/.exec(out);
    resolve({ name: suite.name, code, pass: m ? Number(m[1]) : 0, fail: m ? Number(m[2]) : (code === 0 ? 0 : 1) });
  });
});

const isPortOpen = (port) => new Promise(resolve => {
  const socket = net.connect(port, '127.0.0.1');
  const done = (open) => { socket.destroy(); resolve(open); };
  socket.setTimeout(1500, () => done(false));
  socket.once('connect', () => done(true));
  socket.once('error', () => done(false));
});

// Layanan pendukung di WSL (launcher yang sama dengan npm run dev)
const INFRA = [
  { name: 'Redis', script: 'scripts/redis-wsl.js', url: () => process.env.REDIS_URL || 'redis://127.0.0.1:6379', defaultPort: 6379 },
  { name: 'Object storage (Garage)', script: 'scripts/storage-wsl.js', url: () => process.env.S3_ENDPOINT || 'http://127.0.0.1:3900', defaultPort: 3900 },
  // Database uji (belum disiapkan = dilewati; suite database melaporkan cara menyiapkannya)
  { name: 'PostgreSQL uji (WSL)', script: 'scripts/postgres-wsl.js', url: () => process.env.TEST_DATABASE_URL, defaultPort: 6433 }
];

const startInfra = async () => {
  const started = [];
  for (const svc of INFRA) {
    if (!svc.url()) continue;
    const { hostname, port } = new URL(svc.url());
    if (!['127.0.0.1', 'localhost'].includes(hostname)) continue; // layanan eksternal (mis. R2) tidak dikelola di sini
    const servicePort = Number(port || svc.defaultPort);
    if (await isPortOpen(servicePort)) continue;
    console.log(`▶️  ${svc.name} belum berjalan — dinyalakan sementara untuk pengujian...`);
    const proc = spawn(process.execPath, [svc.script], { cwd: backendDir, stdio: 'ignore', windowsHide: true });
    started.push({ ...svc, proc });
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      await new Promise(r => setTimeout(r, 500));
      up = await isPortOpen(servicePort);
    }
    if (!up) console.log(`⚠️  ${svc.name} gagal dinyalakan dalam 30 detik — suite yang membutuhkannya akan gagal.`);
  }
  return started;
};

// Hanya layanan yang dinyalakan oleh test runner ini yang dimatikan
const stopInfra = (started) => started.forEach(svc => {
  spawnSync(process.execPath, [svc.script, '--stop'], { cwd: backendDir, stdio: 'ignore', timeout: 20000, windowsHide: true });
  svc.proc.kill();
  console.log(`⏹️  ${svc.name} yang dinyalakan untuk pengujian telah dimatikan.`);
});

const revokeTestSessions = async () => {
  const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
  const prisma = new PrismaClient();
  try {
    await prisma.authSession.updateMany({ where: { userAgent: 'node', revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'logout' } });
  } finally {
    await prisma.$disconnect();
  }
};

(async () => {
  process.loadEnvFile(path.join(backendDir, '.env'));
  const infra = RECORD ? [] : await startInfra();
  const results = [];
  for (const group of ['main', 'isolated', 'none']) {
    const suites = SUITES.filter(s => s.server === group);
    if (suites.length === 0) continue;
    if (group === 'none') {
      for (const suite of suites) {
        console.log(`
━━━ ${suite.name} (tanpa server HTTP) ━━━`);
        results.push(await runSuite(suite, null));
      }
      continue;
    }
    const server = await startServer();
    try {
      for (const suite of suites) {
        console.log(`\n━━━ ${suite.name} (port ${server.port}) ━━━`);
        results.push(await runSuite(suite, server.port));
      }
    } finally {
      server.proc.kill();
    }
    const unexpected = server.getLog().split('\n').filter(l => /Unhandled Server Error|TypeError|ReferenceError/.test(l));
    if (unexpected.length) console.log(`\n⚠️  Error tak terduga di log server (${group}):\n${unexpected.slice(0, 5).join('\n')}`);
  }
  await revokeTestSessions().catch(e => console.error('Gagal mencabut sesi uji:', e.message));
  stopInfra(infra);

  console.log('\n━━━ RINGKASAN ━━━');
  results.forEach(r => console.log(`${r.fail === 0 && r.code === 0 ? '✅' : '❌'} ${r.name.padEnd(20)} ${r.pass} lulus, ${r.fail} gagal`));
  const totalPass = results.reduce((s, r) => s + r.pass, 0);
  const totalFail = results.reduce((s, r) => s + r.fail, 0);
  console.log(`TOTAL: ${totalPass} lulus, ${totalFail} gagal`);
  process.exit(totalFail || results.some(r => r.code !== 0) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
