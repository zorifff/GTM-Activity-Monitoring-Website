// Cadangan penuh database (skema + data) memakai pg_dump di WSL Ubuntu (versi klien = versi server Neon, PostgreSQL 18).
//   node gtm-monitor-backend/scripts/backup-db-wsl.js            → cadangkan database dari DIRECT_URL (Neon)
//   node gtm-monitor-backend/scripts/backup-db-wsl.js --url=TEST_DIRECT_URL   → cadangkan database dari variabel .env lain
// Hasil: gtm-monitor-backend/backups/<database>-<waktu>.dump (format custom, di-gitignore karena berisi data bisnis).
// Pulihkan: pg_restore --clean --if-exists --no-owner --no-acl -d "<URL tujuan>" <file.dump>
// Wajib koneksi langsung (bukan host -pooler): pg_dump memakai fitur sesi yang tidak didukung PgBouncer mode transaction.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
require('../src/config/env');

const DISTRO = process.env.POSTGRES_WSL_DISTRO || 'Ubuntu';
const varName = (process.argv.find(a => a.startsWith('--url=')) || '--url=DIRECT_URL').split('=')[1];
const url = process.env[varName];
if (!url) {
  console.error(`❌ ${varName} belum diisi di .env`);
  process.exit(1);
}
const target = new URL(url);
// Port wajib eksplisit: tanpa port, pg_wrapper Ubuntu memakai port cluster uji lokal (5433), bukan 5432
if (!target.port) target.port = '5432';
if (target.hostname.includes('-pooler')) {
  console.error(`❌ ${varName} memakai host pooler; pg_dump butuh koneksi langsung (host tanpa "-pooler").`);
  process.exit(1);
}

const backupDir = path.resolve(__dirname, '..', 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const file = path.join(backupDir, `${target.pathname.slice(1)}-${stamp}.dump`);
const wslFile = spawnSync('wsl.exe', ['-d', DISTRO, '--exec', 'wslpath', '-a', file], { encoding: 'utf8', windowsHide: true }).stdout.trim();

console.log(`📦 Mencadangkan ${target.hostname}${target.pathname} → ${path.relative(process.cwd(), file)} ...`);
const started = Date.now();
const run = spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'root', '--exec', '/usr/bin/pg_dump', '--format=custom', '--no-owner', '--no-acl', `--file=${wslFile}`, target.toString()], {
  encoding: 'utf8',
  windowsHide: true,
  timeout: 10 * 60 * 1000
});
if (run.status !== 0 || !fs.existsSync(file)) {
  fs.rmSync(file, { force: true });
  console.error(`❌ pg_dump gagal:\n${`${run.stderr || ''}${run.stdout || ''}`.replace(/\0/g, '').trim()}`);
  console.error('   Pastikan klien PostgreSQL terpasang di WSL: node gtm-monitor-backend/scripts/setup-postgres-wsl.js');
  process.exit(1);
}
console.log(`✅ Cadangan selesai dalam ${((Date.now() - started) / 1000).toFixed(1)} detik (${(fs.statSync(file).size / 1024).toFixed(0)} KB): ${file}`);
