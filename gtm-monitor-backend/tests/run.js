// Test runner regresi backend: npm test
// Menyalakan server uji di port acak, menjalankan seluruh suite, mematikan server, lalu mencabut sesi uji.
// Opsi: --record-snapshots  → rekam ulang acuan snapshot (tests/.snapshots/)
//       --only=<nama>       → jalankan satu suite saja, mis. --only=validation
// Catatan: suite memakai database dari .env & akun admin (ADMIN_USERNAME/ADMIN_PASSWORD). Tidak ada data bisnis yang diubah;
// sesi login yang dibuat selama uji dicabut di akhir.
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const backendDir = path.resolve(__dirname, '..');
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
  { name: 'security-ratelimit', file: 'security-ratelimit.test.js', server: 'isolated' }
].filter(s => (RECORD ? s.name === 'snapshot' : !only || s.name === only))
  .filter(s => require('fs').existsSync(path.join(__dirname, s.file)));

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  srv.on('error', reject);
});

const startServer = async () => {
  const port = await freePort();
  const proc = spawn(process.execPath, ['server.js'], { cwd: backendDir, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    env: { ...process.env, TEST_PORT: String(port), RECORD_SNAPSHOTS: RECORD ? '1' : '' },
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
  const results = [];
  for (const group of ['main', 'isolated']) {
    const suites = SUITES.filter(s => s.server === group);
    if (suites.length === 0) continue;
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

  console.log('\n━━━ RINGKASAN ━━━');
  results.forEach(r => console.log(`${r.fail === 0 && r.code === 0 ? '✅' : '❌'} ${r.name.padEnd(20)} ${r.pass} lulus, ${r.fail} gagal`));
  const totalPass = results.reduce((s, r) => s + r.pass, 0);
  const totalFail = results.reduce((s, r) => s + r.fail, 0);
  console.log(`TOTAL: ${totalPass} lulus, ${totalFail} gagal`);
  process.exit(totalFail || results.some(r => r.code !== 0) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
