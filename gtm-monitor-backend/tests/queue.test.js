// Uji Fase 2 Task 2: antrean kerja BullMQ (Redis) untuk import Excel ODP & OCR, progres via SSE.
// Dijalankan oleh tests/run.js (npm test) dengan QUEUE_PREFIX=gtm-test sehingga antrean uji terpisah dari antrean asli.
// ETL ODP diganti fungsi tiruan → tidak ada data ODP yang ditulis/dihapus. OCR memakai Tesseract sungguhan.
const path = require('path');
const fs = require('fs');
const http = require('http');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
const BASE = `http://localhost:${process.env.TEST_PORT}`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (!process.env.QUEUE_PREFIX || process.env.QUEUE_PREFIX === 'gtm') {
  console.error('QUEUE_PREFIX uji belum diatur (jalankan lewat npm test). Dibatalkan agar antrean asli tidak tersentuh.');
  process.exit(1);
}

const xlsx = require(path.join(backendDir, 'node_modules/xlsx'));
const AppError = require(path.join(backendDir, 'src/utils/AppError'));
const storage = require(path.join(backendDir, 'src/lib/objectStorage'));
const { startWorkers } = require(path.join(backendDir, 'src/workers'));
const queues = require(path.join(backendDir, 'src/queues'));
const { ODP_IMPORT_LOCK_KEY, IMPORT_IN_PROGRESS_BODY, TMP_PREFIX } = require(path.join(backendDir, 'src/services/odpImportJob.service'));
const { scanLinkInBackground } = require(path.join(backendDir, 'src/services/ocrJob.service'));
const { extractLinkFromImageBuffer } = require(path.join(backendDir, 'src/services/ocr.service'));

// ETL tiruan: melaporkan 3 tahap progres lalu selesai / gagal sesuai skenario
let behavior = 'ok';
let receivedBytes = null;
const fakeImport = async ({ file, onProgress }) => {
  receivedBytes = file.buffer.length;
  for (const percent of [20, 50, 80]) {
    onProgress(`Tahap uji ${percent}`, percent);
    await sleep(450);
  }
  if (behavior === 'client-error') throw new AppError(400, { error: 'Format kolom Excel tidak dikenali (uji).' });
  if (behavior === 'crash') throw new Error('Invalid `prisma.odp.update()` invocation: table "public"."Odp" (uji)');
  return { success: true, message: 'Import uji selesai', stats: { rows: 3 } };
};

const excelBuffer = (() => {
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['PROJECT', 'BRANCH'], ['UJI', 'UJI']]), 'Sheet1');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
})();
const excelForm = () => { const f = new FormData(); f.append('file', new Blob([excelBuffer]), 'uji-antrean.xlsx'); return f; };
// File Excel sementara kini di object storage (tmp/odp-import/), bukan di disk server
const tmpFiles = () => storage.listObjects(TMP_PREFIX);

const parseSse = (block) => {
  let event = 'message'; const data = [];
  block.split('\n').forEach(l => { if (l.startsWith('event:')) event = l.slice(6).trim(); else if (l.startsWith('data:')) data.push(l.slice(5).trim()); });
  return data.length ? { event, data: JSON.parse(data.join('\n')) } : null;
};
// Membaca stream SSE sampai server menutupnya
const readSse = async (url, cookie, timeoutMs = 20000) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const res = await fetch(BASE + url, { headers: { Accept: 'text/event-stream', ...(cookie ? { Cookie: cookie } : {}) }, signal: ac.signal });
  const out = { status: res.status, contentType: res.headers.get('content-type') || '', events: [], body: null };
  if (!out.contentType.includes('text/event-stream')) {
    out.body = await res.json().catch(() => null);
  } else {
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let i;
        while ((i = buffer.indexOf('\n\n')) >= 0) {
          const ev = parseSse(buffer.slice(0, i));
          buffer = buffer.slice(i + 2);
          if (ev) out.events.push(ev);
        }
      }
    } catch { out.timedOut = true; }
  }
  clearTimeout(timer);
  return out;
};

(async () => {
  const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const postImport = () => fetch(`${BASE}/api/admin/import-excel`, { method: 'POST', headers: { Cookie: cookie }, body: excelForm() });

  queues.initQueues();
  const redis = queues.getApiConnection();
  for (let i = 0; i < 20 && redis.status !== 'ready'; i++) await sleep(250);
  check('Redis terhubung', redis.status === 'ready', redis.status);
  if (redis.status !== 'ready') {
    console.log('Jalankan Redis dulu: npm run redis (folder root)');
    console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
    process.exit(1);
  }
  await redis.del(ODP_IMPORT_LOCK_KEY);

  console.log('\n— 1. Worker tidak aktif → 503 (tanpa efek samping)');
  const tmpBefore = (await tmpFiles()).length;
  let res = await postImport();
  let body = await res.json();
  check('Import ODP → 503 WORKER_UNAVAILABLE + pesan jelas', res.status === 503 && body.code === 'WORKER_UNAVAILABLE' && /Worker/.test(body.message), `${res.status} ${body.message}`);
  check('Tidak ada file sementara tertinggal di object storage', (await tmpFiles()).length === tmpBefore);
  const programsBefore = await (await fetch(`${BASE}/api/programs`)).text();
  const imgForm = new FormData();
  imgForm.append('file', new Blob([fs.readFileSync(path.join(__dirname, 'fixtures/ocr-sample.png'))], { type: 'image/png' }), 'uji.png');
  imgForm.append('programName', 'Uji Antrean 503');
  imgForm.append('monthLabel', 'Agustus 2026');
  res = await fetch(`${BASE}/api/admin/upload-program-image`, { method: 'POST', headers: { Cookie: cookie }, body: imgForm });
  body = await res.json();
  check('Upload gambar program → 503 sebelum unggah ke Cloudinary', res.status === 503 && body.code === 'WORKER_UNAVAILABLE', `${res.status} ${body.message}`);
  check('Data program tidak berubah', (await (await fetch(`${BASE}/api/programs`)).text()) === programsBefore);

  console.log('\n— 2. Worker aktif: import diproses di latar belakang + progres SSE');
  const runtime = startWorkers({ odpImport: fakeImport });
  for (let i = 0; i < 40 && (await queues.getQueue(queues.QUEUE_NAMES.ODP_IMPORT).getWorkersCount()) === 0; i++) await sleep(250);
  behavior = 'ok';
  const t0 = Date.now();
  res = await postImport();
  body = await res.json();
  const responseMs = Date.now() - t0;
  const jobId = body.jobId;
  check('POST import → 202 + jobId (tidak menunggu ETL selesai)', res.status === 202 && body.success === true && body.code === 'IMPORT_QUEUED' && /^[0-9a-f-]{36}$/.test(jobId || ''), `${res.status} dalam ${responseMs} ms`);
  const second = await postImport();
  const secondBody = await second.json();
  check('Import kedua saat import pertama berjalan → 409 (pesan sama seperti sebelumnya)', second.status === 409 && JSON.stringify(secondBody) === JSON.stringify(IMPORT_IN_PROGRESS_BODY), secondBody.message);
  let sse = await readSse(`/api/admin/import-excel/${jobId}/events`, cookie);
  const progress = sse.events.filter(e => e.event === 'progress' && e.data.progress.stage && e.data.progress.stage.startsWith('Tahap uji')).map(e => e.data.progress.percent);
  const last = sse.events[sse.events.length - 1];
  check('Header SSE text/event-stream', sse.status === 200 && sse.contentType.includes('text/event-stream'), sse.contentType);
  check('Progres tahap 20% → 50% → 80% terkirim berurutan', JSON.stringify(progress) === '[20,50,80]', JSON.stringify(progress));
  check('Event akhir "completed" berisi hasil ETL apa adanya', last && last.event === 'completed' && JSON.stringify(last.data.result) === JSON.stringify({ success: true, message: 'Import uji selesai', stats: { rows: 3 } }));
  check('Stream ditutup server setelah selesai', !sse.timedOut);
  check('Worker menerima isi file utuh', receivedBytes === excelBuffer.length, `${receivedBytes} / ${excelBuffer.length} byte`);
  check('File sementara di object storage dihapus setelah selesai', (await tmpFiles()).length === tmpBefore && !(await storage.objectExists(`${TMP_PREFIX}${jobId}.xlsx`)));
  check('Kunci import dilepas setelah selesai', (await redis.get(ODP_IMPORT_LOCK_KEY)) === null);
  res = await fetch(`${BASE}/api/admin/import-excel/${jobId}`, { headers: { Cookie: cookie } });
  body = await res.json();
  check('GET status job → completed + hasil', res.status === 200 && body.state === 'completed' && body.result.message === 'Import uji selesai');
  sse = await readSse(`/api/admin/import-excel/${jobId}/events`, cookie);
  check('Tersambung setelah selesai → langsung event completed', sse.events.length === 1 && sse.events[0].event === 'completed');

  console.log('\n— 3. Kegagalan job & kebocoran error');
  behavior = 'client-error';
  body = await (await postImport()).json();
  sse = await readSse(`/api/admin/import-excel/${body.jobId}/events`, cookie);
  let end = sse.events[sse.events.length - 1];
  check('Error untuk pengguna (AppError 400) diteruskan apa adanya', end.event === 'failed' && end.data.error.status === 400 && end.data.error.body.error === 'Format kolom Excel tidak dikenali (uji).');
  behavior = 'crash';
  body = await (await postImport()).json();
  const crashId = body.jobId;
  const consoleError = console.error;
  console.error = () => {}; // log lengkap error internal di worker (memang hanya untuk server)
  sse = await readSse(`/api/admin/import-excel/${crashId}/events`, cookie);
  console.error = consoleError;
  end = sse.events[sse.events.length - 1];
  const text = JSON.stringify(end.data);
  check('Error internal → 500 dengan pesan umum + requestId = jobId', end.event === 'failed' && end.data.error.status === 500 && end.data.error.body.message === 'Gagal mengimpor data Excel ODP.' && end.data.error.body.requestId === crashId);
  check('Detail error internal (prisma/tabel) TIDAK ikut terkirim', !/prisma|Odp"|public/.test(text), text.slice(0, 160));
  check('Kunci tetap dilepas walau job gagal', (await redis.get(ODP_IMPORT_LOCK_KEY)) === null);

  console.log('\n— 4. Kunci import di Redis (berlaku lintas instance server)');
  await redis.set(ODP_IMPORT_LOCK_KEY, '11111111-1111-4111-8111-111111111111', 'EX', 2 * 60 * 60);
  res = await postImport();
  check('Kunci dipegang instance lain → 409', res.status === 409);
  await redis.set(ODP_IMPORT_LOCK_KEY, '11111111-1111-4111-8111-111111111111', 'EX', 100);
  behavior = 'ok';
  res = await postImport();
  body = await res.json();
  check('Kunci basi (job sudah tidak ada) dibersihkan otomatis → 202', res.status === 202, `${res.status}`);
  if (body.jobId) await readSse(`/api/admin/import-excel/${body.jobId}/events`, cookie);

  console.log('\n— 5. Akses endpoint progres');
  sse = await readSse(`/api/admin/import-excel/${jobId}/events`, null);
  check('Tanpa login → 401', sse.status === 401);
  sse = await readSse('/api/admin/import-excel/00000000-0000-4000-8000-000000000000/events', cookie);
  check('Job tidak dikenal → 404 JSON', sse.status === 404 && sse.body && sse.body.code === 'IMPORT_JOB_NOT_FOUND');
  sse = await readSse('/api/admin/import-excel/bukan-uuid/events', cookie);
  check('jobId tidak valid → 400', sse.status === 400 && sse.body && sse.body.code === 'VALIDATION_ERROR');

  console.log('\n— 6. OCR dikerjakan worker (Tesseract sungguhan)');
  const image = fs.readFileSync(path.join(__dirname, 'fixtures/ocr-sample.png'));
  const imageServer = http.createServer((req, res2) => {
    if (req.url === '/uji.png') { res2.writeHead(200, { 'Content-Type': 'image/png' }); res2.end(image); } else { res2.writeHead(404); res2.end(); }
  });
  await new Promise(r => imageServer.listen(0, '127.0.0.1', r));
  const imageBase = `http://127.0.0.1:${imageServer.address().port}`;
  const consoleLog = console.log;
  console.log = () => {}; // teks mentah OCR tidak ditampilkan
  const direct = await extractLinkFromImageBuffer(image);
  const t1 = Date.now();
  const viaWorker = await scanLinkInBackground(`${imageBase}/uji.png`);
  const ocrMs = Date.now() - t1;
  console.error = () => {}; // log worker untuk gambar 404 memang diharapkan
  const missing = await scanLinkInBackground(`${imageBase}/tidak-ada.png`);
  console.log = consoleLog;
  console.error = consoleError;
  check('Link terbaca dari gambar', /bit\.ly\/gtm-uji-ocr/.test(viaWorker || ''), `${viaWorker} (${ocrMs} ms)`);
  check('Hasil worker identik dengan OCR langsung (kode lama)', viaWorker === direct, `${direct}`);
  check('Gambar gagal diunduh → null (upload tetap lanjut seperti dulu)', missing === null);
  imageServer.close();

  await runtime.close();
  for (const name of Object.values(queues.QUEUE_NAMES)) await queues.getQueue(name).obliterate({ force: true }).catch(() => {});
  await redis.del(ODP_IMPORT_LOCK_KEY);
  await queues.closeQueues();
  storage.closeStorage();
  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  // exitCode (bukan process.exit) agar koneksi fetch selesai ditutup — mencegah crash libuv di Windows
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
