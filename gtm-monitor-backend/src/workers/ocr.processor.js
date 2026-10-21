// Job "OCR gambar program": unduh gambar dari Cloudinary → Tesseract.js → link yang terbaca (atau null).
const { downloadBuffer } = require('../utils/files');
const { extractLinkFromImageBuffer } = require('../services/ocr.service');
const { toJobFailure } = require('../queues/jobFailure');

async function processOcrJob(job) {
  try {
    const buffer = await downloadBuffer(job.data.imageUrl);
    const scannedLink = await extractLinkFromImageBuffer(buffer);
    return { scannedLink };
  } catch (err) {
    throw toJobFailure(err, `[OCR ${job.id}]`);
  }
}

module.exports = { processOcrJob };
