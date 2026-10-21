const Tesseract = require('tesseract.js');

// Helper: OCR Text Extraction & Link Parser using Tesseract.js
async function extractLinkFromImageBuffer(buffer) {
  try {
    const worker = await Tesseract.createWorker('eng');
    const { data } = await worker.recognize(buffer);
    await worker.terminate();

    const text = data && data.text ? data.text : '';
    console.log('🔍 [OCR Recognized Raw Text]:\n', text);

    if (!text) return null;

    // Pattern matching for URLs and link shorteners
    // Keywords: link, https, http, tinyurl, bitly, .com, .id, .goog, etc.
    const urlRegex = /(https?:\/\/[^\s]+|(?:www\.|tinyurl\.com|bit\.ly|drive\.google\.com|forms\.gle|s\.id|[a-zA-Z0-9-]+\.(?:com|id|org|net|gov|co\.id|go\.id))[^\s]*)/gi;

    const matches = text.match(urlRegex);
    if (matches && matches.length > 0) {
      let cleanUrl = matches[0].trim().replace(/[.,)"'\\]+$/, '');
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      return cleanUrl;
    }

    // Secondary scan: check lines containing keywords (link, https, tinyurl, bitly, .com, .id)
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (/link|https|tinyurl|bitly|\.com|\.id/i.test(line)) {
        const words = line.split(/\s+/);
        for (let word of words) {
          let cleaned = word.replace(/^[^\w/:]+/, '').replace(/[^\w/:]+$/, '');
          if (/https?:\/\/|\.com|\.id|tinyurl|bitly/i.test(cleaned)) {
            if (!/^https?:\/\//i.test(cleaned)) {
              cleaned = 'https://' + cleaned;
            }
            return cleaned;
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error('⚠️ [OCR Link Extraction Failed]:', err.message);
    return null;
  }
}

module.exports = { extractLinkFromImageBuffer };
