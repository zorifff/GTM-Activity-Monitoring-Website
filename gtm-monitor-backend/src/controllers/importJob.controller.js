// Controller bersama untuk import Excel lewat antrean kerja (lihat services/importJobs.js):
//   POST …            → 202 + jobId (file diproses worker latar belakang)
//   GET  …/:jobId     → status job saat ini
//   GET  …/:jobId/events → progres via Server-Sent Events:
//     event "progress" { state, progress: { stage, percent } } → berkali-kali
//     event "completed" { result } / "failed" { error: { status, body } } → sekali, lalu stream ditutup
const asyncHandler = require('../utils/asyncHandler');
const { JOB_NOT_FOUND_MESSAGE, textBody } = require('../services/importJobs');

const SSE_HEARTBEAT_MS = 15 * 1000;

function createImportJobController(service, { startFailure, statusFailure, eventsFailure }) {
  const start = asyncHandler(async (req, res) => {
    res.status(202).json(await service.start({ file: req.file, user: req.user }));
  }, startFailure);

  const status = asyncHandler(async (req, res) => {
    res.json(await service.getJob(req.params.jobId));
  }, statusFailure);

  const events = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    await service.getJob(jobId); // 404 / 503 dikirim sebagai JSON biasa sebelum stream dibuka

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
    stopWatching = service.watch(jobId, (state) => {
      if (!state) {
        send('failed', { jobId, state: 'missing', error: { status: 404, body: textBody('IMPORT_JOB_NOT_FOUND', JOB_NOT_FOUND_MESSAGE) } });
        return close();
      }
      if (state.state === 'completed' || state.state === 'failed') {
        send(state.state, state);
        return close();
      }
      send('progress', state);
    });
  }, eventsFailure);

  return { start, status, events };
}

// Tolak lebih awal (409) — sebelum file besar selesai diunggah — bila import sejenis masih berjalan.
// Kunci atomik yang sebenarnya dipasang di Redis saat job dibuat (services/importJobs.js).
const createImportLockMiddleware = (service) => async (req, res, next) => {
  try {
    if (await service.getRunningJobId()) return res.status(409).json(service.IMPORT_IN_PROGRESS_BODY);
  } catch {
    // Redis tidak terjangkau: request dilanjutkan dan ditolak 503 saat job dibuat
  }
  next();
};

module.exports = { createImportJobController, createImportLockMiddleware };
