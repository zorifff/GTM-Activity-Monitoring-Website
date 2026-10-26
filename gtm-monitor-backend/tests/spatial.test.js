// Uji Fase 4 lewat HTTP (server uji + database dari .env): endpoint query spasial ODP & metrik performa
// dari materialized view. Hanya membaca data — tidak ada data bisnis yang diubah.
const path = require('path');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const BASE = `http://localhost:${process.env.TEST_PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };

const haversine = (a, b) => {
  const R = 6371008.8, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

(async () => {
  for (const url of ['/api/odps/nearby?lat=-7&lon=110', '/api/odps/within?minLat=-8&minLon=110&maxLat=-7&maxLon=111', '/api/performance']) {
    const res = await fetch(BASE + url);
    check(`Tanpa login ${url.split('?')[0]} → 401`, res.status === 401);
  }

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })
  });
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const get = async (url) => {
    const res = await fetch(BASE + url, { headers: { Cookie: cookie } });
    return { status: res.status, body: await res.json() };
  };

  // Validasi parameter
  const invalid = [
    ['/api/odps/nearby?lon=110.4', 'lat wajib diisi'],
    ['/api/odps/nearby?lat=-7&lon=110&radius=60000', 'radius maksimal'],
    ['/api/odps/nearby?lat=abc&lon=110', 'lat wajib diisi dengan angka'],
    ['/api/odps/within?minLat=-7&minLon=110&maxLat=-8&maxLon=111', 'minLat harus lebih kecil'],
    ['/api/odps/within?minLat=-8&minLon=110&maxLat=-7&maxLon=111&limit=0', 'limit minimal 1']
  ];
  for (const [url, message] of invalid) {
    const res = await get(url);
    check(`Parameter tidak valid ditolak 400: ${message}`, res.status === 400 && res.body.code === 'VALIDATION_ERROR' && res.body.message.includes(message), res.body.message);
  }

  const data = (await get('/api/data')).body;
  const allOdps = data.flatMap(b => b.projects.flatMap(p => p.odps.map(o => ({ ...o, project: p.name, branch: b.name }))));
  const center = allOdps.find(o => typeof o.lat === 'number');

  // Radius: setiap ODP dalam radius dari /api/data harus muncul, urut dari yang terdekat
  const radius = 3000;
  const nearby = await get(`/api/odps/nearby?lat=${center.lat}&lon=${center.lon}&radius=${radius}&limit=2000`);
  const expected = allOdps.filter(o => haversine(center, o) <= radius * 0.99).map(o => o.odp);
  const got = new Set(nearby.body.odps.map(o => o.odp));
  check('Radius: ODP pusat ditemukan dengan jarak 0 m', nearby.status === 200 && nearby.body.odps[0].odp === center.odp && nearby.body.odps[0].distanceM === 0,
    `${nearby.body.count} ODP dalam ${radius} m dari ${center.odp}`);
  check('Radius: semua ODP dalam radius (haversine) ikut terambil & tidak ada yang di luar radius',
    expected.every(name => got.has(name)) && nearby.body.odps.every(o => o.distanceM <= radius),
    `${expected.length} ODP diharapkan`);
  check('Radius: urut dari yang terdekat', nearby.body.odps.every((o, i, arr) => i === 0 || arr[i - 1].distanceM <= o.distanceM));
  const sample = nearby.body.odps.find(o => o.odp === center.odp);
  check('Radius: data ODP sama dengan /api/data (port, status, proyek, branch)',
    sample.used === center.used && sample.total === center.total && sample.occStatus === center.occStatus && sample.project === center.project && sample.branch === center.branch);

  // Bounding box
  const box = { minLat: center.lat - 0.02, maxLat: center.lat + 0.02, minLon: center.lon - 0.02, maxLon: center.lon + 0.02 };
  const within = await get(`/api/odps/within?minLat=${box.minLat}&minLon=${box.minLon}&maxLat=${box.maxLat}&maxLon=${box.maxLon}&limit=2000`);
  const inBox = allOdps.filter(o => o.lat >= box.minLat && o.lat <= box.maxLat && o.lon >= box.minLon && o.lon <= box.maxLon).map(o => o.odp).sort();
  check('Bounding box: hasil = ODP /api/data di dalam kotak', within.status === 200 && JSON.stringify(within.body.odps.map(o => o.odp).sort()) === JSON.stringify(inBox),
    `${within.body.count} ODP`);
  const limited = await get(`/api/odps/within?minLat=-9&minLon=108&maxLat=-6&maxLon=112&limit=5`);
  check('Batas jumlah hasil (limit) & penanda truncated', limited.body.count === 5 && limited.body.truncated === true);

  // Metrik performa (materialized view) = hitungan dari /api/data
  const perf = await get('/api/performance');
  const sum = (key) => allOdps.reduce((s, o) => s + o[key], 0);
  check('Performa regional = total port & ODP dari /api/data',
    perf.status === 200 && perf.body.region.odpCount === allOdps.length && perf.body.region.used === sum('used') && perf.body.region.total === sum('total') && perf.body.region.avai === sum('avai'),
    `${perf.body.region.odpCount} ODP, OCC ${(perf.body.region.occRate * 100).toFixed(1)}%`);
  const branchOk = data.every(b => {
    const row = perf.body.branches.find(r => r.branchName === b.name);
    const odps = b.projects.flatMap(p => p.odps);
    const n = (s) => odps.filter(o => o.occStatus === s).length;
    return row && row.projectCount === b.projects.length && row.odpCount === odps.length &&
      row.priorityProjectCount === b.projects.filter(p => p.isPriority).length &&
      row.greenOdpCount === n('GREEN') && row.yellowOdpCount === n('YELLOW') && row.orangeOdpCount === n('ORANGE') &&
      row.redOdpCount === n('RED') && row.blackOdpCount === n('BLACK') &&
      row.reportedOccRate === b.occRate && row.reportedGapWoW === b.gapWoW;
  });
  check('Performa per branch = /api/data (proyek, prioritas, ODP per status, angka resmi Excel)', branchOk && perf.body.branches.length === data.length,
    `${perf.body.branches.length} branch`);
  check('Waktu refresh materialized view tercantum', !Number.isNaN(Date.parse(perf.body.region.refreshedAt)), perf.body.region.refreshedAt);

  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
