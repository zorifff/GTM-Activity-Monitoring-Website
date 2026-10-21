// Menampilkan isi bucket object storage: npm run storage:ls (root)  /  npm run storage:ls -- tmp/
const { S3_BUCKET } = require('../src/config/env');
const { listObjects, closeStorage } = require('../src/lib/objectStorage');

const prefix = process.argv[2] || '';

(async () => {
  const items = await listObjects(prefix);
  items.forEach(o => console.log(`${new Date(o.lastModified).toLocaleString('id-ID')}  ${String(o.size).padStart(9)} B  ${o.key}`));
  console.log(`\n${items.length} objek di bucket "${S3_BUCKET}"${prefix ? ` dengan awalan "${prefix}"` : ''}`);
})().catch(e => {
  console.error('❌', e.message);
  process.exitCode = 1;
}).finally(closeStorage);
