// Penyimpanan foto kegiatan terverifikasi di object storage (S3-compatible), disajikan lewat /media/verified/... (wajib login)
const fs = require('fs');
const path = require('path');
const { BACKEND_ROOT } = require('../config/paths');
const { deleteFromCloudinary } = require('../lib/cloudinary');
const { putObject, objectExists, deleteObject } = require('../lib/objectStorage');
const { downloadBuffer, sanitizeFolderName, getActivityLabel } = require('../utils/files');

const VERIFIED_PREFIX = 'verified/';
const MEDIA_URL_PREFIX = '/media/';
// Format lama (sebelum object storage): foto disimpan di disk "database foto" dengan hierarki yang sama
const LEGACY_PHOTO_PREFIXES = ['/database foto/', '/database%20foto/'];
const CONTENT_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const safeDecode = (value) => {
  try { return decodeURIComponent(value); } catch { return value; }
};

// Hierarki: <BRANCH> / <WOK> / <NAMA PROYEK> / <JENIS ACTIVITY> / <MM_YYYY> / <FILENAME>
// Filename: <ACT_3>_<BRANCH_3>_<WOK_3>_<NAMA_PROYEK>_<DDMMYYYY>_<HHMMSS>.[ext]
// `now` = waktu verifikasi (HHMMSS) — dapat diisi agar hasilnya bisa diuji
function buildVerifiedPhotoKey({ photoUrl, rawBranch, rawWok, rawProjectName, type, planDate }, now = new Date()) {
  const branchFolder = sanitizeFolderName(rawBranch || 'UNKNOWN_BRANCH').toUpperCase();
  const wokFolder = sanitizeFolderName(rawWok || 'UNKNOWN_WOK').toUpperCase();
  const projectFolder = sanitizeFolderName(rawProjectName || 'UNKNOWN_PROJECT');
  const actLabel = getActivityLabel(type).toUpperCase();

  const d = planDate ? new Date(planDate) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const day = String(validDate.getDate()).padStart(2, '0');

  const monthYear = `${month}_${year}`;       // e.g. 08_2026
  const ddmmyyyy = `${day}${month}${year}`;  // e.g. 07082026

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const hhmmss = `${hh}${mm}${ss}`;          // e.g. 141414

  // 3-letter prefixes (uppercase)
  const act3 = actLabel.substring(0, 3).toUpperCase();
  const branch3 = branchFolder.substring(0, 3).toUpperCase();
  const wok3 = wokFolder.substring(0, 3).toUpperCase();

  // Determine extension from URL
  let ext = '.jpg';
  const matchExt = (photoUrl || '').match(/\.(jpg|jpeg|png|webp)($|\?)/i);
  if (matchExt) {
    ext = `.${matchExt[1].toLowerCase()}`;
  }

  return {
    folder: `${branchFolder}/${wokFolder}/${projectFolder}/${actLabel}/${monthYear}`,
    // File name format: TSE_PEK_BAT_ODP-123_07082026_141414.jpg
    baseFileName: `${act3}_${branch3}_${wok3}_${projectFolder}_${ddmmyyyy}_${hhmmss}`,
    ext
  };
}

// URL foto yang tersimpan di object storage (baru) atau disk lama → key di bucket; null bila bukan foto tersimpan
function photoUrlToStorageKey(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith(`${MEDIA_URL_PREFIX}${VERIFIED_PREFIX}`)) return safeDecode(photoUrl.slice(MEDIA_URL_PREFIX.length));
  const legacy = LEGACY_PHOTO_PREFIXES.find(prefix => photoUrl.startsWith(prefix));
  if (legacy) return VERIFIED_PREFIX + safeDecode(photoUrl.slice(legacy.length));
  return null;
}

// Foto yang sudah tersimpan permanen (bukan staging Cloudinary)
const isStoredPhotoUrl = (photoUrl) => !!photoUrl && (photoUrl.startsWith('/uploads/') || !!photoUrlToStorageKey(photoUrl));

// Helper: Save verified Cloudinary photo to object storage (bucket/verified/...) lalu hapus staging Cloudinary
const saveVerifiedPhotoToStorage = async (photoUrl, rawBranch, rawWok, rawProjectName, type, planDate) => {
  if (!photoUrl || !photoUrl.includes('res.cloudinary.com')) {
    return photoUrl; // Already stored or empty
  }

  try {
    const { folder, baseFileName, ext } = buildVerifiedPhotoKey({ photoUrl, rawBranch, rawWok, rawProjectName, type, planDate });

    // Handle collisions safely if verified at exact same second
    let fileName = `${baseFileName}${ext}`;
    let counter = 1;
    while (await objectExists(`${VERIFIED_PREFIX}${folder}/${fileName}`)) {
      fileName = `${baseFileName}_${counter}${ext}`;
      counter++;
    }
    const key = `${VERIFIED_PREFIX}${folder}/${fileName}`;

    console.log(`📥 [Object Storage] Memindahkan foto terverifikasi dari Cloudinary ke bucket: ${key}`);
    const imgBuffer = await downloadBuffer(photoUrl);
    await putObject(key, imgBuffer, CONTENT_TYPES[ext]);

    // Clean up temporary Cloudinary staging photo
    await deleteFromCloudinary(photoUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));

    return `${MEDIA_URL_PREFIX}${key}`;
  } catch (err) {
    console.error('❌ [Object Storage Upload Error]:', err);
    return photoUrl; // Fallback to original URL on error
  }
};

// Hapus berkas foto di mana pun ia disimpan (staging Cloudinary / object storage / disk lama /uploads)
async function deleteStoredPhoto(photoUrl) {
  if (!photoUrl) return;
  if (photoUrl.includes('res.cloudinary.com')) {
    await deleteFromCloudinary(photoUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));
    return;
  }
  const key = photoUrlToStorageKey(photoUrl);
  if (key) {
    await deleteObject(key).catch(err => console.error('Storage delete warning:', err.message));
    return;
  }
  if (photoUrl.startsWith('/uploads/')) {
    const localP = path.join(BACKEND_ROOT, decodeURIComponent(photoUrl));
    if (fs.existsSync(localP)) {
      await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
    }
  }
}

module.exports = {
  VERIFIED_PREFIX,
  buildVerifiedPhotoKey,
  photoUrlToStorageKey,
  isStoredPhotoUrl,
  saveVerifiedPhotoToStorage,
  deleteStoredPhoto
};
