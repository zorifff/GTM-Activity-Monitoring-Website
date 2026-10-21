// Error yang memang ditujukan untuk klien (mis. 404 proyek tidak ditemukan, 400 aturan bisnis).
// `body` = isi JSON respons persis seperti yang dikirim ke klien, sehingga bentuk respons API tidak berubah.
class AppError extends Error {
  constructor(statusCode, body, code) {
    const message = typeof body === 'string' ? body : (body?.message || body?.error || 'Permintaan tidak dapat diproses.');
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.body = typeof body === 'string' ? { success: false, ...(code ? { code } : {}), message: body, error: body } : body;
  }
}

module.exports = AppError;
