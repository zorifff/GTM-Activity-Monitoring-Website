const odpImportJobs = require('../services/odpImportJob.service');
const asyncHandler = require('../utils/asyncHandler');

const SSE_HEARTBEAT_MS = 15 * 1000;

// POST /api/admin/import-excel (Admin) — update Data ODP & Port mingguan dari file Excel.
// File diterima lalu diproses worker latar belakang: respons 202 + jobId, progres dipantau lewat /events.
const importExcel = asyncHandler(async (req, res) => {
  res.status(202).json(await odpImportJobs.startOdpImport({ file: req.file, user: req.user }));
}, 'Gagal mengimpor data Excel ODP.');

// GET /api/admin/import-excel/:jobId (Admin) — status job saat ini
const importStatus = asyncHandler(async (req, res) => {
  res.json(await odpImportJobs.getImportJob(req.params.jobId));
}, 'Gagal memuat status import Data ODP.');

// GET /api/admin/import-excel/:jobId/events (Admin) — progres via Server-Sent Events:
//   event "progress" { state, progress: { stage, percent } } → berkali-kali
//   event "completed" { result } / "failed" { error: { status, body } } → sekali, lalu stream ditutup
const importEvents = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  await odpImportJobs.getImportJob(jobId); // 404 / 503 dikirim sebagai JSON biasa sebelum stream dibuka

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n\n');

  let closed = false;
  let stopWatching = () => {};
  const heartbeat = setInterval(() => res.write(': ping\n\n'), SSE_HEARTBEAT_MS);
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    stopWatching();
    res.end();
  };
  const send = (event, data) => {
    if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  req.on('close', close);
  stopWatching = odpImportJobs.watchImportJob(jobId, (state) => {
    if (!state) {
      send('failed', { jobId, state: 'missing', error: { status: 404, body: { success: false, code: 'IMPORT_JOB_NOT_FOUND', message: 'Proses import tidak ditemukan atau sudah kedaluwarsa.', error: 'Proses import tidak ditemukan atau sudah kedaluwarsa.' } } });
      return close();
    }
    if (state.state === 'completed' || state.state === 'failed') {
      send(state.state, state);
      return close();
    }
    send('progress', state);
  });
}, 'Gagal memantau progres import Data ODP.');

module.exports = { importExcel, importStatus, importEvents };
