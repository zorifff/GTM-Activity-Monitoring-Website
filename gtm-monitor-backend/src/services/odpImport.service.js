// ETL Excel Data ODP: baca file → mapping in-memory → batch insert/update → bersihkan ODP lama → OCC & GAP WoW per branch
const xlsx = require('xlsx');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { getOdpCoords } = require('../utils/geo');

// Dipindah dari handler server.js baris 1485-2045
async function importOdpExcel({ file }) {
    if (!file || !file.buffer) {
      throw new AppError(400, { error: 'No file uploaded' });
    }

  const startTime = Date.now();
  console.log('📦 Memulai import Excel dengan In-Memory Mapping & Batch Processing...');

  // ─── PETA & NORMALISASI WOK → BRANCH YANG BENAR (WOK menentukan Branch) ───
  function getCorrectBranchForWok(rawWok) {
    if (!rawWok) return null;
    const clean = rawWok.toString().trim().toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

    if (clean.includes('KEBUMEN')) return 'MAGELANG';
    if (clean.includes('MAGELANG') || clean.includes('TEMANGGUNG')) return 'MAGELANG';

    if (clean.includes('BATANG')) return 'PEKALONGAN';
    if (clean.includes('PEMALANG') || clean.includes('PURBALINGGA')) return 'PEKALONGAN';
    if (clean.includes('TEGAL') || clean.includes('BREBES')) return 'PEKALONGAN';

    if (clean.includes('CILACAP') || clean.includes('BANYUMAS')) return 'PURWOKERTO';
    if (clean.includes('WONOSOBO') || clean.includes('BANJARNEGARA')) return 'PURWOKERTO';

    if (clean.includes('DEMAK')) return 'SEMARANG';
    if (clean.includes('JEPARA') || clean.includes('KUDUS') || clean.includes('PATI')) return 'SEMARANG';
    if (clean.includes('SEMARANG')) return 'SEMARANG';

    if (clean.includes('BOYOLALI')) return 'SURAKARTA';
    if (clean.includes('SRAGEN')) return 'SURAKARTA';
    if (clean.includes('SURAKARTA') || clean.includes('SOLO')) return 'SURAKARTA';

    if (clean.includes('YOGYA') || clean.includes('JOGJA') || clean.includes('YOGYAKARTA') || clean.includes('DIY')) return 'YOGYAKARTA';

    return null;
  }

  // Read from buffer (memoryStorage)
  const workbook = xlsx.read(file.buffer, { type: 'buffer' });

  let totalRowsProcessed = 0;
  let projectsCreated = 0;
  let odpsUnchanged = 0;
  let wokBranchCorrections = 0;
  const branchesFound = new Set();
  const seenOdpKeysInCurrentImport = new Set();

  // ─── 1. IN-MEMORY MAPPING (Load semua data dari DB ke RAM sekaligus) ───
  const allDbBranches = await prisma.branch.findMany();
  const branchMap = new Map(); // uppercase name -> branch object
  for (const b of allDbBranches) {
    branchMap.set(b.name.toUpperCase(), b);
  }

  const allProjects = await prisma.project.findMany({
    include: { odps: true }
  });
  const projectMap = new Map(); // `${branchId}||${projectName.toUpperCase()}` -> project object
  const odpMap = new Map(); // odpName.toUpperCase() -> odp object

  for (const p of allProjects) {
    projectMap.set(`${p.branchId}||${p.name.toUpperCase()}`, p);
    for (const o of p.odps) {
      odpMap.set(o.odp.toUpperCase(), o);
    }
  }

  const projectsToCreate = [];
  const odpsToCreate = [];
  const odpsToUpdate = [];

  // Storage untuk nilai OCC BRANCH dan GAP WOW per branch dari Excel
  const branchOccFromExcel = {}; // branchName -> { occRate, gapWoW } (first occurrence)
  let jatengDiySummary = null; // Baris summary "Jateng DIY"

  // ─── 2. PROCESS ROWS IN RAM (Sangat cepat & 100% akurat) ───
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to 2D array to find the true header row (ignoring titles)
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = 0;
    let headers = [];

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const rowStrings = (rawData[i] || []).map(c => c ? c.toString().trim().toUpperCase() : '');
      if (rowStrings.some(c => c.includes('PROJECT') || c.includes('PROYEK') || c.includes('BRANCH') || c.includes('CABANG'))) {
        headerRowIndex = i;
        headers = rowStrings;
        break;
      }
    }

    if (headers.length === 0) continue; // Skip sheet if no valid headers found

    // Build dynamic column index map
    const colMap = {};
    headers.forEach((h, idx) => { if (h) colMap[h] = idx; });

    // Map rows based on the detected headers
    const data = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const rowObj = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) {
          rowObj[headers[j]] = rawData[i][j];
          if (rawData[i][j] !== undefined && rawData[i][j] !== null && rawData[i][j] !== '') hasData = true;
        }
      }
      if (hasData) data.push(rowObj);
    }

    for (const row of data) {
      // Headers are already normalized (uppercase & trimmed)
      const normRow = row;

      // Helper untuk mencari kolom dengan pencarian kata kunci yang fleksibel
      const findValue = (rowObj, possibleKeys, substringKeywords) => {
        for (const key of possibleKeys) {
          if (rowObj[key] !== undefined && rowObj[key] !== null) return rowObj[key];
        }
        if (substringKeywords) {
          for (const [key, val] of Object.entries(rowObj)) {
            for (const kw of substringKeywords) {
              if (key.includes(kw) && val !== undefined && val !== null) return val;
            }
          }
        }
        return undefined;
      };

      const rawBranch = findValue(normRow, ['TELKOMSEL BRANCH', 'TELKOMSEL', 'BRANCH', 'CABANG', 'NAMA BRANCH', 'NAMA CABANG', 'AREA'], ['BRANCH', 'CABANG', 'TELKOMSEL']) || '';
      const rawProject = findValue(normRow, ['NAMA PROYEK', 'PROJECT', 'PROYEK', 'NAMA PROJECT', 'ID PROJECT'], ['PROJECT', 'PROYEK']) || '';
      const rawWok = findValue(normRow, ['BWOK', 'WOK', 'WILAYAH', 'KOTA'], ['WOK', 'WILAYAH', 'BWOK']) || '-';
      const rawTypeDesign = findValue(normRow, ['TYPE DESIGN', 'DESIGN TYPE', 'TYPE', 'GREENFIELD/BROWNFIELD', 'GREENFIELD / BROWNFIELD', 'DESIGN'], ['DESIGN', 'GREENFIELD', 'BROWNFIELD']);

      let typeDesign = 'Greenfield';
      if (rawTypeDesign) {
        const strVal = rawTypeDesign.toString().toUpperCase();
        if (strVal.includes('BROWN')) typeDesign = 'Brownfield';
        else if (strVal.includes('GREEN')) typeDesign = 'Greenfield';
      }

      const rawStatus = findValue(normRow, ['OCC 2', 'STATUS ODP', 'OCC STATUS', 'WARNA ODP', 'COLOR', 'WARNA'], ['WARNA', 'OCC 2']);
      let excelOccStatus = null;
      if (rawStatus) {
        const strS = rawStatus.toString().toUpperCase();
        if (strS.includes('BLACK') || strS.includes('HITAM')) excelOccStatus = 'BLACK';
        else if (strS.includes('GREEN') || strS.includes('HIJAU')) excelOccStatus = 'GREEN';
        else if (strS.includes('YELLOW') || strS.includes('KUNING')) excelOccStatus = 'YELLOW';
        else if (strS.includes('ORANGE') || strS.includes('JINGGA')) excelOccStatus = 'ORANGE';
        else if (strS.includes('RED') || strS.includes('MERAH')) excelOccStatus = 'RED';
      }

      const rawLatVal = findValue(normRow, ['LATITUDE', 'LAT', 'KORDINAT LAT', 'Y'], ['LATITUDE', 'LAT']);
      const rawLonVal = findValue(normRow, ['LONGITUDE', 'LON', 'LONG', 'KORDINAT LON', 'X'], ['LONGITUDE', 'LON', 'LONG']);
      const parsedLat = parseFloat(rawLatVal);
      const parsedLon = parseFloat(rawLonVal);
      const hasExplicitCoords = !isNaN(parsedLat) && !isNaN(parsedLon);

      const rawOdp = findValue(normRow, ['ODP NAME', 'ID ODP', 'NAMA ODP', 'ODP ID'], ['ODP NAME', 'ID ODP']);
      const jumlahOdp = parseInt(findValue(normRow, ['JUMLAH ODP', 'ODP COUNT', 'TOTAL ODP'], ['JUMLAH ODP']) || 1) || 1;

      const total = parseInt(findValue(normRow, ['PORT', 'TOTAL PORT', 'IS TOTALIUM', 'TOTALIUM', 'TOTAL', 'KAPASITAS'], ['TOTAL']) || 0) || 0;
      const used = parseInt(findValue(normRow, ['USED', 'USED IUM', 'TERPAKAI', 'PORT USED'], ['USED', 'TERPAKAI']) || 0) || 0;

      const avaiVal = findValue(normRow, ['AVAI IUM', 'AVAI', 'AVAILABLE', 'TERSEDIA', 'PORT AVAI'], ['AVAI', 'AVAILABLE']);
      // FIX: Hapus Math.max(0,...) — ODP over-subscribed (used > total) boleh punya avai negatif, sesuai Excel
      // Jika kolom AVAI ada → pakai langsung (termasuk nilai negatif seperti -7, -1)
      // Jika kolom AVAI tidak ada → hitung total - used (TANPA Math.max agar nilai negatif tidak di-clamp ke 0)
      const avai = (avaiVal !== undefined && avaiVal !== null) ? (parseInt(avaiVal) || 0) : (total - used);


      // Ambil OCC BRANCH dan GAP WOW dari kolom Excel
      const rawOccBranch = findValue(normRow, ['OCC BRANCH'], ['OCC BRANCH']);
      const rawGapWoW = findValue(normRow, ['GAP WOW', 'GAP WOW '], ['GAP WOW']);

      if (!rawBranch) continue;

      // ─── TANGKAP BARIS SUMMARY "JATENG DIY" ───
      if (rawBranch.toString().trim().toUpperCase().includes('JATENG') || rawBranch.toString().trim().toUpperCase() === 'JATENG DIY') {
        jatengDiySummary = {
          occRate: parseFloat(rawOccBranch) || null,
          available: parseInt(avaiVal) || null,
          used: parseInt(findValue(normRow, ['USED'], ['USED'])) || null,
          total: parseInt(findValue(normRow, ['TOTAL'], ['TOTAL'])) || null,
          gapWoW: parseFloat(rawGapWoW) || null,
        };
        console.log('📊 Jateng DIY Summary Row ditemukan:', jatengDiySummary);
        continue;
      }

      if (!rawProject) continue;

      // ─── WOK-BASED BRANCH CORRECTION ───
      // Prioritas: WOK menentukan Branch yang benar
      const wokNameUpper = rawWok.toString().trim().toUpperCase();
      let branchName = rawBranch.toString().trim().toUpperCase();

      // Alias normalisasi branch name
      if (branchName === 'JOGJA' || branchName === 'YOGYA' || branchName === 'DIY') branchName = 'YOGYAKARTA';
      if (branchName === 'SOLO') branchName = 'SURAKARTA';
      if (branchName === 'PWK') branchName = 'PURWOKERTO';
      if (branchName === 'PKL') branchName = 'PEKALONGAN';
      if (branchName === 'SMG') branchName = 'SEMARANG';
      if (branchName === 'MGL') branchName = 'MAGELANG';

      // Koreksi Branch berdasarkan WOK (fleksibel untuk Yogya 2, Yogya2, dll.)
      const correctBranch = getCorrectBranchForWok(rawWok);
      if (correctBranch && correctBranch !== branchName) {
        console.log(`🔧 WOK Correction: "${rawOdp || rawProject}" Branch ${branchName} → ${correctBranch} (WOK: ${wokNameUpper})`);
        branchName = correctBranch;
        wokBranchCorrections++;
      }

      // Simpan OCC BRANCH dan GAP WOW per Branch ORIGINAL dari Excel (sebelum WOK correction)
      const originalBranchForOcc = rawBranch.toString().trim().toUpperCase();
      let normalizedOriginalBranch = originalBranchForOcc;
      if (normalizedOriginalBranch === 'JOGJA' || normalizedOriginalBranch === 'YOGYA' || normalizedOriginalBranch === 'DIY') normalizedOriginalBranch = 'YOGYAKARTA';
      if (normalizedOriginalBranch === 'SOLO') normalizedOriginalBranch = 'SURAKARTA';
      if (normalizedOriginalBranch === 'PWK') normalizedOriginalBranch = 'PURWOKERTO';
      if (normalizedOriginalBranch === 'PKL') normalizedOriginalBranch = 'PEKALONGAN';
      if (normalizedOriginalBranch === 'SMG') normalizedOriginalBranch = 'SEMARANG';
      if (normalizedOriginalBranch === 'MGL') normalizedOriginalBranch = 'MAGELANG';

      if (rawOccBranch !== undefined && rawOccBranch !== null && rawOccBranch !== '') {
        if (!branchOccFromExcel[normalizedOriginalBranch]) {
          branchOccFromExcel[normalizedOriginalBranch] = {
            occRate: parseFloat(rawOccBranch) || 0,
            gapWoW: parseFloat(rawGapWoW) || 0,
          };
        }
      }
      if (rawGapWoW !== undefined && rawGapWoW !== null && rawGapWoW !== '') {
        if (!branchOccFromExcel[normalizedOriginalBranch]) {
          branchOccFromExcel[normalizedOriginalBranch] = {
            occRate: parseFloat(rawOccBranch) || 0,
            gapWoW: parseFloat(rawGapWoW) || 0,
          };
        } else if (!branchOccFromExcel[normalizedOriginalBranch].gapWoW) {
          branchOccFromExcel[normalizedOriginalBranch].gapWoW = parseFloat(rawGapWoW) || 0;
        }
      }

      // Get or create branch
      let branch = branchMap.get(branchName);
      if (!branch) {
        branch = await prisma.branch.upsert({
          where: { name: branchName },
          update: {},
          create: { name: branchName }
        });
        branchMap.set(branchName, branch);
      }

      // Find or create Project
      let projectName = rawProject.toString().trim();
      const wokName = rawWok.toString().trim();

      const projectKey = `${branch.id}||${projectName.toUpperCase()}`;
      let project = projectMap.get(projectKey);

      if (!project) {
        const newProjectId = crypto.randomUUID();
        project = {
          id: newProjectId,
          name: projectName,
          wok: wokName,
          typeDesign: typeDesign,
          branchId: branch.id
        };
        projectsToCreate.push(project);
        projectMap.set(projectKey, project);
        projectsCreated++;
      }

      // Processing ODPs (Either explicit ODP Name or Synthetic ODPs based on Jumlah ODP)
      const countToCreate = rawOdp ? 1 : Math.max(1, jumlahOdp);
      const baseSubTotal = Math.floor(total / countToCreate);
      const baseSubUsed = Math.floor(used / countToCreate);
      // FIX: Split avai dari Excel secara proporsional, bukan recalculate sebagai total-used
      const baseSubAvai = Math.floor(avai / countToCreate);

      let remainingTotal = total;
      let remainingUsed = used;
      let remainingAvai = avai;

      for (let i = 1; i <= countToCreate; i++) {
        let rawOdpStr = rawOdp ? rawOdp.toString().trim() : '';
        let odpName = rawOdpStr 
          ? rawOdpStr 
          : `${projectName}-${wokName !== '-' ? wokName : 'WOK'}-${totalRowsProcessed + 1}-${i}`;

        let cleanOdpKey = odpName.toUpperCase();

        // Jika nama ODP ini sudah pernah diproses di baris sebelumnya dalam file Excel yang sama (duplikat nama ODP):
        // Tambahkan suffix unik (#row) agar data port dari kedua baris tersebut TIDAK saling tertimpa
        if (rawOdpStr && seenOdpKeysInCurrentImport.has(cleanOdpKey)) {
          odpName = `${rawOdpStr} (#${totalRowsProcessed + 1})`;
          cleanOdpKey = odpName.toUpperCase();
        }
        seenOdpKeysInCurrentImport.add(cleanOdpKey);

        let subTotal = baseSubTotal;
        let subUsed = baseSubUsed;
        let subAvai = baseSubAvai;

        // ODP terakhir mendapat sisa pembagian agar total presisi
        if (i === countToCreate) {
          subTotal = remainingTotal;
          subUsed = remainingUsed;
          subAvai = remainingAvai; // FIX: gunakan sisa avai dari Excel, bukan recalculate
        } else {
          remainingTotal -= subTotal;
          remainingUsed -= subUsed;
          remainingAvai -= baseSubAvai;
        }

        const existingOdp = odpMap.get(cleanOdpKey);
        const coords = hasExplicitCoords 
          ? { lat: parsedLat, lon: parsedLon }
          : getOdpCoords(odpName, branch.name, null, null);

        if (existingOdp) {
          if (existingOdp.id && existingOdp.id.startsWith('temp-')) {
            const target = odpsToCreate.find(item => item.odp.toUpperCase() === cleanOdpKey);
            if (target) {
              target.avai = subAvai;
              target.used = subUsed;
              target.total = subTotal;
              target.projectId = project.id;
              if (hasExplicitCoords) {
                target.lat = parsedLat;
                target.lon = parsedLon;
              }
              if (excelOccStatus) target.occStatus = excelOccStatus;
            }
          } else if (
            existingOdp.avai !== subAvai ||
            existingOdp.used !== subUsed ||
            existingOdp.total !== subTotal ||
            existingOdp.projectId !== project.id
          ) {
            const updatePayload = {
              id: existingOdp.id,
              odp: odpName,
              avai: subAvai,
              used: subUsed,
              total: subTotal,
              projectId: project.id
            };
            if (hasExplicitCoords) {
              updatePayload.lat = parsedLat;
              updatePayload.lon = parsedLon;
            }
            if (excelOccStatus) updatePayload.occStatus = excelOccStatus;

            odpsToUpdate.push(updatePayload);
            existingOdp.avai = subAvai;
            existingOdp.used = subUsed;
            existingOdp.total = subTotal;
            existingOdp.projectId = project.id;
            if (hasExplicitCoords) {
              existingOdp.lat = parsedLat;
              existingOdp.lon = parsedLon;
            }
            if (excelOccStatus) existingOdp.occStatus = excelOccStatus;
          } else {
            odpsUnchanged++;
          }
        } else {
          odpsToCreate.push({
            odp: odpName,
            avai: subAvai,
            used: subUsed,
            total: subTotal,
            lat: coords.lat,
            lon: coords.lon,
            occStatus: excelOccStatus || 'GREEN',
            projectId: project.id
          });
          odpMap.set(cleanOdpKey, {
            id: 'temp-' + odpsToCreate.length,
            odp: odpName,
            avai: subAvai,
            used: subUsed,
            total: subTotal,
            lat: coords.lat,
            lon: coords.lon,
            projectId: project.id
          });
        }
      }

      totalRowsProcessed++;
      branchesFound.add(branch.name);
    }
  }

  // â”€â”€â”€ 3. BATCH EXECUTION (Kirim ke DB sekaligus dengan aman) â”€â”€â”€
  console.log(`âš¡ RAM Processing selesai. Menyiapkan Batch DB: ${projectsToCreate.length} project, ${odpsToCreate.length} ODP baru, ${odpsToUpdate.length} update. WOK corrections: ${wokBranchCorrections}.`);

  // Batch Insert Project Baru
  if (projectsToCreate.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < projectsToCreate.length; i += BATCH_SIZE) {
      const batch = projectsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.project.createMany({
        data: batch,
        skipDuplicates: true
      });
    }
  }

  // Batch Insert ODP Baru (dalam grup 500 baris)
  if (odpsToCreate.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < odpsToCreate.length; i += BATCH_SIZE) {
      const batch = odpsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.odp.createMany({
        data: batch,
        skipDuplicates: true
      });
    }
  }

  // Batch Update ODP yang Berubah (diproses paralel 50 request serentak)
  if (odpsToUpdate.length > 0) {
    const CONCURRENCY = 50;
    for (let i = 0; i < odpsToUpdate.length; i += CONCURRENCY) {
      const chunk = odpsToUpdate.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(item => 
          prisma.odp.update({
            where: { id: item.id },
            data: {
              avai: item.avai,
              used: item.used,
              total: item.total,
              projectId: item.projectId,
              ...(item.lat !== undefined ? { lat: item.lat, lon: item.lon } : {}),
              ...(item.occStatus ? { occStatus: item.occStatus } : {})
            }
          }).catch(err => console.error(`Gagal update ODP ${item.odp}:`, err.message))
        )
      );
    }
  }

  // ——— 4. STALE ODP CLEANUP (Hapus ODP lama yang tidak ada di file update baru agar statistik 100% presisi) ———
  // FIX: Gunakan seenOdpKeysInCurrentImport — berisi TEPAT semua ODP yang dibaca dari file Excel terbaru.
  const processedOdpNames = seenOdpKeysInCurrentImport;
  const allDbOdps = await prisma.odp.findMany({ select: { id: true, odp: true } });
  const staleOdpIds = allDbOdps
    .filter(o => !processedOdpNames.has(o.odp.toUpperCase()))
    .map(o => o.id);

  if (staleOdpIds.length > 0) {
    console.log(`🧹 Membersihkan ${staleOdpIds.length} ODP lama yang tidak ada di file Excel terbaru...`);
    for (let i = 0; i < staleOdpIds.length; i += 500) {
      await prisma.odp.deleteMany({
        where: { id: { in: staleOdpIds.slice(i, i + 500) } }
      });
    }
  }

  // Hapus proyek kosong tanpa ODP
  await prisma.project.deleteMany({
    where: { odps: { none: {} } }
  });

  // ─── 5. SIMPAN NILAI OCC BRANCH & GAP WOW PER BRANCH KE DATABASE ───
  console.log('📊 Menyimpan OCC BRANCH & GAP WOW per branch...');
  const allBranchesInDb = await prisma.branch.findMany();
  for (const b of allBranchesInDb) {
    const bUpper = b.name.toUpperCase();
    const excelVals = branchOccFromExcel[bUpper];

    const finalOccRate = (excelVals && excelVals.occRate !== undefined && excelVals.occRate !== null && excelVals.occRate !== 0)
      ? excelVals.occRate
      : b.occRate;

    // Ambil nilai raw GAP WOW dari file Excel yang baru saja di-upload
    const newRawGap = (excelVals && excelVals.gapWoW !== undefined && excelVals.gapWoW !== null && excelVals.gapWoW !== 0)
      ? excelVals.gapWoW
      : null;

    let finalGapWoWDelta = b.gapWoW; // Fallback jika tidak ada gap di excel

    if (newRawGap !== null) {
      // Kolom Gap WoW di Excel sudah berisi nilai bersih kenaikan/penurunan WoW
      finalGapWoWDelta = newRawGap;
    }

    await prisma.branch.update({
      where: { id: b.id },
      data: {
        occRate: finalOccRate,
        gapWoW: finalGapWoWDelta,
      }
    });
    console.log(`  ${bUpper}: OCC=${finalOccRate ? (finalOccRate * 100).toFixed(1) + '%' : 'N/A'} GAP_DELTA=${finalGapWoWDelta !== null ? (finalGapWoWDelta * 100).toFixed(2) + '%' : '0%'}`);
  }

  // ─── 6. SIMPAN SUMMARY JATENG DIY KE ImportMeta ───
  if (jatengDiySummary) {

    await prisma.importMeta.upsert({
      where: { key: 'jateng_diy_summary' },
      update: {
        occRate: jatengDiySummary.occRate,
        available: jatengDiySummary.available,
        used: jatengDiySummary.used,
        total: jatengDiySummary.total,
        gapWoW: jatengDiySummary.gapWoW,
      },
      create: {
        key: 'jateng_diy_summary',
        occRate: jatengDiySummary.occRate,
        available: jatengDiySummary.available,
        used: jatengDiySummary.used,
        total: jatengDiySummary.total,
        gapWoW: jatengDiySummary.gapWoW,
      }
    });
    console.log('ðŸ“Š Jateng DIY Summary disimpan ke ImportMeta.');
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`âœ… Excel Import selesai dalam ${durationSec} detik! (Processed ${totalRowsProcessed} rows across ${branchesFound.size} branches, ${wokBranchCorrections} WOK corrections)`);

  return ({ 
    success: true, 
    message: `Database berhasil diperbarui dalam ${durationSec} detik! (${totalRowsProcessed} baris diproses: ${odpsToCreate.length} baru, ${odpsToUpdate.length} diperbarui, ${staleOdpIds.length} dibersihkan, ${wokBranchCorrections} WOK -> Branch dikoreksi)`,
    stats: {
      durationSec,
      rows: totalRowsProcessed,
      projectsCreated,
      odpsCreated: odpsToCreate.length,
      odpsUpdated: odpsToUpdate.length,
      odpsRemoved: staleOdpIds.length,
      odpsUnchanged,
      wokBranchCorrections,
      branches: Array.from(branchesFound)
    }
  });
}

module.exports = { importOdpExcel };
