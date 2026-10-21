const https = require('https');
const http = require('http');

// Helper: Download image buffer from remote Cloudinary URL
const downloadBuffer = (url) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Gagal mengunduh gambar dari Cloudinary, status code: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', err => reject(err));
    }).on('error', err => reject(err));
  });
};

// Helper: Sanitize folder/file name for OS compatibility
const sanitizeFolderName = (str) => {
  if (!str) return 'UNKNOWN';
  return str.toString().trim()
    .replace(/[\\/:*?"<>|]/g, '-') // Replace OS forbidden characters with hyphen
    .replace(/\s+/g, ' ')          // Collapse multiple spaces
    .trim();
};

// Helper: Get Activity Label for Folder & File Prefix
const getActivityLabel = (type) => {
  switch (type) {
    case 'tsel_menyapa':
      return 'TSEL MENYAPA WARGA';
    case 'branding_outlet':
      return 'BRANDING DOWNLINE OUTLET';
    case 'bumdes':
      return 'KERJASAMA DENGAN BUMDES';
    case 'rekrutmen_sf':
      return 'REKRUTMEN SF AKAMSI';
    case 'open_table':
      return 'ALWAYS ON OPEN TABLE';
    default:
      return (type || 'ACTIVITY').toUpperCase().replace(/_/g, ' ');
  }
};

module.exports = { downloadBuffer, sanitizeFolderName, getActivityLabel };
