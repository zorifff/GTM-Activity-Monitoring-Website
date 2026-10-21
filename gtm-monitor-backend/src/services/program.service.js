// Tracking Program Bulanan: index.json per periode, gambar program (Cloudinary + OCR link), sesi 6 bulanan
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const AppError = require('../utils/AppError');
const { PROGRAMS_DIR, DEFAULT_PROGRAM_EXCEL } = require('../config/paths');
const { uploadToCloudinary } = require('../lib/cloudinary');
const { assertOcrAvailable, scanLinkInBackground } = require('./ocrJob.service');

// Parse file Excel program (format lama) menjadi data sheet terstruktur
function parseProgramExcelFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetsData = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      // Search for detail URL in cells
      let detailUrl = null;
      for (let key in sheet) {
        if (key.startsWith('!')) continue;
        const cell = sheet[key];
        const val = String(cell.v || cell.w || '').trim();
        if (cell.l && cell.l.Target) {
          detailUrl = cell.l.Target;
          break;
        }
        const match = val.match(/(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|s\.id\/[^\s]+|tinyurl\.com\/[^\s]+)/i);
        if (match) {
          detailUrl = match[0];
          break;
        }
      }

      if (detailUrl && !detailUrl.startsWith('http://') && !detailUrl.startsWith('https://')) {
        detailUrl = 'https://' + detailUrl;
      }

      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rawRows || rawRows.length === 0) return;

      // Find header row (row containing "BRANCH", "Branch", "Monitoring", etc.)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
        const row = rawRows[i];
        if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && /branch/i.test(cell))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) headerRowIndex = 0;

      const rawHeaders = rawRows[headerRowIndex] || [];
      const headers = rawHeaders.map((h, colIdx) => h ? String(h).trim() : `Col ${colIdx + 1}`);

      const dataRows = [];
      let summaryRow = null;

      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] || '').trim();
        const secondCell = String(row[1] || '').trim();

        // Check if row is URL row
        if (firstCell.startsWith('http') || firstCell.includes('bit.ly') || firstCell.includes('tinyurl') || firstCell.includes('s.id')) {
          if (!detailUrl) {
            detailUrl = firstCell.startsWith('http') ? firstCell : 'https://' + firstCell;
          }
          continue;
        }

        const isSummary = /jateng|grand total|total/i.test(firstCell) || /jateng|grand total|total/i.test(secondCell);

        const formattedRow = {};
        headers.forEach((h, colIdx) => {
          formattedRow[h] = row[colIdx] !== undefined ? row[colIdx] : null;
        });

        if (isSummary) {
          summaryRow = formattedRow;
        } else {
          const hasContent = Object.values(formattedRow).some(v => v !== null && v !== '');
          if (hasContent) {
            dataRows.push(formattedRow);
          }
        }
      }

      sheetsData.push({
        sheetName,
        detailUrl,
        headers,
        rows: dataRows,
        summaryRow
      });
    });

    return sheetsData;
  } catch (err) {
    console.error('Error parsing program excel file:', err);
    return null;
  }
}

// Ensure program storage directory exists
const programsDir = PROGRAMS_DIR;
if (!fs.existsSync(programsDir)) {
  try { fs.mkdirSync(programsDir, { recursive: true }); } catch {}
}

const INDONESIAN_MONTH_MAP = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
  'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
};

// Helper: Prune program data for expired 6-month sessions (Session 1: Jan-Jun / Session 2: Jul-Dec)
function cleanExpiredProgramSessions(programIndex) {
  if (!programIndex || typeof programIndex !== 'object') return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-11
  const isSession2 = currentMonthIdx >= 6; // true if July - Dec (Session 2)

  let modified = false;

  Object.keys(programIndex).forEach(monthLabel => {
    const parts = monthLabel.trim().split(/\s+/);
    if (parts.length >= 2) {
      const monthName = parts[0].toLowerCase();
      const yearNum = parseInt(parts[1], 10);
      const mIdx = INDONESIAN_MONTH_MAP[monthName];

      if (typeof mIdx === 'number' && !isNaN(yearNum)) {
        let isExpired = false;

        if (yearNum < currentYear) {
          isExpired = true;
        } else if (yearNum === currentYear) {
          if (isSession2 && mIdx < 6) {
            // Currently in Session 2 (Jul-Dec), so Session 1 (Jan-Jun) of current year is expired
            isExpired = true;
          } else if (!isSession2 && mIdx >= 6) {
            // Currently in Session 1 (Jan-Jun), Session 2 is expired
            isExpired = true;
          }
        }

        if (isExpired) {
          console.log(`🧹 [Session Auto-Prune] Removing expired session program data for "${monthLabel}"...`);
          delete programIndex[monthLabel];
          modified = true;

          const monthSlug = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const fileToDelete = path.join(programsDir, `program_${monthSlug}.xlsx`);
          if (fs.existsSync(fileToDelete)) {
            try {
              fs.unlinkSync(fileToDelete);
              console.log(`  └─ Deleted physical file: ${fileToDelete}`);
            } catch (e) {
              console.error(`  └─ Failed to delete file ${fileToDelete}:`, e.message);
            }
          }
        }
      }
    }
  });

  if (modified) {
    const indexPath = path.join(programsDir, 'index.json');
    try {
      fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');
      console.log('✅ [Session Auto-Prune] Updated index.json saved to disk.');
    } catch (e) {
      console.error('Failed to write updated program index.json:', e);
    }
  }

  return modified;
}

// Helper: Case-insensitive & normalized month label lookup
function findMonthKey(programIndex, label) {
  if (!programIndex || typeof programIndex !== 'object' || !label) return null;
  const target = label.trim().toLowerCase();
  return Object.keys(programIndex).find(k => k.trim().toLowerCase() === target) || null;
}

// Helper: Load & initialize program index with fallback file persistence
function getOrInitializeProgramIndex() {
  const indexPath = path.join(programsDir, 'index.json');
  let programIndex = {};

  if (fs.existsSync(indexPath)) {
    try {
      programIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch {}
  }

  // Clean expired session programs
  const wasPruned = cleanExpiredProgramSessions(programIndex);
  let modified = wasPruned;

  // Fallback to default August 2026 file if index doesn't have it AND it wasn't explicitly marked deleted
  const hasAgustus = findMonthKey(programIndex, 'Agustus 2026');
  if (!hasAgustus && !programIndex['__deleted_Agustus_2026']) {
    const localFilePath = DEFAULT_PROGRAM_EXCEL;
    const fallbackPath = 'C:\\Users\\gatfa\\Downloads\\Telegram Desktop\\Tracking Program - August 2026.xlsx';
    const targetPath = fs.existsSync(localFilePath) ? localFilePath : fs.existsSync(fallbackPath) ? fallbackPath : null;

    if (targetPath) {
      const sheets = parseProgramExcelFile(targetPath);
      if (sheets && sheets.length > 0) {
        programIndex['Agustus 2026'] = {
          monthLabel: 'Agustus 2026',
          updatedAt: new Date().toISOString(),
          sheetsCount: sheets.length,
          programs: sheets
        };
        modified = true;
      }
    }
  }

  if (modified) {
    try {
      fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save program index.json:', e.message);
    }
  }

  return programIndex;
}

// Dipindah dari handler server.js baris 2276-2412
async function uploadProgramImage({ body, file }) {
  if (!file || !file.buffer) {
    throw new AppError(400, { error: 'Tidak ada file gambar program yang diunggah.' });
  }

  const monthLabel = body.monthLabel || 'Agustus 2026';
  const rawSheetName = body.programName || body.sheetName || 'Program Tracking';
  const sheetName = rawSheetName.trim().replace(/\s+/g, ' ');
  const manualDetailUrl = body.detailUrl || '';

  // Tolak lebih dulu (503) bila antrean OCR tidak aktif, agar tidak ada gambar yatim di Cloudinary
  await assertOcrAvailable();

  // 1. Upload file to Cloudinary (folder 'gtm_programs')
  console.log(`📤 [Cloudinary Upload] Uploading program image "${sheetName}" for ${monthLabel}...`);
  const cloudinaryResult = await uploadToCloudinary(file.buffer, 'gtm_programs');
  const imageUrl = cloudinaryResult.secure_url;
  console.log(`✅ [Cloudinary Upload Success] Image URL: ${imageUrl}`);

  // 2. Perform OCR link scanning (dikerjakan worker latar belakang dari gambar yang sudah di Cloudinary)
  console.log(`🔍 [OCR Scanning] Scanning link text from image using Tesseract.js (background worker)...`);
  const scannedLink = await scanLinkInBackground(imageUrl);
  const detailUrl = manualDetailUrl || scannedLink || '';

  console.log(`🔗 [OCR Result] Scanned Link: "${scannedLink || 'Tidak Ditemukan'}", Final Detail URL: "${detailUrl}"`);

  // 3. Update index.json
  const indexPath = path.join(programsDir, 'index.json');
  const programIndex = getOrInitializeProgramIndex();
  if (monthLabel === 'Agustus 2026' && programIndex['__deleted_Agustus_2026']) {
    delete programIndex['__deleted_Agustus_2026'];
  }

  if (!programIndex[monthLabel]) {
    programIndex[monthLabel] = {
      monthLabel,
      updatedAt: new Date().toISOString(),
      sheetsCount: 0,
      programs: []
    };
  }

  const newImageItem = {
    id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    imageUrl,
    detailUrl,
    scannedLink: scannedLink || null,
    createdAt: new Date().toISOString()
  };

  const normalizedTarget = sheetName.toLowerCase();
  const existingIdx = programIndex[monthLabel].programs.findIndex(p => {
    const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
    return pName === normalizedTarget;
  });

  let programItem;
  let isAppended = false;

  if (existingIdx >= 0) {
    // Program with same name exists in this month -> Append to images array
    programItem = programIndex[monthLabel].programs[existingIdx];

    // Normalize legacy format if images array doesn't exist
    if (!Array.isArray(programItem.images) || programItem.images.length === 0) {
      programItem.images = [];
      if (programItem.imageUrl) {
        programItem.images.push({
          id: `img_legacy_${Date.now()}`,
          imageUrl: programItem.imageUrl,
          detailUrl: programItem.detailUrl || '',
          scannedLink: programItem.scannedLink || null,
          createdAt: programItem.updatedAt || new Date().toISOString()
        });
      }
    }

    programItem.images.push(newImageItem);
    // Maintain top-level backward compatibility with first slide
    programItem.imageUrl = programItem.images[0]?.imageUrl || imageUrl;
    programItem.detailUrl = programItem.images[0]?.detailUrl || detailUrl;
    programItem.scannedLink = programItem.images[0]?.scannedLink || scannedLink;
    programItem.updatedAt = new Date().toISOString();
    isAppended = true;
  } else {
    // Create new program with images array
    programItem = {
      sheetName,
      images: [newImageItem],
      imageUrl,
      detailUrl,
      scannedLink: scannedLink || null,
      updatedAt: new Date().toISOString()
    };
    programIndex[monthLabel].programs.push(programItem);
  }

  programIndex[monthLabel].updatedAt = new Date().toISOString();
  programIndex[monthLabel].sheetsCount = programIndex[monthLabel].programs.length;

  // Clean expired session programs
  cleanExpiredProgramSessions(programIndex);

  fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

  const totalSlides = programItem.images ? programItem.images.length : 1;
  const successMessage = isAppended
    ? `Berhasil menambahkan slide ke-${totalSlides} untuk Program "${sheetName}" (${monthLabel}) ke Cloudinary!`
    : `Berhasil mengunggah Gambar Program "${sheetName}" (${monthLabel}) ke Cloudinary!`;

  return ({
    success: true,
    message: successMessage,
    monthLabel,
    program: programItem,
    isAppended,
    totalSlides,
    newImageItem,
    scannedLink,
    detailUrl,
    imageUrl,
    sheetsCount: programIndex[monthLabel].programs.length,
    programs: programIndex[monthLabel].programs
  });
}

// Dipindah dari handler server.js baris 2469-2500
function listPrograms({ query }) {
  const programIndex = getOrInitializeProgramIndex();

  const cleanMonthsData = {};
  Object.keys(programIndex).forEach(k => {
    if (!k.startsWith('__')) {
      cleanMonthsData[k] = programIndex[k];
    }
  });

  const requestedMonth = query.month;
  if (requestedMonth) {
    const matchedKey = findMonthKey(cleanMonthsData, requestedMonth);
    if (matchedKey && cleanMonthsData[matchedKey]) {
      return (cleanMonthsData[matchedKey]);
    } else {
      return ({
        monthLabel: requestedMonth,
        updatedAt: new Date().toISOString(),
        sheetsCount: 0,
        programs: []
      });
    }
  }

  const defaultAgustusKey = findMonthKey(cleanMonthsData, 'Agustus 2026');
  return ({
    monthsData: cleanMonthsData,
    month: 'Agustus 2026',
    programs: defaultAgustusKey ? cleanMonthsData[defaultAgustusKey].programs : []
  });
}

// Dipindah dari handler server.js baris 2503-2640
function deletePrograms({ body, query }) {
  const rawMonthLabel = body?.monthLabel || query?.monthLabel;
  const programName = body?.programName || query?.programName;
  const imageId = body?.imageId || query?.imageId;

  if (!rawMonthLabel) {
    throw new AppError(400, { error: 'Parameter monthLabel wajib diisi.' });
  }

  const indexPath = path.join(programsDir, 'index.json');
  const programIndex = getOrInitializeProgramIndex();

  const monthKey = findMonthKey(programIndex, rawMonthLabel);

  if (!monthKey || !programIndex[monthKey] || !programIndex[monthKey].programs || programIndex[monthKey].programs.length === 0) {
    throw new AppError(404, { error: `Data program untuk periode "${rawMonthLabel}" tidak ditemukan.` });
  }

  const monthLabel = programIndex[monthKey].monthLabel || monthKey;
  const monthSlug = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const physicalExcelFile = path.join(programsDir, `program_${monthSlug}.xlsx`);

  // Check if programName requested is ALL or emoji option
  const isDeleteAll = !programName || programName === 'ALL' || programName.trim() === '' || programName.startsWith('💥');

  if (!isDeleteAll) {
    const targetName = programName.trim().replace(/\s+/g, ' ').toLowerCase();

    // If specific imageId is requested for deletion within this program
    if (imageId) {
      const targetProg = programIndex[monthKey].programs.find(p => {
        const name = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
        return name === targetName;
      });

      if (!targetProg) {
        throw new AppError(404, { error: `Program "${programName}" tidak ditemukan pada periode ${monthLabel}.` });
      }

      if (Array.isArray(targetProg.images) && targetProg.images.length > 0) {
        const initialImgCount = targetProg.images.length;
        targetProg.images = targetProg.images.filter(img => img.id !== imageId && img.imageUrl !== imageId);

        if (targetProg.images.length === initialImgCount) {
          throw new AppError(404, { error: `Slide gambar tidak ditemukan dalam program "${programName}".` });
        }

        if (targetProg.images.length > 0) {
          targetProg.imageUrl = targetProg.images[0].imageUrl;
          targetProg.detailUrl = targetProg.images[0].detailUrl;
          targetProg.scannedLink = targetProg.images[0].scannedLink;
          targetProg.updatedAt = new Date().toISOString();
        } else {
          // If all slides are deleted, remove program from programs array
          programIndex[monthKey].programs = programIndex[monthKey].programs.filter(p => {
            const name = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
            return name !== targetName;
          });
          programIndex[monthKey].sheetsCount = programIndex[monthKey].programs.length;
        }

        programIndex[monthKey].updatedAt = new Date().toISOString();
        fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

        return ({
          success: true,
          message: `Berhasil menghapus slide gambar dari program "${programName}".`,
          monthLabel,
          program: targetProg,
          remainingSlides: targetProg.images ? targetProg.images.length : 0
        });
      }
    }

    const initialCount = programIndex[monthKey].programs.length;

    programIndex[monthKey].programs = programIndex[monthKey].programs.filter(p => {
      const name = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
      return name !== targetName;
    });

    const newCount = programIndex[monthKey].programs.length;
    if (initialCount === newCount) {
      throw new AppError(404, { error: `Program "${programName}" tidak ditemukan pada periode ${monthLabel}.` });
    }

    programIndex[monthKey].sheetsCount = newCount;
    programIndex[monthKey].updatedAt = new Date().toISOString();

    // If programs array is now empty, remove month key entirely
    if (newCount === 0) {
      delete programIndex[monthKey];
      if (monthLabel.toLowerCase().includes('agustus 2026')) {
        programIndex['__deleted_Agustus_2026'] = true;
      }
      if (fs.existsSync(physicalExcelFile)) {
        try { fs.unlinkSync(physicalExcelFile); } catch {}
      }
    }

    fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

    return ({
      success: true,
      message: `Berhasil menghapus program "${programName}" dari periode ${monthLabel}.`,
      monthLabel,
      remainingProgramsCount: newCount
    });
  } else {
    // Deleting all programs for the month
    delete programIndex[monthKey];
    if (monthLabel.toLowerCase().includes('agustus 2026')) {
      programIndex['__deleted_Agustus_2026'] = true;
    }

    if (fs.existsSync(physicalExcelFile)) {
      try {
        fs.unlinkSync(physicalExcelFile);
        console.log(`  └─ Deleted physical Excel file: ${physicalExcelFile}`);
      } catch (e) {
        console.error(`  └─ Failed to delete physical Excel file:`, e.message);
      }
    }

    fs.writeFileSync(indexPath, JSON.stringify(programIndex, null, 2), 'utf8');

    return ({
      success: true,
      message: `Berhasil menghapus seluruh program terdaftar pada periode ${monthLabel}.`,
      monthLabel
    });
  }
}

module.exports = { parseProgramExcelFile, cleanExpiredProgramSessions, findMonthKey, getOrInitializeProgramIndex, uploadProgramImage, listPrograms, deletePrograms };
