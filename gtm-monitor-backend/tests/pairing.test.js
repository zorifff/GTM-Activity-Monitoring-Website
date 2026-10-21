// Uji Fase 2 Task 4: indeks pencarian Tsel One Pairing di Redis (dipakai bersama semua instance server),
// import Excel lewat worker + progres SSE, file sumber di object storage, dan pembangunan ulang indeks.
// Dijalankan oleh tests/run.js (npm test) dengan QUEUE_PREFIX=gtm-test → indeks & antrean uji terpisah dari data asli.
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const BASE = `http://localhost:${process.env.TEST_PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (!process.env.QUEUE_PREFIX || process.env.QUEUE_PREFIX === 'gtm') {
  console.error('QUEUE_PREFIX uji belum diatur (jalankan lewat npm test). Dibatalkan agar indeks pairing asli tidak tersentuh.');
  process.exit(1);
}

const xlsx = require(path.join(backendDir, 'node_modules/xlsx'));
const queues = require(path.join(backendDir, 'src/queues'));
const storage = require(path.join(backendDir, 'src/lib/objectStorage'));
const { startWorkers } = require(path.join(backendDir, 'src/workers'));
const { createRedisConnection } = require(path.join(backendDir, 'src/lib/redis'));
const pairing = require(path.join(backendDir, 'src/services/pairing.service'));

// Excel sintetis berformat Tsel One Pairing (sebagian BB ID dipakai bersama, MSISDN 08… & 628…, tanggal serial Excel)
const makeExcel = (count, tag) => {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const parent = `6281${tag}${String(1000000 + i).padStart(7, '0')}`;
    rows.push({
      bb_id: i % 10 < 3 ? `BB${tag}-G${Math.floor(i / 10)}` : `BB${tag}-${i}`, // 3 baris per grup memakai BB ID yang sama
      msisdn_parent: i % 3 === 0 ? `08${parent.slice(3)}` : parent,
      msisdn_child1: i % 2 ? `6285${tag}${String(2000000 + i).padStart(7, '0')}` : '',
      product_commercial_name: `Paket ${i % 4}`,
      activation_date_ih: 45000 + (i % 200) + 0.5,
      city: ['SEMARANG', 'SOLO'][i % 2],
      'Order ID': `ORD${tag}${100000 + i}`
    });
  }
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), 'Unstacked_Pairing_Data');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
const emptyExcel = () => {
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([]), 'Sheet1');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

// Acuan = algoritma versi lama (Map di memori) dari fungsi murni yang sama
const referenceSearch = (buffer) => {
  const records = pairing.parsePairingWorkbook(buffer);
  const lookup = pairing.buildPairingLookup(records);
  const search = (q) => {
    const cleanQ = q.trim();
    if (cleanQ.length < 6) return [];
    const ids = lookup.get(cleanQ) || lookup.get(pairing.msisdnAlias(cleanQ));
    return ids ? ids.map(i => records[i]) : [];
  };
  return { records, lookup, search };
};

const parseSse = (block) => {
  let event = 'message'; const data = [];
  block.split('\n').forEach(l => { if (l.startsWith('event:')) event = l.slice(6).trim(); else if (l.startsWith('data:')) data.push(l.slice(5).trim()); });
  return data.length ? { event, data: JSON.parse(data.join('\n')) } : null;
};
const readSse = async (url, cookie, timeoutMs = 60000) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const res = await fetch(BASE + url, { headers: { Accept: 'text/event-stream', Cookie: cookie }, signal: ac.signal });
  const events = [];
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let i;
      while ((i = buffer.indexOf('\n\n')) >= 0) {
        const ev = parseSse(buffer.slice(0, i));
        buffer = buffer.slice(i + 2);
        if (ev) events.push(ev);
      }
    }
  } catch { /* timeout */ }
  clearTimeout(timer);
  return events;
};

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer();
  srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});

(async () => {
  const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const upload = (buffer, name = 'pairing-uji.xlsx') => {
    const form = new FormData();
    form.append('file', new Blob([buffer]), name);
    return fetch(`${BASE}/api/admin/upload-pairing-excel`, { method: 'POST', headers: { Cookie: cookie }, body: form });
  };
  // Pencarian pairing wajib login (sama seperti sebelumnya)
  const search = async (q, base = BASE) => (await fetch(`${base}/api/pairing/search?q=${encodeURIComponent(q)}`, { headers: { Cookie: cookie } })).json();

  queues.initQueues();
  const redis = queues.getApiConnection();
  for (let i = 0; i < 20 && redis.status !== 'ready'; i++) await sleep(250);
  const nsKeys = async () => redis.keys(`${pairing.NS}:*`);
  const clearIndex = async () => { const keys = await nsKeys(); if (keys.length) await redis.unlink(...keys); };
  // Sisa data uji dari run sebelumnya (bila sempat terhenti) dibersihkan dulu
  const clearSource = async () => {
    await storage.deleteObject(pairing.SOURCE_KEY);
    await storage.deleteObject(pairing.SOURCE_KEY.replace(/[^/]+$/, 'meta.json'));
  };
  await clearIndex();
  await clearSource();

  console.log('— 1. Tanpa worker & indeks kosong');
  let res = await upload(makeExcel(10, '1'));
  let body = await res.json();
  check('Upload saat worker tidak aktif → 503 + pesan jelas', res.status === 503 && body.code === 'WORKER_UNAVAILABLE', `${res.status} ${body.message}`);
  body = await search('081234567890');
  check('Indeks kosong → 200, 0 hasil (sama seperti saat belum ada data)', body.success === true && body.count === 0);

  console.log('\n— 2. Upload diproses worker + progres SSE');
  const runtime = startWorkers();
  check('Worker menyala: indeks kosong & belum ada file sumber → tidak ada yang dibangun', (await runtime.pairingReady) === 'empty');
  for (let i = 0; i < 40 && (await queues.getQueue(queues.QUEUE_NAMES.PAIRING_IMPORT).getWorkersCount()) === 0; i++) await sleep(250);
  const excelA = makeExcel(3000, '1');
  const refA = referenceSearch(excelA);
  res = await upload(excelA);
  body = await res.json();
  check('Upload → 202 + jobId (request tidak menunggu proses selesai)', res.status === 202 && body.code === 'IMPORT_QUEUED' && /^[0-9a-f-]{36}$/.test(body.jobId || ''), `${res.status}`);
  const events = await readSse(`/api/admin/upload-pairing-excel/${body.jobId}/events`, cookie);
  // Tahap yang sangat cepat dilebur (SSE selalu mengirim status terbaru), jadi yang diuji: progres ada & naik monoton
  const progress = events.filter(e => e.event === 'progress' && e.data.progress.stage).map(e => e.data.progress);
  const end = events[events.length - 1];
  check('Progres terkirim lewat SSE & persen naik monoton', progress.length > 0 && progress.every((p, i) => i === 0 || p.percent >= progress[i - 1].percent),
    progress.map(p => `${p.stage} ${p.percent}%`).join(' → '));
  check('Hasil akhir sama seperti respons versi lama', end && end.event === 'completed' && end.data.result.success === true &&
    end.data.result.message === 'Berhasil mengimpor Data Tsel One Pairing! (3.000 baris terproses)' && end.data.result.totalRows === 3000 && !!end.data.result.updatedAt,
    end && end.data.result && end.data.result.message);
  check('File Excel sumber tersimpan di object storage', await storage.objectExists(pairing.SOURCE_KEY));
  check('File sementara upload dihapus', (await storage.listObjects('tmp/pairing-import/')).length === 0);

  console.log('\n— 3. Pencarian dari Redis identik dengan algoritma lama');
  // Seluruh kunci + alias dibandingkan langsung ke service (tanpa HTTP, agar tidak terkena rate limit 300/menit)
  const allKeys = [...refA.lookup.keys()];
  const queriesA = [...allKeys, ...allKeys.filter(k => /^628/.test(k)).map(k => '08' + k.slice(3)), 'BB1-TIDAK-ADA', '  ORD1100007  ', '6289999999999'];
  let identical = 0;
  for (const q of queriesA) {
    if (JSON.stringify(await pairing.searchPairingData(q)) === JSON.stringify(refA.search(q))) identical++;
  }
  check(`${queriesA.length} kata kunci (BB ID, Order ID, MSISDN, alias 08/628, tidak ada) → hasil identik`, identical === queriesA.length, `${identical}/${queriesA.length}`);
  const sampleKeys = allKeys.filter((_, i) => i % 200 === 0);
  let httpIdentical = 0;
  for (const q of sampleKeys) {
    const r = await search(q);
    if (JSON.stringify(r.results) === JSON.stringify(refA.search(q)) && r.count === r.results.length) httpIdentical++;
  }
  check(`Lewat HTTP /api/pairing/search (${sampleKeys.length} sampel) → identik`, httpIdentical === sampleKeys.length, `${httpIdentical}/${sampleKeys.length}`);
  const group = await search('BB1-G0');
  check('BB ID bersama → beberapa hasil dengan urutan baris asli', group.count > 1 && JSON.stringify(group.results) === JSON.stringify(refA.search('BB1-G0')), `${group.count} hasil`);
  check('Bentuk respons tetap { success, query, count, durationMs, results }', JSON.stringify(Object.keys(group)) === JSON.stringify(['success', 'query', 'count', 'durationMs', 'results']));

  console.log('\n— 4. Instance server kedua membaca indeks yang sama');
  const port2 = await freePort();
  const server2 = spawn(process.execPath, ['server.js'], { cwd: backendDir, env: { ...process.env, PORT: String(port2) }, stdio: 'ignore' });
  const base2 = `http://localhost:${port2}`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${base2}/api/health`)).ok) break; } catch { /* belum siap */ } await sleep(500); }
  await sleep(1000); // koneksi Redis instance kedua
  const probe = sampleKeys[7];
  const fromSecond = await search(probe, base2);
  check('Instance lain (tanpa memuat data sendiri) → hasil identik', fromSecond.count > 0 && JSON.stringify(fromSecond.results) === JSON.stringify(refA.search(probe)), `${fromSecond.count} hasil dari port ${port2}`);

  console.log('\n— 5. File rusak tidak merusak indeks aktif');
  body = await (await upload(emptyExcel(), 'kosong.xlsx')).json();
  let ev = await readSse(`/api/admin/upload-pairing-excel/${body.jobId}/events`, cookie);
  let last = ev[ev.length - 1];
  check('Excel tanpa baris → gagal 400 dengan pesan lama', last.event === 'failed' && last.data.error.status === 400 && last.data.error.body.error === 'Gagal menguraikan file Excel pairing. Pastikan format tabel dan header sesuai.');
  check('Indeks lama tetap dipakai', (await search(probe)).count === refA.search(probe).length);

  console.log('\n— 6. Upload ulang mengganti indeks secara atomik');
  const excelB = makeExcel(800, '2');
  const refB = referenceSearch(excelB);
  body = await (await upload(excelB)).json();
  ev = await readSse(`/api/admin/upload-pairing-excel/${body.jobId}/events`, cookie);
  last = ev[ev.length - 1];
  check('Upload data baru selesai', last.event === 'completed' && last.data.result.totalRows === 800);
  const keyB = [...refB.lookup.keys()].filter(k => k.length >= 8)[10]; // kata kunci minimal 6 karakter
  check('Data baru langsung dapat dicari (semua instance)', JSON.stringify((await search(keyB)).results) === JSON.stringify(refB.search(keyB)) && (await search(keyB, base2)).count === refB.search(keyB).length);
  check('Data lama tidak lagi muncul', (await search(probe)).count === 0 && (await search(probe, base2)).count === 0);
  const keysAfter = (await nsKeys()).sort();
  check('Versi indeks lama dihapus dari Redis (tersisa 1 versi)', keysAfter.length === 4 && keysAfter.filter(k => k.includes(':v:')).length === 2, keysAfter.map(k => k.replace(pairing.NS, '')).join(', '));
  server2.kill();

  console.log('\n— 7. Redis dikosongkan → indeks dibangun ulang dari object storage');
  await clearIndex();
  check('Setelah Redis dikosongkan, pencarian 0 hasil', (await search(keyB)).count === 0);
  const conn = createRedisConnection({ label: 'Redis uji', blocking: true });
  check('ensurePairingIndex membangun ulang dari file sumber', (await pairing.ensurePairingIndex(conn)) === 'rebuilt');
  check('Pencarian kembali identik', JSON.stringify((await search(keyB)).results) === JSON.stringify(refB.search(keyB)));

  // Bersihkan data uji
  await runtime.close();
  await conn.quit();
  await clearIndex();
  await clearSource();
  await queues.getQueue(queues.QUEUE_NAMES.PAIRING_IMPORT).obliterate({ force: true }).catch(() => {});
  await queues.closeQueues();
  storage.closeStorage();
  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
