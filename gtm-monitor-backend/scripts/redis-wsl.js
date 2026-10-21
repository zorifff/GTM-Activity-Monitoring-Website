// Menjalankan Redis (antrean kerja BullMQ) di WSL Ubuntu sebagai proses foreground.
// Dipakai oleh npm run dev / npm run redis (root) & pm2 app "gtm-redis". Selama proses ini hidup, WSL tetap menyala.
// Bila Redis sudah berjalan di port yang sama, launcher hanya memantau (tidak menjalankan Redis kedua).
// --stop : mematikan Redis di WSL dengan rapi lalu keluar (dipakai tests/run.js).
//
// Instalasi sekali (PowerShell):
//   wsl -d Ubuntu -u root -- apt-get install -y redis-server
//   wsl -d Ubuntu -u root -- systemctl disable --now redis-server   (Redis cukup dijalankan oleh launcher ini)
const net = require('net');
const { spawn, spawnSync } = require('child_process');
const { REDIS_URL } = require('../src/config/env');

const DISTRO = process.env.REDIS_WSL_DISTRO || 'Ubuntu';
const CHECK_INTERVAL_MS = 10 * 1000;
const { hostname, port } = new URL(REDIS_URL);
const PORT = Number(port || 6379);
const IS_LOCAL = ['127.0.0.1', 'localhost', '[::1]'].includes(hostname);

// noeviction = syarat BullMQ (data job tidak boleh dibuang saat memori penuh); appendonly = job tetap ada setelah restart
const REDIS_ARGS = [
  '--port', String(PORT), '--bind', '127.0.0.1', '--protected-mode', 'yes', '--daemonize', 'no',
  '--appendonly', 'yes', '--maxmemory-policy', 'noeviction',
  // Port selain default memakai file data sendiri agar dua instance tidak pernah menulis AOF/RDB yang sama
  ...(PORT === 6379 ? [] : ['--appenddirname', `appendonlydir-${PORT}`, '--dbfilename', `dump-${PORT}.rdb`])
];
const COMMAND = process.platform === 'win32'
  ? ['wsl.exe', ['-d', DISTRO, '-u', 'redis', '--exec', 'redis-server', ...REDIS_ARGS, '--dir', '/var/lib/redis']]
  : ['redis-server', REDIS_ARGS];

const isPortOpen = () => new Promise(resolve => {
  const socket = net.connect(PORT, '127.0.0.1');
  const done = (open) => { socket.destroy(); resolve(open); };
  socket.setTimeout(1500, () => done(false));
  socket.once('connect', () => done(true));
  socket.once('error', () => done(false));
});

let child = null;
let stopping = false;

function startRedis() {
  // Rekomendasi Redis agar penyimpanan latar belakang (AOF/RDB) tidak gagal: vm.overcommit_memory=1 (kernel WSL)
  if (process.platform === 'win32') {
    spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'root', '--exec', 'sysctl', '-q', '-w', 'vm.overcommit_memory=1'], { timeout: 10000, windowsHide: true });
  }
  console.log(`🚀 [Redis] Menjalankan redis-server${process.platform === 'win32' ? ` di WSL (${DISTRO})` : ''} pada port ${PORT}...`);
  child = spawn(COMMAND[0], COMMAND[1], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  // Pesan wsl.exe sendiri berformat UTF-16 → karakter NUL dibuang
  const forward = (stream) => (data) => stream.write(data.toString().replace(/\0/g, ''));
  child.stdout.on('data', forward(process.stdout));
  child.stderr.on('data', forward(process.stderr));
  child.on('error', (err) => console.error(`❌ [Redis] Gagal menjalankan ${COMMAND[0]}: ${err.message}`));
  child.on('exit', (code) => {
    child = null;
    if (stopping) return;
    // 0 / 130 / 143 = dihentikan dengan sengaja (shutdown / SIGINT / SIGTERM), bukan crash
    if ([0, 130, 143].includes(code)) {
      console.log(`ℹ️  [Redis] redis-server dihentikan (kode ${code}).`);
      process.exit(0);
    }
    console.error(`❌ [Redis] redis-server berhenti (kode ${code}). Pastikan Redis terpasang di WSL: wsl -d ${DISTRO} -u root -- apt-get install -y redis-server`);
    process.exit(code || 1);
  });
}

// Matikan Redis dengan rapi (data antrean disimpan ke disk). Proses di WSL tidak ikut mati saat wsl.exe dihentikan.
const shutdownRedis = () => {
  if (process.platform === 'win32') {
    spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'redis', '--exec', 'redis-cli', '-p', String(PORT), 'shutdown'], { timeout: 10000, windowsHide: true });
  } else {
    spawnSync('redis-cli', ['-p', String(PORT), 'shutdown'], { timeout: 10000 });
  }
};

function stopRedis() {
  if (stopping) return;
  stopping = true;
  if (child) {
    shutdownRedis();
    child.kill();
  }
  process.exit(0);
}
process.on('SIGINT', stopRedis);
process.on('SIGTERM', stopRedis);

(async () => {
  if (process.argv.includes('--stop')) {
    shutdownRedis();
    console.log(`🛑 [Redis] Redis di port ${PORT} dimatikan.`);
    return;
  }
  if (!IS_LOCAL) {
    console.log(`ℹ️  [Redis] REDIS_URL menunjuk ke server lain (${hostname}); Redis lokal tidak dijalankan.`);
    setInterval(() => {}, 60 * 60 * 1000);
    return;
  }
  if (await isPortOpen()) {
    console.log(`ℹ️  [Redis] Redis sudah berjalan di port ${PORT}; launcher hanya memantau.`);
  } else {
    startRedis();
  }
  // Bila Redis yang dijalankan pihak lain berhenti, launcher mengambil alih
  setInterval(async () => {
    if (!child && !stopping && !(await isPortOpen())) startRedis();
  }, CHECK_INTERVAL_MS);
})();
