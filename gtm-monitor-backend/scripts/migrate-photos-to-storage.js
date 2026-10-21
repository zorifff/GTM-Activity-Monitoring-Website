// Migrasi foto terverifikasi format lama (disk "database foto") ke object storage (bucket/verified/...).
//   node gtm-monitor-backend/scripts/migrate-photos-to-storage.js           → dry-run: hanya laporan, tidak mengubah apa pun
//   node gtm-monitor-backend/scripts/migrate-photos-to-storage.js --apply   → unggah file + ubah photoUrl di DB ke /media/verified/...
// Aman dijalankan ulang (objek yang sudah ada tidak diunggah ulang). File lokal TIDAK dihapus (tetap sebagai cadangan).
const fs = require('fs');
const path = require('path');
require('../src/config/env');
const prisma = require('../src/lib/prisma');
const { PHOTO_DIR } = require('../src/config/paths');
const { putObject, objectExists, closeStorage } = require('../src/lib/objectStorage');
const { photoUrlToStorageKey, VERIFIED_PREFIX } = require('../src/services/photoStorage.service');

const APPLY = process.argv.includes('--apply');
const LEGACY_FILTER = { OR: [{ photoUrl: { startsWith: '/database foto/' } }, { photoUrl: { startsWith: '/database%20foto/' } }] };
const CONTENT_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const localPathForKey = (key) => path.join(PHOTO_DIR, ...key.slice(VERIFIED_PREFIX.length).split('/'));

const listLocalFiles = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? listLocalFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]))
  : []);

(async () => {
  console.log(`📦 Migrasi foto "database foto" → object storage (${APPLY ? 'APPLY: menulis ke bucket & DB' : 'DRY-RUN: tanpa perubahan'})\n`);
  const sources = [
    { label: 'ProjectActivityPhoto', model: prisma.projectActivityPhoto },
    { label: 'ProjectActivity (lama)', model: prisma.projectActivity }
  ];
  const stats = { rows: 0, uploaded: 0, alreadyInBucket: 0, updated: 0, missingFile: 0 };
  const referenced = new Set();

  for (const { label, model } of sources) {
    const rows = await model.findMany({ where: LEGACY_FILTER, select: { id: true, photoUrl: true, updatedAt: true } });
    for (const row of rows) {
      stats.rows++;
      const key = photoUrlToStorageKey(row.photoUrl);
      const localPath = localPathForKey(key);
      referenced.add(path.resolve(localPath));
      const newUrl = `/media/${key}`;

      if (!fs.existsSync(localPath)) {
        stats.missingFile++;
        console.log(`⚠️  ${label} ${row.id}: file lokal tidak ada, dilewati → ${row.photoUrl}`);
        continue;
      }
      const inBucket = await objectExists(key);
      if (APPLY) {
        if (!inBucket) {
          await putObject(key, fs.readFileSync(localPath), CONTENT_TYPES[path.extname(localPath).toLowerCase()] || 'application/octet-stream');
          stats.uploaded++;
        } else {
          stats.alreadyInBucket++;
        }
        // updatedAt dipertahankan: perpindahan lokasi berkas bukan perubahan data kegiatan
        await model.update({ where: { id: row.id }, data: { photoUrl: newUrl, updatedAt: row.updatedAt } });
        stats.updated++;
      } else if (inBucket) {
        stats.alreadyInBucket++;
      }
      console.log(`${APPLY ? '✅' : '•'} ${label} ${row.id}${inBucket ? ' (sudah di bucket)' : ''}\n    ${row.photoUrl}\n  → ${newUrl}`);
    }
  }

  const orphans = listLocalFiles(PHOTO_DIR).filter(f => !referenced.has(path.resolve(f)));
  console.log(`\nRingkasan: ${stats.rows} baris DB berformat lama, ${stats.missingFile} file hilang, ${stats.alreadyInBucket} sudah ada di bucket` +
    (APPLY ? `, ${stats.uploaded} diunggah, ${stats.updated} baris DB diperbarui.` : '. Jalankan dengan --apply untuk memigrasikan.'));
  if (orphans.length) console.log(`ℹ️  ${orphans.length} file di "database foto" tidak dirujuk DB (tidak dimigrasikan):\n  ${orphans.map(f => path.relative(PHOTO_DIR, f)).join('\n  ')}`);

  await prisma.$disconnect();
  closeStorage();
})().catch(async (e) => {
  console.error('❌ Migrasi gagal:', e);
  await prisma.$disconnect();
  closeStorage();
  process.exitCode = 1;
});
