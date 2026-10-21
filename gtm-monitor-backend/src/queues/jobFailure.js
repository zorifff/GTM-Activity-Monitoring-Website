// Error dari worker disimpan BullMQ sebagai teks (failedReason). Agar aturan Centralized Error Handling tetap berlaku
// lintas proses, worker menyimpan JSON { status, body }: AppError → pesan untuk klien apa adanya; error lain → hanya
// status 500 (detail lengkap ditulis ke log worker, tidak pernah ikut ke klien).
const AppError = require('../utils/AppError');

function toJobFailure(err, logLabel) {
  if (err instanceof AppError) {
    return new Error(JSON.stringify({ status: err.statusCode, body: err.body }));
  }
  console.error(`❌ ${logLabel} — Unhandled Job Error:`, err);
  return new Error(JSON.stringify({ status: 500 }));
}

// failedReason → { status, body } untuk klien. publicMessage = pesan umum endpoint terkait.
function decodeJobFailure(failedReason, { publicMessage, jobId }) {
  let parsed = null;
  try {
    parsed = JSON.parse(failedReason);
  } catch {
    // failedReason bukan dari toJobFailure (mis. worker mati di tengah proses) → diperlakukan sebagai error internal
  }
  if (parsed && parsed.status && parsed.status < 500 && parsed.body) {
    return { status: parsed.status, body: parsed.body };
  }
  return {
    status: 500,
    body: { success: false, code: 'INTERNAL_ERROR', message: publicMessage, error: publicMessage, requestId: jobId }
  };
}

module.exports = { toJobFailure, decodeJobFailure };
