// Uji snapshot: respons endpoint baca-saja harus identik sebelum & sesudah refaktor.
// Rekam acuan  : npm run test:record   (menyimpan ke tests/.snapshots/, di-gitignore karena berisi data bisnis)
// Bandingkan   : dijalankan otomatis oleh tests/run.js (npm test) bila acuan sudah ada.
// Saat merekam, sidik jari (hash) data sumber mentah (tabel DB & file) ikut disimpan. Bila data sumber berubah karena
// pemakaian web (upload/verifikasi/import), perbandingan tidak bermakna → ditandai ⚠️ "rekam ulang", bukan gagal.
// Gagal (❌) hanya bila data sumber SAMA tetapi respons BERBEDA = regresi kode.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const BASE = `http://localhost:${process.env.TEST_PORT}`;
const SNAPSHOT_DIR = path.join(__dirname, '.snapshots');
const FINGERPRINT_FILE = path.join(SNAPSHOT_DIR, '_sumber-data.json');
const RECORD = process.env.RECORD_SNAPSHOTS === '1';
let pass = 0, fail = 0, stale = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };

const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const paths = require(path.join(backendDir, 'src/config/paths'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashFiles = (...targets) => sha256(targets.flatMap(function list(p) {
  if (!fs.existsSync(p)) return [`${p}:-`];
  if (fs.statSync(p).isDirectory()) return fs.readdirSync(p).sort().flatMap(n => list(path.join(p, n)));
  return [`${path.relative(backendDir, p)}:${sha256(fs.readFileSync(p))}`];
}).join('\n'));

// Sidik jari data mentah per sumber (tidak melewati kode API yang sedang diuji)
const computeFingerprints = async () => {
  const prisma = new PrismaClient();
  const pairing = await readPairingIndex();
  try {
    const rows = async (model) => JSON.stringify(await model.findMany({ orderBy: { id: 'asc' } }));
    return {
      data: sha256([await rows(prisma.branch), await rows(prisma.project), await rows(prisma.odp), await rows(prisma.projectActivity), await rows(prisma.projectActivityPhoto)].join('\n')),
      importMeta: sha256(await rows(prisma.importMeta)),
      programs: hashFiles(paths.PROGRAMS_DIR, paths.DEFAULT_PROGRAM_EXCEL),
      pairing: sha256(pairing.version || '-')
    };
  } finally {
    await prisma.$disconnect();
  }
};
const SOURCE_OF = { data: 'data', 'import-meta': 'importMeta', programs: 'programs', 'programs-agustus': 'programs', 'pairing-search': 'pairing' };

// Indeks pairing kini di Redis (awalan QUEUE_PREFIX:pairing): versi aktif + kata kunci contoh (msisdn_parent)
// agar snapshot pencarian berisi hasil nyata. { version: null } bila indeks kosong / Redis tidak aktif.
async function readPairingIndex() {
  const Redis = require(path.join(backendDir, 'node_modules/ioredis'));
  const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: 1, lazyConnect: true });
  redis.on('error', () => {});
  const ns = `${process.env.QUEUE_PREFIX || 'gtm'}:pairing`;
  try {
    await redis.connect();
    const version = await redis.get(`${ns}:active`);
    if (!version) return { version: null, query: null };
    const [, fields] = await redis.hscan(`${ns}:v:${version}:records`, 0, 'COUNT', 200);
    const rec = fields.filter((_, i) => i % 2 === 1).map(v => JSON.parse(v)).find(r => r.msisdn_parent && String(r.msisdn_parent).length >= 6);
    return { version, query: rec ? String(rec.msisdn_parent) : null };
  } catch {
    return { version: null, query: null };
  } finally {
    redis.disconnect();
  }
}

(async () => {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })
  });
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');

  const pairingQuery = (await readPairingIndex()).query;
  const targets = [
    ['data', '/api/data'],
    ['import-meta', '/api/import-meta'],
    ['programs', '/api/programs'],
    ['programs-agustus', '/api/programs?month=Agustus%202026'],
    ...(pairingQuery ? [['pairing-search', `/api/pairing/search?q=${encodeURIComponent(pairingQuery)}`]] : [])
  ];

  if (!RECORD && !fs.existsSync(SNAPSHOT_DIR)) {
    console.log('⚠️  Belum ada snapshot acuan (jalankan: node tests/run.js --record-snapshots). Uji snapshot dilewati.');
  } else {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const fingerprints = await computeFingerprints();
    const recordedFingerprints = !RECORD && fs.existsSync(FINGERPRINT_FILE) ? JSON.parse(fs.readFileSync(FINGERPRINT_FILE, 'utf8')) : null;
    if (RECORD) fs.writeFileSync(FINGERPRINT_FILE, JSON.stringify(fingerprints, null, 2));
    for (const [name, url] of targets) {
      const res = await fetch(BASE + url, { headers: { Cookie: cookie } });
      const body = await res.json();
      // durationMs pencarian pairing berubah tiap request — bukan bagian kontrak API
      if (name === 'pairing-search') delete body.durationMs;
      const actual = JSON.stringify({ status: res.status, body });
      const file = path.join(SNAPSHOT_DIR, `${name}.json`);

      if (RECORD) {
        fs.writeFileSync(file, actual);
        check(`Snapshot direkam: ${url}`, res.status === 200, `${(actual.length / 1024).toFixed(1)} KB`);
      } else if (!fs.existsSync(file)) {
        check(`Snapshot acuan tersedia: ${url}`, false, 'file acuan tidak ada');
      } else {
        const expected = fs.readFileSync(file, 'utf8');
        const source = SOURCE_OF[name];
        const sourceChanged = recordedFingerprints && recordedFingerprints[source] !== fingerprints[source];
        if (actual !== expected && sourceChanged) {
          stale++;
          console.log(`⚠️  Dilewati: ${url} — data sumber (${source}) berubah sejak acuan direkam (pemakaian web), perbandingan tidak bermakna`);
        } else {
          check(`Respons identik dengan acuan: ${url}`, actual === expected,
            actual === expected ? `${(actual.length / 1024).toFixed(1)} KB` : (recordedFingerprints ? 'BERBEDA padahal data sumber sama → regresi kode' : 'BERBEDA (acuan lama tanpa sidik jari data; bila data memang berubah, jalankan npm run test:record)'));
        }
      }
    }
    if (!pairingQuery) console.log('ℹ️  Indeks pairing di Redis kosong — snapshot pencarian pairing dilewati.');
    if (stale) console.log(`\nℹ️  ${stale} acuan perlu direkam ulang agar snapshot kembali menguji: npm run test:record (folder gtm-monitor-backend)`);
  }

  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
