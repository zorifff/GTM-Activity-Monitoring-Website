const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const AppError = require('../utils/AppError');
const { PAIRING_DIR } = require('../config/paths');

// --- TSEL ONE PAIRING STORAGE & FAST LOOKUP SEARCH SYSTEM ---

const pairingDir = PAIRING_DIR;
if (!fs.existsSync(pairingDir)) {
  try { fs.mkdirSync(pairingDir, { recursive: true }); } catch {}
}

let cachedPairingRecords = null;
let pairingLookupMap = null;

function formatExcelDate(val) {
  if (val === undefined || val === null || val === '' || val === '\\N' || val === 'N/A') return '';
  const num = Number(val);
  if (!isNaN(num) && num > 25000 && num < 70000) {
    try {
      const dateObj = xlsx.SSF.parse_date_code(num);
      if (dateObj) {
        const yyyy = dateObj.y;
        const mm = String(dateObj.m).padStart(2, '0');
        const dd = String(dateObj.d).padStart(2, '0');
        const hh = String(dateObj.H || 0).padStart(2, '0');
        const min = String(dateObj.M || 0).padStart(2, '0');
        const ss = String(dateObj.S || 0).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
      }
    } catch {}
  }
  return String(val).replace(/^\\N$/, '').trim();
}

function parsePairingExcelFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames.includes('Unstacked_Pairing_Data')
      ? 'Unstacked_Pairing_Data'
      : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return null;

    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    if (!rawRows || rawRows.length === 0) return null;

    const parsedRecords = rawRows.map(row => {
      const getValRaw = (keys) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null) return row[k];
        }
        return '';
      };

      const getValStr = (keys) => {
        const val = getValRaw(keys);
        if (val === undefined || val === null || val === '\\N') return '';
        return String(val).trim();
      };

      const getValDate = (keys) => {
        const val = getValRaw(keys);
        return formatExcelDate(val);
      };

      return {
        bb_id: getValStr(['bb_id', 'BB_ID', 'bb id', 'BB ID']),
        msisdn_parent: getValStr(['msisdn_parent', 'MSISDN_PARENT', 'msisdn parent']),
        msisdn_child1: getValStr(['msisdn_child1', 'MSISDN_CHILD1', 'msisdn_child', 'MSISDN_CHILD']),
        msisdn_child2: getValStr(['msisdn_child2', 'MSISDN_CHILD2']),
        msisdn_child3: getValStr(['msisdn_child3', 'MSISDN_CHILD3']),
        msisdn_child4: getValStr(['msisdn_child4', 'MSISDN_CHILD4']),
        msisdn_child5: getValStr(['msisdn_child5', 'MSISDN_CHILD5']),
        msisdn_child6: getValStr(['msisdn_child6', 'MSISDN_CHILD6']),
        product_commercial_name: getValStr(['product_commercial_name', 'PRODUCT_COMMERCIAL_NAME']),
        activation_date_ih: getValDate(['activation_date_ih', 'ACTIVATION_DATE_IH']),
        activation_date_parent: getValDate(['activation_date_parent', 'ACTIVATION_DATE_PARENT']),
        activation_date_child1: getValDate(['activation_date_child1', 'ACTIVATION_DATE_CHILD1', 'activation_date_child', 'ACTIVATION_DATE_CHILD']),
        activation_date_child2: getValDate(['activation_date_child2', 'ACTIVATION_DATE_CHILD2']),
        activation_date_child3: getValDate(['activation_date_child3', 'ACTIVATION_DATE_CHILD3']),
        activation_date_child4: getValDate(['activation_date_child4', 'ACTIVATION_DATE_CHILD4']),
        activation_date_child5: getValDate(['activation_date_child5', 'ACTIVATION_DATE_CHILD5']),
        activation_date_child6: getValDate(['activation_date_child6', 'ACTIVATION_DATE_CHILD6']),
        city: getValStr(['city', 'CITY', 'kota', 'KOTA']),
        region: getValStr(['region', 'REGION']),
        area: getValStr(['area', 'AREA']),
        cluster: getValStr(['cluster', 'CLUSTER']),
        sto: getValStr(['sto', 'STO']),
        tsel_id_ih: getValStr(['tsel_id_ih', 'TSEL_ID_IH']),
        tsel_id_mobile_parent: getValStr(['tsel_id_mobile_parent', 'TSEL_ID_MOBILE_PARENT']),
        tsel_id_mobile_child1: getValStr(['tsel_id_mobile_child1', 'TSEL_ID_MOBILE_CHILD1', 'tsel_id_mobile_child', 'TSEL_ID_MOBILE_CHILD']),
        tsel_id_mobile_child2: getValStr(['tsel_id_mobile_child2', 'TSEL_ID_MOBILE_CHILD2']),
        tsel_id_mobile_child3: getValStr(['tsel_id_mobile_child3', 'TSEL_ID_MOBILE_CHILD3']),
        tsel_id_mobile_child4: getValStr(['tsel_id_mobile_child4', 'TSEL_ID_MOBILE_CHILD4']),
        tsel_id_mobile_child5: getValStr(['tsel_id_mobile_child5', 'TSEL_ID_MOBILE_CHILD5']),
        tsel_id_mobile_child6: getValStr(['tsel_id_mobile_child6', 'TSEL_ID_MOBILE_CHILD6']),
        order_id: getValStr(['order_id', 'ORDER_ID', 'Order ID', 'order id']),
        source_perdana_parent: getValStr(['Source Perdana Parent', 'source_perdana_parent', 'SOURCE_PERDANA_PARENT']),
        source_perdana_child1: getValStr(['Source Perdana Child1', 'source_perdana_child1', 'SOURCE_PERDANA_CHILD1', 'Source Perdana Child', 'source_perdana_child']),
        source_perdana_child2: getValStr(['Source Perdana Child2', 'source_perdana_child2', 'SOURCE_PERDANA_CHILD2']),
        source_perdana_child3: getValStr(['Source Perdana Child3', 'source_perdana_child3', 'SOURCE_PERDANA_CHILD3']),
        source_perdana_child4: getValStr(['Source Perdana Child4', 'source_perdana_child4', 'SOURCE_PERDANA_CHILD4']),
        source_perdana_child5: getValStr(['Source Perdana Child5', 'source_perdana_child5', 'SOURCE_PERDANA_CHILD5']),
        source_perdana_child6: getValStr(['Source Perdana Child6', 'source_perdana_child6', 'SOURCE_PERDANA_CHILD6'])
      };
    });

    return parsedRecords;
  } catch (err) {
    console.error('Error parsing pairing excel file:', err);
    return null;
  }
}

function buildPairingLookupMap() {
  pairingLookupMap = new Map();
  if (!cachedPairingRecords) return;

  const addSingleKey = (key, idx) => {
    if (!key) return;
    const strKey = String(key).trim();
    if (strKey.length < 3) return;
    if (!pairingLookupMap.has(strKey)) {
      pairingLookupMap.set(strKey, []);
    }
    const arr = pairingLookupMap.get(strKey);
    if (!arr.includes(idx)) {
      arr.push(idx);
    }
  };

  const addMsisdnKeys = (val, idx) => {
    if (!val) return;
    const strVal = String(val).trim();
    if (strVal.length < 3) return;

    addSingleKey(strVal, idx);

    if (strVal.startsWith('628')) {
      const alias08 = '08' + strVal.slice(3);
      addSingleKey(alias08, idx);
    } else if (strVal.startsWith('08')) {
      const alias62 = '628' + strVal.slice(2);
      addSingleKey(alias62, idx);
    }
  };

  cachedPairingRecords.forEach((rec, idx) => {
    addSingleKey(rec.bb_id, idx);
    addSingleKey(rec.order_id, idx);

    addMsisdnKeys(rec.msisdn_parent, idx);
    addMsisdnKeys(rec.msisdn_child1, idx);
    addMsisdnKeys(rec.msisdn_child2, idx);
    addMsisdnKeys(rec.msisdn_child3, idx);
    addMsisdnKeys(rec.msisdn_child4, idx);
    addMsisdnKeys(rec.msisdn_child5, idx);
    addMsisdnKeys(rec.msisdn_child6, idx);
  });
}

function getPairingData() {
  if (cachedPairingRecords) return { records: cachedPairingRecords, lookupMap: pairingLookupMap };

  const jsonPath = path.join(pairingDir, 'records.json');
  const excelPath = path.join(pairingDir, 'tsel_one_pairing.xlsx');

  if (fs.existsSync(jsonPath)) {
    try {
      console.log('⚡ Loading Tsel One Pairing index from disk...');
      const start = Date.now();
      const raw = fs.readFileSync(jsonPath, 'utf8');
      cachedPairingRecords = JSON.parse(raw);

      // Auto upgrade cache if existing records.json lacks source_perdana_parent
      if (cachedPairingRecords.length > 0 && cachedPairingRecords[0].source_perdana_parent === undefined && fs.existsSync(excelPath)) {
        console.log('🔄 Upgrading pairing records cache to include Source Perdana fields...');
        const freshRecords = parsePairingExcelFile(excelPath);
        if (freshRecords && freshRecords.length > 0) {
          cachedPairingRecords = freshRecords;
          fs.writeFileSync(jsonPath, JSON.stringify(cachedPairingRecords));
          console.log(`✅ Cache upgraded with ${freshRecords.length} records.`);
        }
      }

      buildPairingLookupMap();
      console.log(`✅ Tsel One Pairing loaded: ${cachedPairingRecords.length} records in ${Date.now() - start}ms`);
      return { records: cachedPairingRecords, lookupMap: pairingLookupMap };
    } catch (e) {
      console.error('Failed to load pairing JSON cache:', e);
    }
  }
  return { records: [], lookupMap: new Map() };
}

function searchPairingData(query) {
  if (!query || typeof query !== 'string') return [];
  const cleanQ = query.trim();

  if (cleanQ.length < 6) return [];

  const { records, lookupMap } = getPairingData();
  if (!records || records.length === 0 || !lookupMap) return [];

  // Strict exact match from Map (O(1))
  if (lookupMap.has(cleanQ)) {
    const matchedIndices = lookupMap.get(cleanQ);
    return matchedIndices.map(i => records[i]);
  }

  // Alias lookup for MSISDN 08... <-> 628...
  if (cleanQ.startsWith('08')) {
    const alias62 = '628' + cleanQ.slice(2);
    if (lookupMap.has(alias62)) {
      const matchedIndices = lookupMap.get(alias62);
      return matchedIndices.map(i => records[i]);
    }
  } else if (cleanQ.startsWith('628')) {
    const alias08 = '08' + cleanQ.slice(3);
    if (lookupMap.has(alias08)) {
      const matchedIndices = lookupMap.get(alias08);
      return matchedIndices.map(i => records[i]);
    }
  }

  // Strict exact match requirement: NO substring/partial fallback!
  return [];
}

// Dipindah dari handler server.js baris 2873-2921
function uploadPairingExcel({ file }) {
  if (!file || !file.buffer) {
    throw new AppError(400, { error: 'Tidak ada file Excel pairing yang diunggah.' });
  }

  const targetPath = path.join(pairingDir, 'tsel_one_pairing.xlsx');
  fs.writeFileSync(targetPath, file.buffer);

  const records = parsePairingExcelFile(targetPath);
  if (!records || records.length === 0) {
    throw new AppError(400, { error: 'Gagal menguraikan file Excel pairing. Pastikan format tabel dan header sesuai.' });
  }

  const recordsJsonPath = path.join(pairingDir, 'records.json');
  fs.writeFileSync(recordsJsonPath, JSON.stringify(records), 'utf8');

  cachedPairingRecords = records;
  buildPairingLookupMap();

  const metaPath = path.join(pairingDir, 'meta.json');
  const meta = {
    updatedAt: new Date().toISOString(),
    totalRows: records.length,
    fileName: file.originalname
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  return ({
    success: true,
    message: `Berhasil mengimpor Data Tsel One Pairing! (${records.length.toLocaleString('id-ID')} baris terproses)`,
    totalRows: records.length,
    updatedAt: meta.updatedAt
  });
}

// Dipindah dari handler server.js baris 2924-2951
function searchPairing({ query }) {
  const q = query.q; // sudah divalidasi & digabung dari ?q= / ?query= oleh skema
  const cleanQ = String(q).trim();

  if (!cleanQ || cleanQ.length < 6) {
    throw new AppError(400, {
      success: false,
      error: 'Kata kunci terlalu umum. Masukkan nilai yang akurat dan lengkap (minimal 6 karakter).'
    });
  }

  const start = Date.now();
  const results = searchPairingData(cleanQ);
  const durationMs = Date.now() - start;

  return ({
    success: true,
    query: cleanQ,
    count: results.length,
    durationMs,
    results
  });
}

module.exports = { getPairingData, searchPairingData, uploadPairingExcel, searchPairing };
