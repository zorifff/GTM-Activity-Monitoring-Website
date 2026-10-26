// Redis & object storage (WSL) untuk uji E2E: dinyalakan bila belum berjalan, dimatikan lagi setelah uji.
// Memakai launcher yang sama dengan npm run dev (gtm-monitor-backend/scripts/*-wsl.js).
import net from 'net';
import path from 'path';
import fs from 'fs';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gtm-monitor-backend');
const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.infra-started.json');

const SERVICES = [
  { name: 'Redis', script: 'scripts/redis-wsl.js', port: 6379 },
  { name: 'Object storage (Garage)', script: 'scripts/storage-wsl.js', port: 3900 }
];

const isPortOpen = (port) => new Promise(resolve => {
  const socket = net.connect(port, '127.0.0.1');
  const done = (open) => { socket.destroy(); resolve(open); };
  socket.setTimeout(1500, () => done(false));
  socket.once('connect', () => done(true));
  socket.once('error', () => done(false));
});

export async function startInfra() {
  const started = [];
  for (const svc of SERVICES) {
    if (await isPortOpen(svc.port)) continue;
    console.log(`▶️  ${svc.name} belum berjalan — dinyalakan sementara untuk uji E2E...`);
    const proc = spawn(process.execPath, [svc.script], { cwd: backendDir, stdio: 'ignore', detached: false, windowsHide: true });
    started.push({ ...svc, pid: proc.pid });
    for (let i = 0; i < 60 && !(await isPortOpen(svc.port)); i++) await new Promise(r => setTimeout(r, 500));
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(started));
}

export function stopInfra() {
  if (!fs.existsSync(STATE_FILE)) return;
  const started = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  for (const svc of started) {
    spawnSync(process.execPath, [svc.script, '--stop'], { cwd: backendDir, stdio: 'ignore', timeout: 20000, windowsHide: true });
    try { process.kill(svc.pid); } catch { /* sudah berhenti */ }
    console.log(`⏹️  ${svc.name} yang dinyalakan untuk uji E2E telah dimatikan.`);
  }
  fs.rmSync(STATE_FILE, { force: true });
}
