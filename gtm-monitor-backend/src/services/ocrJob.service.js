// Pemindaian link (OCR Tesseract) pada gambar program lewat antrean kerja — dikerjakan worker.js, bukan server API.
const { QUEUE_NAMES, getQueue, assertQueueAvailable, waitForJob } = require('../queues');

const QUEUE = QUEUE_NAMES.OCR;
const OCR_TIMEOUT_MS = 2 * 60 * 1000;

// Dipanggil sebelum gambar diunggah ke Cloudinary: tolak 503 bila Redis / worker tidak aktif
const assertOcrAvailable = () => assertQueueAvailable(QUEUE);

// Hasil = link yang terbaca, atau null. Sama seperti sebelumnya, kegagalan OCR tidak menggagalkan upload gambar.
async function scanLinkInBackground(imageUrl) {
  let job;
  try {
    job = await getQueue(QUEUE).add('scan', { imageUrl });
    const snapshot = await waitForJob(QUEUE, job.id, OCR_TIMEOUT_MS);
    if (snapshot && snapshot.state === 'completed') return snapshot.returnvalue?.scannedLink || null;
    console.error(`⚠️ [OCR Job ${job.id}] Gagal: ${snapshot ? snapshot.failedReason : 'job hilang dari antrean'}`);
  } catch (err) {
    console.error(`⚠️ [OCR Job ${job ? job.id : '-'}] ${err.message}`);
  }
  return null;
}

module.exports = { assertOcrAvailable, scanLinkInBackground };
