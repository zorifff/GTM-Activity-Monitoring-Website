// Penyimpanan foto kegiatan terverifikasi (saat ini: disk lokal "database foto")
const fs = require('fs');
const path = require('path');
const { PHOTO_DIR } = require('../config/paths');
const { deleteFromCloudinary } = require('../lib/cloudinary');
const { downloadBuffer, sanitizeFolderName, getActivityLabel } = require('../utils/files');

// Helper: Save verified Cloudinary photo to structured local disk directory
// Hierarchy: database foto / <BRANCH> / <WOK> / <NAMA PROYEK> / <JENIS ACTIVITY> / <MM_YYYY> / <FILENAME>
// Filename: <ACT_3>_<BRANCH_3>_<WOK_3>_<NAMA_PROYEK>_<DDMMYYYY>_<HHMMSS>.[ext]
const saveVerifiedPhotoToLocal = async (photoUrl, rawBranch, rawWok, rawProjectName, type, planDate) => {
  if (!photoUrl || !photoUrl.includes('res.cloudinary.com')) {
    return photoUrl; // Already local or empty
  }

  try {
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

    // Current time HHMMSS for verification timestamp
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const hhmmss = `${hh}${mm}${ss}`;          // e.g. 141414

    // 3-letter prefixes (uppercase)
    const act3 = actLabel.substring(0, 3).toUpperCase();
    const branch3 = branchFolder.substring(0, 3).toUpperCase();
    const wok3 = wokFolder.substring(0, 3).toUpperCase();

    // Directory: database foto / branch / WOK / project / activity / (Bulan_tahun)
    const targetDir = path.join(PHOTO_DIR, branchFolder, wokFolder, projectFolder, actLabel, monthYear);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Determine extension from URL
    let ext = '.jpg';
    const matchExt = photoUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i);
    if (matchExt) {
      ext = `.${matchExt[1].toLowerCase()}`;
    }

    // File name format: TSE_PEK_BAT_ODP-123_07082026_141414.jpg
    const baseFileName = `${act3}_${branch3}_${wok3}_${projectFolder}_${ddmmyyyy}_${hhmmss}`;
    let fileName = `${baseFileName}${ext}`;
    let filePath = path.join(targetDir, fileName);

    // Handle collisions safely if verified at exact same second
    let counter = 1;
    while (fs.existsSync(filePath)) {
      fileName = `${baseFileName}_${counter}${ext}`;
      filePath = path.join(targetDir, fileName);
      counter++;
    }

    console.log(`📥 [Auto Local Download] Downloading verified photo from Cloudinary to: ${filePath}`);
    const imgBuffer = await downloadBuffer(photoUrl);
    fs.writeFileSync(filePath, imgBuffer);

    // Web-accessible URL path
    const localWebPath = `/database foto/${branchFolder}/${wokFolder}/${projectFolder}/${actLabel}/${monthYear}/${fileName}`;

    // Clean up temporary Cloudinary staging photo
    await deleteFromCloudinary(photoUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));

    return localWebPath;
  } catch (err) {
    console.error('❌ [Auto Local Download Error]:', err);
    return photoUrl; // Fallback to original URL on error
  }
};

module.exports = { saveVerifiedPhotoToLocal };
