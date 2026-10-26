// Menjalankan database UJI lokal (PostgreSQL 18 + PostGIS, di belakang PgBouncer mode transaction) di WSL Ubuntu
// sebagai proses foreground. Hanya untuk test suite — aplikasi (npm run dev / pm2) tetap memakai Neon.
// Setup sekali: scripts/setup-postgres-wsl.js. Dinyalakan otomatis oleh tests/run.js bila belum berjalan.
// Bila PgBouncer sudah berjalan di port yang sama, launcher hanya memantau.
// --stop : mematikan PgBouncer & PostgreSQL uji di WSL lalu keluar (dipakai tests/run.js).
const net = require('net');
const { spawn, spawnSync } = require('child_process');
require('../src/config/env');

const DISTRO = process.env.POSTGRES_WSL_DISTRO || 'Ubuntu';
const PG_VERSION = '18';
const CHECK_INTERVAL_MS = 10 * 1000;

if (!process.env.TEST_DATABASE_URL || !process.env.TEST_DIRECT_URL) {
  console.error('❌ [DB uji] TEST_DATABASE_URL / TEST_DIRECT_URL belum ada di .env. Jalankan sekali: node gtm-monitor-backend/scripts/setup-postgres-wsl.js');
  process.exit(1);
}
const BOUNCER_PORT = Number(new URL(process.env.TEST_DATABASE_URL).port || 6433);
const PG_PORT = Number(new URL(process.env.TEST_DIRECT_URL).port || 5433);

const isPortOpen = (port) => new Promise(resolve => {
  const socket = net.connect(port, '127.0.0.1');
  const done = (open) => { socket.destroy(); resolve(open); };
  socket.setTimeout(1500, () => done(false));
  socket.once('connect', () => done(true));
  socket.once('error', () => done(false));
});

const wslRoot = (...args) => spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'root', '--exec', ...args], { timeout: 30000, windowsHide: true });
// --skip-systemctl-redirect: cluster dikelola launcher ini, bukan layanan systemd (yang sengaja dinonaktifkan)
const pgCluster = (action) => wslRoot('/usr/bin/pg_ctlcluster', '--skip-systemctl-redirect', PG_VERSION, 'main', action);

let child = null;
let stopping = false;

function startDatabase() {
  console.log(`🚀 [DB uji] Menjalankan PostgreSQL ${PG_VERSION} (port ${PG_PORT}) + PgBouncer (port ${BOUNCER_PORT}) di WSL (${DISTRO})...`);
  pgCluster('start'); // kode keluar bukan 0 bila sudah berjalan — tidak masalah
  child = spawn('wsl.exe', ['-d', DISTRO, '-u', 'root', '--exec', '/usr/sbin/runuser', '-u', 'postgres', '--', '/usr/sbin/pgbouncer', '/etc/pgbouncer/pgbouncer.ini'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  waitUntilReady();
  // Pesan wsl.exe sendiri berformat UTF-16 → karakter NUL dibuang
  const forward = (stream) => (data) => stream.write(data.toString().replace(/\0/g, ''));
  child.stdout.on('data', forward(process.stdout));
  child.stderr.on('data', forward(process.stderr));
  child.on('error', (err) => console.error(`❌ [DB uji] Gagal menjalankan wsl.exe: ${err.message}`));
  child.on('exit', (code) => {
    child = null;
    if (stopping) return;
    if ([0, 130, 143].includes(code)) {
      console.log(`ℹ️  [DB uji] PgBouncer dihentikan (kode ${code}).`);
      process.exit(0);
    }
    console.error(`❌ [DB uji] PgBouncer berhenti (kode ${code}). Bila belum pernah disiapkan, jalankan: node gtm-monitor-backend/scripts/setup-postgres-wsl.js`);
    process.exit(code || 1);
  });
}

// Proses di dalam WSL tidak ikut mati saat wsl.exe dihentikan → dimatikan langsung
const shutdownDatabase = () => {
  wslRoot('/usr/bin/pkill', '-INT', '-x', 'pgbouncer');
  pgCluster('stop');
};

async function waitUntilReady() {
  for (let i = 0; i < 60 && child; i++) {
    if (await isPortOpen(BOUNCER_PORT) && await isPortOpen(PG_PORT)) {
      console.log(`✅ [DB uji] Siap: PgBouncer 127.0.0.1:${BOUNCER_PORT} → PostgreSQL 127.0.0.1:${PG_PORT}`);
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

function stopDatabase() {
  if (stopping) return;
  stopping = true;
  if (child) {
    shutdownDatabase();
    child.kill();
  }
  process.exit(0);
}
process.on('SIGINT', stopDatabase);
process.on('SIGTERM', stopDatabase);

(async () => {
  if (process.argv.includes('--stop')) {
    shutdownDatabase();
    console.log(`🛑 [DB uji] PgBouncer & PostgreSQL uji dimatikan.`);
    return;
  }
  if (await isPortOpen(BOUNCER_PORT)) {
    console.log(`ℹ️  [DB uji] PgBouncer sudah berjalan di port ${BOUNCER_PORT}; launcher hanya memantau.`);
  } else {
    startDatabase();
  }
  setInterval(async () => {
    if (!child && !stopping && !(await isPortOpen(BOUNCER_PORT))) startDatabase();
  }, CHECK_INTERVAL_MS);
})();
