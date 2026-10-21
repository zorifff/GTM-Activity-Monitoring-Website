// Uji snapshot: respons endpoint baca-saja harus identik sebelum & sesudah refaktor.
// Rekam acuan  : node tests/run.js --record-snapshots   (menyimpan ke tests/.snapshots/, di-gitignore karena berisi data bisnis)
// Bandingkan   : dijalankan otomatis oleh tests/run.js (npm test) bila acuan sudah ada.
const path = require('path');
const fs = require('fs');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const BASE = `http://localhost:${process.env.TEST_PORT}`;
const SNAPSHOT_DIR = path.join(__dirname, '.snapshots');
const RECORD = process.env.RECORD_SNAPSHOTS === '1';
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };

// Kata kunci pencarian pairing diambil dari data pairing lokal (bila ada), agar snapshot berisi hasil nyata
const pickPairingQuery = () => {
  try {
    const records = JSON.parse(fs.readFileSync(path.join(backendDir, 'data/pairing/records.json'), 'utf8'));
    const rec = records.find(r => r.msisdn_parent && String(r.msisdn_parent).length >= 6);
    return rec ? String(rec.msisdn_parent) : null;
  } catch {
    return null;
  }
};

(async () => {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })
  });
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');

  const pairingQuery = pickPairingQuery();
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
        check(`Respons identik dengan acuan: ${url}`, actual === expected, actual === expected ? `${(actual.length / 1024).toFixed(1)} KB` : 'BERBEDA');
      }
    }
    if (!pairingQuery) console.log('ℹ️  Data pairing lokal tidak ada — snapshot pencarian pairing dilewati.');
  }

  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
