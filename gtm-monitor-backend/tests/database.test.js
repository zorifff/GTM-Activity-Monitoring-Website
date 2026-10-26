// Uji Fase 4: restrukturisasi basis data & optimasi spasial.
//   • Migrasi Prisma dari database kosong + skema sinkron + PostGIS (GEOMETRY(Point, 4326), indeks GiST, lat/lon turunan)
//   • Import Excel ODP transaksional (ACID): gagal di setiap tahap / data tidak valid / proses mati → tidak ada perubahan;
//     selama import berjalan, pembaca lain tidak melihat data setengah jalan
//   • Materialized view metrik branch & regional = hitungan langsung dari tabel, ikut ter-refresh di dalam transaksi
//   • Query radius & bounding box memakai indeks GiST (juga pada 50.000 titik)
//   • Connection pooling: PgBouncer mode transaction membatasi koneksi ke server saat beban puncak
//   • Refresh terjadwal lewat BullMQ Job Scheduler
// Berjalan di database UJI lokal (TEST_DATABASE_URL / TEST_DIRECT_URL — PostgreSQL + PostGIS di WSL di belakang PgBouncer),
// yang DI-RESET setiap kali suite ini dijalankan. Neon tidak tersentuh.
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };
const finish = () => { console.log(`\nHasil: ${pass} lulus, ${fail} gagal`); process.exitCode = fail ? 1 : 0; };

// ─── Pengaman: hanya database uji lokal ───
const { TEST_DATABASE_URL, TEST_DIRECT_URL } = process.env;
if (!TEST_DATABASE_URL || !TEST_DIRECT_URL) {
  check('Database uji tersedia (TEST_DATABASE_URL & TEST_DIRECT_URL di .env)', false, 'jalankan sekali: node gtm-monitor-backend/scripts/setup-postgres-wsl.js');
  finish();
  return;
}
const isLocalTestDb = (raw) => { const u = new URL(raw); return ['127.0.0.1', 'localhost'].includes(u.hostname) && /test/.test(u.pathname); };
if (!isLocalTestDb(TEST_DATABASE_URL) || !isLocalTestDb(TEST_DIRECT_URL)) {
  console.error('TEST_DATABASE_URL / TEST_DIRECT_URL harus menunjuk database lokal bernama *test*. Dibatalkan: suite ini me-reset database.');
  process.exit(1);
}
if (!process.env.QUEUE_PREFIX || process.env.QUEUE_PREFIX === 'gtm') {
  console.error('QUEUE_PREFIX uji belum diatur (jalankan lewat npm test). Dibatalkan agar antrean asli tidak tersentuh.');
  process.exit(1);
}
// Seluruh kode aplikasi di proses ini memakai database uji (env.js tidak menimpa variabel yang sudah di-set)
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DIRECT_URL;

const xlsx = require(path.join(backendDir, 'node_modules/xlsx'));
const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const { buildDatasourceUrl } = require(path.join(backendDir, 'src/config/database'));
const { getOdpCoords } = require(path.join(backendDir, 'src/utils/geo'));

const prismaCli = (...args) => spawnSync(process.execPath, [path.join(backendDir, 'node_modules/prisma/build/index.js'), ...args], {
  cwd: backendDir, env: process.env, encoding: 'utf8', timeout: 180000
});

// ─── Excel uji ───
const HEADER = ['TELKOMSEL BRANCH', 'PROJECT', 'WOK', 'TYPE DESIGN', 'ODP NAME', 'TOTAL', 'USED', 'AVAI', 'LATITUDE', 'LONGITUDE', 'OCC 2', 'OCC BRANCH', 'GAP WOW'];
const excel = (rows) => {
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['DATA ODP UJI'], HEADER, ...rows.map(r => HEADER.map(h => r[h] ?? ''))]), 'ODP');
  return { buffer: xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }), originalname: 'uji.xlsx' };
};
const SMG = { lat: -7.0051, lon: 110.4381 };
const YGY = { lat: -7.7956, lon: 110.3695 };
const move = (p, northM, eastM) => ({ lat: p.lat + northM / 110574, lon: p.lon + eastM / (111320 * Math.cos(p.lat * Math.PI / 180)) });
const odpRow = (branch, project, wok, type, odp, total, used, point, extra = {}) => ({
  'TELKOMSEL BRANCH': branch, PROJECT: project, WOK: wok, 'TYPE DESIGN': type, 'ODP NAME': odp,
  TOTAL: total, USED: used, AVAI: total - used, LATITUDE: point ? point.lat : '', LONGITUDE: point ? point.lon : '', ...extra
});
const summaryRow = (occ, gap, total, used) => ({ 'TELKOMSEL BRANCH': 'JATENG DIY', TOTAL: total, USED: used, AVAI: total - used, 'OCC BRANCH': occ, 'GAP WOW': gap });

const V1 = [
  odpRow('SEMARANG', 'UJI SMG A', 'SEMARANG', 'Greenfield', 'SMG-A-1', 16, 4, SMG, { 'OCC BRANCH': 0.25, 'GAP WOW': 0.01 }),
  odpRow('SEMARANG', 'UJI SMG A', 'SEMARANG', 'Greenfield', 'SMG-A-2', 16, 4, move(SMG, 300, 0)),
  odpRow('SEMARANG', 'UJI SMG A', 'SEMARANG', 'Greenfield', 'SMG-A-3', 8, 2, move(SMG, 0, 800)),
  odpRow('SEMARANG', 'UJI SMG B', 'DEMAK', 'Brownfield', 'SMG-B-1', 8, 3, move(SMG, -1500, 0)),
  odpRow('SEMARANG', 'UJI SMG B', 'DEMAK', 'Brownfield', 'SMG-B-2', 8, 0, move(SMG, 0, -5000)),
  odpRow('SEMARANG', 'UJI SMG C', 'SEMARANG', 'Greenfield', 'SMG-C-1', 8, 1, null), // tanpa koordinat → sintetis
  odpRow('YOGYAKARTA', 'UJI YGY A', 'YOGYAKARTA', 'Greenfield', 'YGY-A-1', 8, 7, YGY),
  odpRow('YOGYAKARTA', 'UJI YGY A', 'YOGYAKARTA', 'Greenfield', 'YGY-A-2', 8, 5, { lat: YGY.lat + 0.004, lon: YGY.lon }),
  odpRow('YOGYAKARTA', 'UJI YGY B', 'YOGYAKARTA', 'Greenfield', 'YGY-B-1', 16, 2, { lat: YGY.lat, lon: YGY.lon + 0.02 }, { 'OCC 2': 'ORANGE' }),
  summaryRow(0.2, 0.005, 96, 28)
];
// v2: ODP berubah (port & koordinat), ODP & proyek hilang, proyek & branch baru, warna & angka resmi berubah
const V2 = [
  odpRow('SEMARANG', 'UJI SMG A', 'SEMARANG', 'Greenfield', 'SMG-A-1', 16, 4, SMG, { 'OCC BRANCH': 0.3 }),
  odpRow('SEMARANG', 'UJI SMG A', 'SEMARANG', 'Greenfield', 'SMG-A-2', 16, 10, move(SMG, 400, 0)),
  odpRow('SEMARANG', 'UJI SMG B', 'DEMAK', 'Brownfield', 'SMG-B-1', 8, 3, move(SMG, -1500, 0)),
  odpRow('SEMARANG', 'UJI SMG B', 'DEMAK', 'Brownfield', 'SMG-B-2', 8, 0, move(SMG, 0, -5000)),
  odpRow('SEMARANG', 'UJI SMG D', 'KUDUS', 'Greenfield', 'SMG-D-1', 8, 2, move(SMG, 2000, 2000)),
  odpRow('SEMARANG', 'UJI SMG D', 'KUDUS', 'Greenfield', 'SMG-D-2', 8, 6, move(SMG, 2100, 2000)),
  odpRow('YOGYAKARTA', 'UJI YGY A', 'YOGYAKARTA', 'Greenfield', 'YGY-A-1', 8, 7, YGY, { 'GAP WOW': -0.002 }),
  odpRow('YOGYAKARTA', 'UJI YGY A', 'YOGYAKARTA', 'Greenfield', 'YGY-A-2', 8, 5, { lat: YGY.lat + 0.004, lon: YGY.lon }),
  odpRow('YOGYAKARTA', 'UJI YGY B', 'YOGYAKARTA', 'Greenfield', 'YGY-B-1', 16, 2, { lat: YGY.lat, lon: YGY.lon + 0.02 }, { 'OCC 2': 'RED' }),
  odpRow('BRANCHUJI', 'UJI BRANCH BARU', 'WOK UJI', 'Greenfield', 'BRU-1', 8, 1, { lat: -7.3, lon: 110.0 }),
  summaryRow(0.22, 0.007, 104, 40)
];
// v2 dengan nilai port di luar batas INTEGER → database menolak di tengah transaksi (setelah proyek baru tersimpan)
const V2_INVALID = [...V2.slice(0, -1), odpRow('SEMARANG', 'UJI SMG D', 'KUDUS', 'Greenfield', 'SMG-D-9', 3000000000, 1, SMG), V2[V2.length - 1]];

const haversine = (a, b) => {
  const R = 6371008.8, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  // ─── 1. MIGRASI ───
  console.log('— Migrasi & skema —');
  const reset = prismaCli('migrate', 'reset', '--force', '--skip-generate', '--skip-seed');
  check('prisma migrate reset: seluruh migrasi berjalan dari database kosong', reset.status === 0,
    reset.status === 0 ? '0_init + postgis_reported_metrics_performance_views' : (reset.stderr || reset.stdout).slice(-400));
  const status = prismaCli('migrate', 'status');
  check('prisma migrate status: up to date', status.status === 0 && /up to date/i.test(status.stdout));
  const diff = prismaCli('migrate', 'diff', '--from-url', TEST_DIRECT_URL, '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code');
  check('schema.prisma identik dengan hasil migrasi (tanpa drift)', diff.status === 0, diff.status === 0 ? '' : diff.stdout.slice(0, 300));

  const direct = new PrismaClient({ datasources: { db: { url: TEST_DIRECT_URL } } }); // pengamat di luar transaksi import
  const q = (sql, ...params) => direct.$queryRawUnsafe(sql, ...params);

  const [geomCol] = await q(`SELECT type, srid, (SELECT extversion FROM pg_extension WHERE extname = 'postgis') AS postgis
    FROM geometry_columns WHERE f_table_name = 'Odp' AND f_geometry_column = 'location'`);
  check('Odp.location bertipe GEOMETRY(Point, 4326)', geomCol?.type === 'POINT' && geomCol?.srid === 4326, `PostGIS ${geomCol?.postgis}`);
  const [gist] = await q(`SELECT indexdef FROM pg_indexes WHERE tablename = 'Odp' AND indexname = 'Odp_location_idx'`);
  check('Indeks spasial GiST pada Odp.location', /USING gist \(location\)/i.test(gist?.indexdef || ''));
  const generated = await q(`SELECT column_name, is_generated, generation_expression FROM information_schema.columns
    WHERE table_name = 'Odp' AND column_name IN ('lat', 'lon') ORDER BY column_name`);
  check('lat/lon = generated column turunan location (ST_Y / ST_X)',
    generated.length === 2 && generated.every(c => c.is_generated === 'ALWAYS') && /st_y/i.test(generated[0].generation_expression));
  const dropped = await q(`SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name = 'Branch' AND column_name IN ('occRate', 'gapWoW'))
       OR (table_name = 'ImportMeta' AND column_name IN ('occRate', 'available', 'used', 'total', 'gapWoW'))`);
  check('Kolom ringkasan statis dihapus dari Branch & ImportMeta', dropped.length === 0);
  const views = await q(`SELECT m.matviewname, i.indexdef FROM pg_matviews m JOIN pg_indexes i ON i.tablename = m.matviewname ORDER BY 1`);
  check('Materialized view BranchPerformance & RegionalPerformance + indeks unik (syarat REFRESH CONCURRENTLY)',
    views.length === 2 && views.every(v => /UNIQUE/.test(v.indexdef)), views.map(v => v.matviewname).join(', '));
  const badScope = await q(`INSERT INTO "ReportedMetric" ("scope", "updatedAt") VALUES ('branch:999', now())`).then(() => null, e => e.message);
  check('ReportedMetric: scope tidak konsisten ditolak CHECK constraint', /ReportedMetric_scope_check/.test(badScope || ''));

  // Modul aplikasi dimuat setelah migrasi (Prisma Client memakai TEST_DATABASE_URL lewat PgBouncer)
  const { importOdpExcel } = require(path.join(backendDir, 'src/services/odpImport.service'));
  const dataService = require(path.join(backendDir, 'src/services/data.service'));
  const odpGeo = require(path.join(backendDir, 'src/services/odpGeo.service'));
  const prisma = require(path.join(backendDir, 'src/lib/prisma'));
  const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };
  const runImport = (rows, onProgress) => quiet(() => importOdpExcel({ file: excel(rows), onProgress }));

  // Sidik jari seluruh data yang disentuh import (termasuk isi & waktu refresh materialized view)
  const fingerprint = async () => {
    const parts = await Promise.all([
      `SELECT * FROM "Branch" ORDER BY id`,
      `SELECT * FROM "Project" ORDER BY id`,
      `SELECT id, odp, avai, used, total, "occStatus", "projectId", ST_AsText(location) AS location FROM "Odp" ORDER BY id`,
      `SELECT id, type, status, "projectId" FROM "ProjectActivity" ORDER BY id`,
      `SELECT * FROM "ReportedMetric" ORDER BY id`,
      `SELECT * FROM "ImportMeta" ORDER BY id`,
      `SELECT * FROM "BranchPerformance" ORDER BY "branchId"`,
      `SELECT * FROM "RegionalPerformance"`
    ].map(sql => q(sql)));
    return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex');
  };
  const count = async (table) => Number((await q(`SELECT count(*)::int AS n FROM "${table}"`))[0].n);

  // Materialized view harus sama dengan agregasi langsung dari tabel
  const assertViewsMatchLive = async (label) => {
    const live = await q(`SELECT b.id AS "branchId", count(DISTINCT p.id)::int AS "projectCount", count(o.id)::int AS "odpCount",
        coalesce(sum(o.used), 0)::int AS used, coalesce(sum(o.avai), 0)::int AS avai, coalesce(sum(o.total), 0)::int AS total
      FROM "Branch" b LEFT JOIN "Project" p ON p."branchId" = b.id LEFT JOIN "Odp" o ON o."projectId" = p.id
      GROUP BY b.id ORDER BY b.id`);
    const mv = await q(`SELECT "branchId", "projectCount", "odpCount", used, avai, total FROM "BranchPerformance" ORDER BY "branchId"`);
    const [region] = await q(`SELECT "odpCount", used, total FROM "RegionalPerformance"`);
    const totals = live.reduce((s, r) => ({ odpCount: s.odpCount + r.odpCount, used: s.used + r.used, total: s.total + r.total }), { odpCount: 0, used: 0, total: 0 });
    check(`${label}: materialized view = agregasi langsung (branch & regional)`,
      JSON.stringify(live) === JSON.stringify(mv) && JSON.stringify(totals) === JSON.stringify(region), `${mv.length} branch, ${region.odpCount} ODP`);
  };

  // ─── 2. IMPORT AWAL ───
  console.log('\n— Import Excel transaksional —');
  const stages = [];
  const result1 = await runImport(V1, (stage) => { if (stages[stages.length - 1] !== stage) stages.push(stage); });
  check('Import v1 berhasil', result1.success && result1.stats.odpsCreated === 9 && result1.stats.wokBranchCorrections === 0,
    `${result1.stats.odpsCreated} ODP, ${result1.stats.projectsCreated} proyek`);
  check('Refresh materialized view adalah tahap terakhir di dalam transaksi import', stages[stages.length - 1] === 'Memperbarui ringkasan performa');
  const coords = await q(`SELECT odp, ST_X(location) AS x, ST_Y(location) AS y, lat, lon FROM "Odp" ORDER BY odp`);
  const byName = Object.fromEntries(coords.map(c => [c.odp, c]));
  const expectedA2 = move(SMG, 300, 0);
  check('Koordinat Excel tersimpan sebagai titik geometri (x = lon, y = lat) tanpa pembulatan',
    byName['SMG-A-2'].y === expectedA2.lat && byName['SMG-A-2'].x === expectedA2.lon);
  check('lat/lon turunan identik dengan geometri', coords.every(c => c.lat === c.y && c.lon === c.x));
  const synthetic = getOdpCoords('SMG-C-1', 'SEMARANG', null, null);
  check('ODP tanpa koordinat → koordinat sintetis stabil (sama seperti sebelumnya)', byName['SMG-C-1'].lat === synthetic.lat && byName['SMG-C-1'].lon === synthetic.lon);
  const reported = await q(`SELECT scope, "occRate", "gapWoW", available, used, total FROM "ReportedMetric" ORDER BY scope`);
  check('Angka resmi Excel tersimpan sekali di ReportedMetric (branch & region)',
    reported.length === 2 && reported[0].occRate === 0.25 && reported[0].gapWoW === 0.01 && reported[1].scope === 'region' && reported[1].total === 96,
    reported.map(r => r.scope).join(', '));
  await assertViewsMatchLive('Setelah import v1');
  const apiData = await dataService.getDashboardData();
  const smg = apiData.find(b => b.name === 'SEMARANG');
  const meta = await dataService.getImportMeta();
  check('/api/data: occRate & gapWoW branch dari materialized view (bentuk respons tetap)',
    smg.occRate === 0.25 && smg.gapWoW === 0.01 && apiData.find(b => b.name === 'YOGYAKARTA').occRate === null);
  check('/api/import-meta: bentuk & urutan field sama seperti sebelum normalisasi',
    JSON.stringify(Object.keys(meta)) === JSON.stringify(['id', 'key', 'occRate', 'available', 'used', 'total', 'gapWoW', 'updatedAt']) && meta.occRate === 0.2 && meta.used === 28);
  const statusCounts = await q(`SELECT "branchName", "greenOdpCount", "yellowOdpCount", "orangeOdpCount", "redOdpCount", "blackOdpCount", "priorityProjectCount" FROM "BranchPerformance"`);
  const statusMatches = apiData.every(b => {
    const mv = statusCounts.find(r => r.branchName === b.name);
    const all = b.projects.flatMap(p => p.odps);
    const n = (s) => all.filter(o => o.occStatus === s).length;
    return mv.greenOdpCount === n('GREEN') && mv.yellowOdpCount === n('YELLOW') && mv.orangeOdpCount === n('ORANGE') &&
      mv.redOdpCount === n('RED') && mv.blackOdpCount === n('BLACK') && mv.priorityProjectCount === b.projects.filter(p => p.isPriority).length;
  });
  check('Jumlah ODP per status & proyek prioritas di materialized view = aturan /api/data', statusMatches,
    statusCounts.map(r => `${r.branchName}: G${r.greenOdpCount} Y${r.yellowOdpCount} O${r.orangeOdpCount} R${r.redOdpCount} B${r.blackOdpCount}`).join(' | '));

  // Kegiatan pada proyek yang akan tetap ada & proyek yang akan hilang di v2
  const projects = Object.fromEntries((await q(`SELECT id, name FROM "Project"`)).map(p => [p.name, p.id]));
  await q(`INSERT INTO "ProjectActivity" (id, type, status, "projectId", "updatedAt") VALUES ($1, 'tsel_menyapa', 'verified', $2, now()), ($3, 'bumdes', 'upload', $4, now())`,
    crypto.randomUUID(), projects['UJI SMG A'], crypto.randomUUID(), projects['UJI SMG C']);

  // ─── 3. KEGAGALAN DI SETIAP TAHAP → ROLLBACK TOTAL ───
  const before = await fingerprint();
  const failingStages = ['Memuat data database', 'Memproses baris Excel', 'Menyimpan proyek baru', 'Menyimpan ODP baru', 'Memperbarui ODP',
    'Membersihkan ODP lama', 'Menyimpan OCC & GAP WoW branch', 'Menyimpan ringkasan Jateng DIY', 'Memperbarui ringkasan performa'];
  for (const failAt of failingStages) {
    const error = await runImport(V2, (stage) => { if (stage === failAt) throw new Error(`Kegagalan uji di tahap "${failAt}"`); })
      .then(() => null, e => e);
    const unchanged = (await fingerprint()) === before;
    check(`Gagal di tahap "${failAt}" → seluruh perubahan dibatalkan`, error && /Kegagalan uji/.test(error.message) && unchanged);
  }
  const invalid = await runImport(V2_INVALID).then(() => null, e => e);
  check('Nilai di luar batas INTEGER ditolak database di tengah import → tidak ada data parsial',
    invalid && (await fingerprint()) === before, invalid ? invalid.message.split('\n').filter(Boolean).pop().slice(0, 90) : 'import tidak gagal');

  // Proses import mati mendadak (kill) setelah semua ODP ditulis/dihapus, sebelum COMMIT
  const crashScript = `
    process.env.DATABASE_URL = ${JSON.stringify(TEST_DATABASE_URL)};
    process.env.DIRECT_URL = ${JSON.stringify(TEST_DIRECT_URL)};
    console.log = () => {};
    const { importOdpExcel } = require(${JSON.stringify(path.join(backendDir, 'src/services/odpImport.service'))});
    importOdpExcel({ file: { buffer: Buffer.from(${JSON.stringify(excel(V2).buffer.toString('base64'))}, 'base64') },
      onProgress: (stage) => { if (stage === 'Menyimpan OCC & GAP WoW branch') process.kill(process.pid, 'SIGKILL'); } });`;
  const crash = spawnSync(process.execPath, ['-e', crashScript], { cwd: backendDir, encoding: 'utf8', timeout: 60000 });
  let idleInTx = 1;
  for (let i = 0; i < 20 && idleInTx > 0; i++) {
    await sleep(250);
    idleInTx = Number((await q(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND state LIKE 'idle in transaction%'`))[0].n);
  }
  check('Proses import dimatikan paksa sebelum COMMIT → database otomatis rollback, tidak ada transaksi menggantung',
    crash.status !== 0 && idleInTx === 0 && (await fingerprint()) === before, `exit ${crash.status ?? crash.signal}`);

  // ─── 4. ISOLASI: pembaca lain tidak melihat data setengah jalan ───
  const readerScript = `
    const { PrismaClient } = require(${JSON.stringify(path.join(backendDir, 'node_modules/@prisma/client'))});
    const p = new PrismaClient({ datasources: { db: { url: ${JSON.stringify(TEST_DIRECT_URL)} } } });
    p.$queryRawUnsafe('SELECT (SELECT count(*) FROM "Odp")::int AS odps, (SELECT count(*) FROM "Project" WHERE name = \\'UJI SMG D\\')::int AS "newProject", (SELECT used FROM "Odp" WHERE odp = \\'SMG-A-2\\') AS "a2used"')
      .then(r => { process.stdout.write(JSON.stringify(r[0])); return p.$disconnect(); });`;
  let duringImport = null;
  const result2 = await runImport(V2, (stage) => {
    // Dijalankan sinkron di tengah transaksi (ODP baru/berubah/dihapus sudah ditulis, belum COMMIT)
    if (stage === 'Menyimpan OCC & GAP WoW branch' && !duringImport) {
      duringImport = JSON.parse(spawnSync(process.execPath, ['-e', readerScript], { cwd: backendDir, encoding: 'utf8', timeout: 30000 }).stdout);
    }
  });
  check('Selama import berjalan, koneksi lain hanya melihat data lama (tidak ada data setengah jalan)',
    duringImport && duringImport.odps === 9 && duringImport.newProject === 0 && duringImport.a2used === 4, JSON.stringify(duringImport));

  // ─── 5. IMPORT v2 BERHASIL ───
  const odps = Object.fromEntries((await q(`SELECT o.odp, o.used, o."occStatus", o.lat, o.lon, p.name AS project FROM "Odp" o JOIN "Project" p ON p.id = o."projectId"`)).map(o => [o.odp, o]));
  const movedA2 = move(SMG, 400, 0);
  // Aturan lama dipertahankan: ODP hanya diperbarui bila port/proyeknya berubah (warna/koordinat saja tidak memicu update)
  check('Import v2 berhasil: ODP diperbarui (port + koordinat), ditambah & dibersihkan; aturan update lama tetap',
    result2.success && odps['SMG-A-2'].used === 10 && odps['SMG-A-2'].lat === movedA2.lat && odps['YGY-B-1'].occStatus === 'ORANGE' &&
    odps['SMG-D-2'] && !odps['SMG-A-3'] && !odps['SMG-C-1'] && odps['BRU-1'],
    `${result2.stats.odpsCreated} baru, ${result2.stats.odpsUpdated} diperbarui, ${result2.stats.odpsRemoved} dibersihkan`);
  const activities = await q(`SELECT a.type, p.name FROM "ProjectActivity" a JOIN "Project" p ON p.id = a."projectId"`);
  check('Proyek kosong dihapus beserta kegiatannya; kegiatan proyek lain tetap (perilaku sama seperti sebelumnya)',
    activities.length === 1 && activities[0].name === 'UJI SMG A' && (await count('Project')) === 6);
  const reported2 = Object.fromEntries((await q(`SELECT coalesce(b.name, 'REGION') AS scope, r."occRate", r."gapWoW", r.total FROM "ReportedMetric" r LEFT JOIN "Branch" b ON b.id = r."branchId"`)).map(r => [r.scope, r]));
  check('Angka resmi diperbarui (nilai yang tidak ada di Excel baru dipertahankan)',
    reported2.SEMARANG.occRate === 0.3 && reported2.SEMARANG.gapWoW === 0.01 && reported2.YOGYAKARTA.gapWoW === -0.002 && reported2.REGION.total === 104);
  await assertViewsMatchLive('Setelah import v2');

  // ─── 6. QUERY SPASIAL ───
  console.log('\n— Query spasial (PostGIS) —');
  const all = await q(`SELECT odp, lat, lon FROM "Odp"`);
  const nearby = await odpGeo.findOdpsNearby({ lat: SMG.lat, lon: SMG.lon, radiusMeters: 1000 });
  const expectedNear = all.filter(o => haversine(SMG, o) <= 1000).map(o => o.odp).sort();
  const ambiguous = all.filter(o => Math.abs(haversine(SMG, o) - 1000) < 10);
  check('Radius 1 km: hasil = perhitungan haversine, urut dari yang terdekat',
    ambiguous.length === 0 && JSON.stringify(nearby.odps.map(o => o.odp).sort()) === JSON.stringify(expectedNear) &&
    nearby.odps.every((o, i, arr) => i === 0 || arr[i - 1].distanceM <= o.distanceM), nearby.odps.map(o => `${o.odp} ${o.distanceM} m`).join(', '));
  const maxDeviation = Math.max(...nearby.odps.map(o => Math.abs(o.distanceM - haversine(SMG, o)) / Math.max(haversine(SMG, o), 1)));
  // Bumi bukan bola sempurna: jarak sferoid WGS84 (PostGIS geography) berbeda hingga ±0,6% dari haversine (bola)
  check('Jarak (geografi sferoid WGS84) selisih < 1% dari haversine', maxDeviation < 0.01, `${(maxDeviation * 100).toFixed(3)}%`);
  const box = { minLat: YGY.lat - 0.01, maxLat: YGY.lat + 0.01, minLon: YGY.lon - 0.01, maxLon: YGY.lon + 0.01 };
  const within = await odpGeo.findOdpsInBounds(box);
  const expectedBox = all.filter(o => o.lat >= box.minLat && o.lat <= box.maxLat && o.lon >= box.minLon && o.lon <= box.maxLon).map(o => o.odp).sort();
  check('Bounding box: hanya ODP di dalam kotak', JSON.stringify(within.odps.map(o => o.odp).sort()) === JSON.stringify(expectedBox), expectedBox.join(', '));

  // Skala besar: 50.000 titik acak di Jawa Tengah → planner memilih indeks GiST tanpa dipaksa
  const scaleProject = (await q(`SELECT id FROM "Project" WHERE name = 'UJI SMG A'`))[0].id;
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const bulk = Array.from({ length: 50000 }, (_, i) => ({ odp: `SKALA-${i}`, avai: 8, used: 0, total: 8, occStatus: 'GREEN', projectId: scaleProject, lat: -8.2 + rnd() * 1.8, lon: 108.7 + rnd() * 2.9 }));
  const tInsert = Date.now();
  await odpGeo.insertOdps(prisma, bulk);
  const insertMs = Date.now() - tInsert;
  await q(`ANALYZE "Odp"`);
  const planText = async (sql) => (await q(`EXPLAIN (ANALYZE, FORMAT TEXT) ${sql}`)).map(r => r['QUERY PLAN']).join('\n');
  const radiusPlan = await planText(`SELECT id FROM "Odp" o WHERE o.location && ST_Expand(ST_SetSRID(ST_MakePoint(110.4381, -7.0051), 4326), 0.0091, 0.0091)
    AND ST_DWithin(o.location::geography, ST_SetSRID(ST_MakePoint(110.4381, -7.0051), 4326)::geography, 1000)`);
  const bboxPlan = await planText(`SELECT id FROM "Odp" WHERE location && ST_MakeEnvelope(110.36, -7.80, 110.38, -7.79, 4326)`);
  const execMs = (plan) => Number(/Execution Time: ([\d.]+)/.exec(plan)?.[1]);
  check('50.000 ODP: query radius memakai indeks GiST (tanpa dipaksa)', /Odp_location_idx/.test(radiusPlan), `${execMs(radiusPlan)} ms, insert massal ${insertMs} ms`);
  check('50.000 ODP: query bounding box memakai indeks GiST (tanpa dipaksa)', /Odp_location_idx/.test(bboxPlan), `${execMs(bboxPlan)} ms`);
  const seqPlan = await direct.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL enable_indexscan = off');
    await tx.$executeRawUnsafe('SET LOCAL enable_bitmapscan = off');
    return (await tx.$queryRawUnsafe(`EXPLAIN (ANALYZE, FORMAT TEXT) SELECT id FROM "Odp" o WHERE o.location && ST_Expand(ST_SetSRID(ST_MakePoint(110.4381, -7.0051), 4326), 0.0091, 0.0091)
      AND ST_DWithin(o.location::geography, ST_SetSRID(ST_MakePoint(110.4381, -7.0051), 4326)::geography, 1000)`)).map(r => r['QUERY PLAN']).join('\n');
  });
  console.log(`   ℹ️  Pembanding tanpa indeks (Seq Scan): ${execMs(seqPlan)} ms vs dengan GiST ${execMs(radiusPlan)} ms`);

  // ─── 7. CONNECTION POOLING ───
  console.log('\n— Connection pooling —');
  const pooled = buildDatasourceUrl('postgresql://u:p@ep-x-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require', { connectionLimit: 7, poolTimeoutSec: 15 });
  const pooledParams = Object.fromEntries(new URL(pooled.url).searchParams);
  check('Host Neon "-pooler" → pgbouncer=true, connection_limit & pool_timeout ditambahkan',
    pooled.pooled && pooledParams.pgbouncer === 'true' && pooledParams.connection_limit === '7' && pooledParams.pool_timeout === '15' && pooledParams.sslmode === 'require');
  const custom = buildDatasourceUrl('postgresql://u:p@ep-x-pooler.neon.tech/db?connection_limit=3');
  check('Parameter yang sudah ada di URL tidak ditimpa', new URL(custom.url).searchParams.get('connection_limit') === '3');
  check('Host langsung (tanpa pooler) terdeteksi → peringatan saat server menyala', buildDatasourceUrl('postgresql://u:p@ep-x.neon.tech/db').pooled === false);

  // Lonjakan: 3 proses × 10 koneksi Prisma = 30 koneksi klien, 90 query serentak → PgBouncer hanya membuka ≤ 10 koneksi server
  const clients = [1, 2, 3].map(() => new PrismaClient({ datasources: { db: { url: buildDatasourceUrl(TEST_DATABASE_URL, { connectionLimit: 10 }).url } } }));
  let peak = 0, sampling = true;
  const sampler = (async () => {
    while (sampling) {
      const [row] = await q(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND query LIKE '%pg_sleep(0.2)%' AND state = 'active' AND pid <> pg_backend_pid()`);
      peak = Math.max(peak, Number(row.n));
      await sleep(40);
    }
  })();
  const tLoad = Date.now();
  const loadResults = await Promise.allSettled(Array.from({ length: 90 }, (_, i) => clients[i % 3].$queryRawUnsafe('SELECT 1 AS ok FROM pg_sleep(0.2)')));
  const loadMs = Date.now() - tLoad;
  sampling = false;
  await sampler;
  check('90 query serentak lewat pooler semuanya berhasil', loadResults.every(r => r.status === 'fulfilled'), `${loadMs} ms`);
  check('Koneksi aktif ke server tertahan di batas pool PgBouncer (≤ 10), bukan 30', peak > 0 && peak <= 10, `puncak ${peak} koneksi server`);
  const txOverPooler = await prisma.$transaction(async (tx) => (await tx.$queryRawUnsafe('SELECT txid_current()::text AS a'))[0].a === (await tx.$queryRawUnsafe('SELECT txid_current()::text AS a'))[0].a);
  check('Transaksi interaktif lewat PgBouncer mode transaction tetap pada satu koneksi server', txOverPooler);
  await Promise.all(clients.map(c => c.$disconnect()));

  // ─── 8. REFRESH TERJADWAL (BullMQ Job Scheduler) ───
  console.log('\n— Refresh terjadwal —');
  const { Queue, Worker } = require(path.join(backendDir, 'node_modules/bullmq'));
  const { createRedisConnection } = require(path.join(backendDir, 'src/lib/redis'));
  const { MAINTENANCE_QUEUE } = require(path.join(backendDir, 'src/queues'));
  const { schedulePerformanceRefresh, processMaintenanceJob, PERFORMANCE_REFRESH_JOB } = require(path.join(backendDir, 'src/workers/maintenance'));
  const queueConnection = createRedisConnection({ label: 'Redis uji' });
  const workerConnection = createRedisConnection({ label: 'Redis uji worker', blocking: true });
  // Koneksi sisi API tidak mengantrekan perintah saat belum tersambung → tunggu status "ready" lebih dulu
  const redisUp = queueConnection.status === 'ready' ||
    await Promise.race([new Promise(resolve => queueConnection.once('ready', () => resolve(true))), sleep(10000).then(() => false)]);
  if (!redisUp) {
    check('Redis aktif untuk uji refresh terjadwal', false, 'jalankan lewat npm test (Redis dinyalakan otomatis)');
    queueConnection.disconnect(); workerConnection.disconnect();
    await prisma.$disconnect(); await direct.$disconnect();
    return finish();
  }
  const queue = new Queue(MAINTENANCE_QUEUE, { connection: queueConnection, prefix: process.env.QUEUE_PREFIX });
  await queue.obliterate({ force: true }).catch(() => {});
  const [beforeRefresh] = await q(`SELECT "refreshedAt", "odpCount" FROM "RegionalPerformance"`);
  const completed = new Promise((resolve, reject) => {
    const worker = new Worker(MAINTENANCE_QUEUE, processMaintenanceJob, { connection: workerConnection, prefix: process.env.QUEUE_PREFIX });
    worker.on('completed', (job, value) => worker.close().then(() => resolve(value)));
    worker.on('failed', (job, err) => worker.close().then(() => reject(err)));
  });
  await schedulePerformanceRefresh(queue, 60);
  const scheduler = await queue.getJobScheduler(PERFORMANCE_REFRESH_JOB);
  check('Job scheduler refresh terdaftar di Redis (tiap 60 menit)', scheduler && Number(scheduler.every) === 60 * 60 * 1000);
  const refreshResult = await Promise.race([completed, sleep(20000).then(() => null)]);
  const [afterRefresh] = await q(`SELECT "refreshedAt", "odpCount" FROM "RegionalPerformance"`);
  check('Job refresh dijalankan worker: materialized view ter-refresh (data 50.000 ODP baru ikut terhitung)',
    refreshResult && afterRefresh.refreshedAt > beforeRefresh.refreshedAt && afterRefresh.odpCount === beforeRefresh.odpCount + 50000,
    refreshResult ? `${refreshResult.refreshedInMs} ms` : 'tidak selesai dalam 20 detik');
  await queue.obliterate({ force: true }).catch(() => {});
  await queue.close();
  await queueConnection.quit();
  await workerConnection.quit().catch(() => {});

  await prisma.$disconnect();
  await direct.$disconnect();
  finish();
})().catch(e => { console.error(e); process.exit(1); });
