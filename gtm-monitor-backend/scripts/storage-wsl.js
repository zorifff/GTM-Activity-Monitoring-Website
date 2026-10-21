// Menjalankan object storage S3-compatible lokal (Garage) di WSL Ubuntu sebagai proses foreground.
// Dipakai oleh npm run dev / npm run storage (root) & pm2 app "gtm-storage". Setup sekali: scripts/setup-storage-wsl.js
// Bila Garage sudah berjalan di port yang sama, launcher hanya memantau (tidak menjalankan Garage kedua).
// Bila S3_ENDPOINT menunjuk ke layanan lain (Cloudflare R2 / AWS S3), launcher tidak menjalankan apa pun.
// --stop : mematikan Garage di WSL lalu keluar (dipakai tests/run.js).
const net = require('net');
const { spawn, spawnSync } = require('child_process');
const { S3_ENDPOINT } = require('../src/config/env');

const DISTRO = process.env.STORAGE_WSL_DISTRO || 'Ubuntu';
const CHECK_INTERVAL_MS = 10 * 1000;
const { hostname, port } = new URL(S3_ENDPOINT);
const PORT = Number(port || 3900);
const IS_LOCAL = ['127.0.0.1', 'localhost', '[::1]'].includes(hostname);
const GARAGE_ENV = 'GARAGE_CONFIG_FILE=/etc/garage.toml';

const isPortOpen = () => new Promise(resolve => {
  const socket = net.connect(PORT, '127.0.0.1');
  const done = (open) => { socket.destroy(); resolve(open); };
  socket.setTimeout(1500, () => done(false));
  socket.once('connect', () => done(true));
  socket.once('error', () => done(false));
});

let child = null;
let stopping = false;

function startGarage() {
  console.log(`🚀 [Storage] Menjalankan Garage (S3) di WSL (${DISTRO}) pada port ${PORT}...`);
  child = spawn('wsl.exe', ['-d', DISTRO, '-u', 'root', '--exec', 'env', GARAGE_ENV, 'garage', 'server'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  // Pesan wsl.exe sendiri berformat UTF-16 → karakter NUL dibuang
  const forward = (stream) => (data) => stream.write(data.toString().replace(/\0/g, ''));
  child.stdout.on('data', forward(process.stdout));
  child.stderr.on('data', forward(process.stderr));
  child.on('error', (err) => console.error(`❌ [Storage] Gagal menjalankan wsl.exe: ${err.message}`));
  child.on('exit', (code) => {
    child = null;
    if (stopping) return;
    console.error(`❌ [Storage] Garage berhenti (kode ${code}). Bila belum pernah disiapkan, jalankan: node gtm-monitor-backend/scripts/setup-storage-wsl.js`);
    process.exit(code || 1);
  });
}

// Proses di dalam WSL tidak ikut mati saat wsl.exe dihentikan → dimatikan langsung
const shutdownGarage = () => {
  spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'root', '--exec', 'pkill', '-INT', '-x', 'garage'], { timeout: 10000, windowsHide: true });
};

function stopGarage() {
  if (stopping) return;
  stopping = true;
  if (child) {
    shutdownGarage();
    child.kill();
  }
  process.exit(0);
}
process.on('SIGINT', stopGarage);
process.on('SIGTERM', stopGarage);

(async () => {
  if (process.argv.includes('--stop')) {
    shutdownGarage();
    console.log(`🛑 [Storage] Garage di port ${PORT} dimatikan.`);
    return;
  }
  if (!IS_LOCAL) {
    console.log(`ℹ️  [Storage] S3_ENDPOINT menunjuk ke layanan lain (${hostname}); Garage lokal tidak dijalankan.`);
    setInterval(() => {}, 60 * 60 * 1000);
    return;
  }
  if (await isPortOpen()) {
    console.log(`ℹ️  [Storage] Object storage sudah berjalan di port ${PORT}; launcher hanya memantau.`);
  } else {
    startGarage();
  }
  // Bila Garage yang dijalankan pihak lain berhenti, launcher mengambil alih
  setInterval(async () => {
    if (!child && !stopping && !(await isPortOpen())) startGarage();
  }, CHECK_INTERVAL_MS);
})();
