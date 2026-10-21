// Tsel One Pairing: indeks pencarian O(1) (BB ID / Order ID / MSISDN, termasuk alias 08… ↔ 628…) disimpan di Redis
// sehingga semua instance server (PM2 cluster / beberapa pod) membaca indeks yang sama.
// Struktur Redis (awalan <QUEUE_PREFIX>:pairing):
//   :active                → versi indeks yang sedang dipakai
//   :v:<versi>:records     Hash  nomor baris → JSON record
//   :v:<versi>:lookup      Hash  kunci pencarian → "nomor,baris,..." (urutan sama seperti Map versi lama)
//   :meta                  JSON { updatedAt, totalRows, fileName, version }
// Upload baru dibangun di versi baru lalu `active` dipindah secara atomik (pencarian tidak pernah melihat indeks setengah jadi).
// File Excel sumber disimpan di object storage (pairing/<QUEUE_PREFIX>/) → indeks dapat dibangun ulang bila Redis kosong.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const AppError = require('../utils/AppError');
const { QUEUE_PREFIX } = require('../config/env');
const { PAIRING_DIR } = require('../config/paths');
const { getApiConnection } = require('../queues');
const { putObject, getObjectBuffer } = require('../lib/objectStorage');

const NS = `${QUEUE_PREFIX}:pairing`;
const ACTIVE_KEY = `${NS}:active`;
const META_KEY = `${NS}:meta`;
const recordsKey = (version) => `${NS}:v:${version}:records`;
const lookupKey = (version) => `${NS}:v:${version}:lookup`;
const SOURCE_KEY = `pairing/${QUEUE_PREFIX}/tsel_one_pairing.xlsx`;
const SOURCE_META_KEY = `pairing/${QUEUE_PREFIX}/meta.json`;
const WRITE_BATCH = 1000;      // field per HSET
const PIPELINE_BATCHES = 20;   // HSET per pipeline (±20.000 field per round-trip)

const SEARCH_UNAVAILABLE_MESSAGE = 'Layanan pencarian pairing sedang tidak aktif. Hubungi administrator sistem lalu coba lagi.';
const PARSE_FAILED_BODY = { error: 'Gagal menguraikan file Excel pairing. Pastikan format tabel dan header sesuai.' };

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

// Excel (buffer) → array record. Pemetaan kolom sama persis dengan versi sebelumnya. null bila gagal / kosong.
function parsePairingWorkbook(buffer, onProgress = () => {}) {
  try {
    onProgress('Membaca file Excel', 5);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.includes('Unstacked_Pairing_Data')
      ? 'Unstacked_Pairing_Data'
      : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return null;

    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    if (!rawRows || rawRows.length === 0) return null;
    onProgress('Menguraikan baris', 30);

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

// Kunci pencarian → daftar nomor baris (algoritma sama dengan Map versi sebelumnya, termasuk urutan & alias MSISDN)
function buildPairingLookup(records) {
  const lookup = new Map();

  const addSingleKey = (key, idx) => {
    if (!key) return;
    const strKey = String(key).trim();
    if (strKey.length < 3) return;
    if (!lookup.has(strKey)) {
      lookup.set(strKey, []);
    }
    const arr = lookup.get(strKey);
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

  records.forEach((rec, idx) => {
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
  return lookup;
}

// Alias MSISDN yang dicoba bila kunci persis tidak ditemukan (08… ↔ 628…)
function msisdnAlias(cleanQ) {
  if (cleanQ.startsWith('08')) return '628' + cleanQ.slice(2);
  if (cleanQ.startsWith('628')) return '08' + cleanQ.slice(3);
  return '';
}

// ─── Indeks di Redis ───

// Tulis indeks ke versi baru (belum aktif). Mengembalikan nomor versi.
async function writePairingIndex(redis, records, onProgress = () => {}) {
  const version = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const lookup = buildPairingLookup(records);
  const totalSteps = records.length + lookup.size;
  let done = 0;
  const report = () => onProgress('Membangun indeks pencarian', 55 + 40 * (done / Math.max(1, totalSteps)));

  // Banyak HSET dikirim sekaligus (pipeline) agar tidak menunggu round-trip per batch
  let pipeline = redis.pipeline();
  let queued = 0;
  const enqueue = async (key, fields, size) => {
    pipeline.hset(key, fields);
    done += size;
    if (++queued === PIPELINE_BATCHES) await flush();
  };
  const flush = async () => {
    if (queued === 0) return;
    const results = await pipeline.exec();
    const failed = results.find(([err]) => err);
    if (failed) throw failed[0];
    pipeline = redis.pipeline();
    queued = 0;
    report();
  };

  try {
    for (let i = 0; i < records.length; i += WRITE_BATCH) {
      const fields = {};
      records.slice(i, i + WRITE_BATCH).forEach((rec, j) => { fields[i + j] = JSON.stringify(rec); });
      await enqueue(recordsKey(version), fields, Object.keys(fields).length);
    }
    let fields = {};
    let count = 0;
    for (const [key, indices] of lookup) {
      fields[key] = indices.join(',');
      if (++count === WRITE_BATCH) {
        await enqueue(lookupKey(version), fields, count);
        fields = {};
        count = 0;
      }
    }
    if (count > 0) await enqueue(lookupKey(version), fields, count);
    await flush();
  } catch (err) {
    await redis.unlink(recordsKey(version), lookupKey(version)).catch(() => {});
    throw err;
  }
  return version;
}

// Aktifkan versi baru secara atomik, lalu hapus versi lama (UNLINK: dibebaskan Redis di latar belakang)
async function activatePairingIndex(redis, version, meta) {
  const previous = await redis.get(ACTIVE_KEY);
  await redis.multi().set(ACTIVE_KEY, version).set(META_KEY, JSON.stringify({ ...meta, version })).exec();
  if (previous && previous !== version) await redis.unlink(recordsKey(previous), lookupKey(previous));
}

async function buildAndActivate(redis, records, meta, onProgress) {
  const version = await writePairingIndex(redis, records, onProgress);
  onProgress('Mengaktifkan indeks', 97);
  await activatePairingIndex(redis, version, meta);
  return version;
}

// Job worker "Import Excel Tsel One Pairing" (dipanggil processor import bersama)
async function importPairingExcel({ file, onProgress = () => {}, connection }) {
  if (!file || !file.buffer) {
    throw new AppError(400, { error: 'Tidak ada file Excel pairing yang diunggah.' });
  }

  const records = parsePairingWorkbook(file.buffer, onProgress);
  if (!records || records.length === 0) {
    throw new AppError(400, PARSE_FAILED_BODY);
  }

  const meta = {
    updatedAt: new Date().toISOString(),
    totalRows: records.length,
    fileName: file.originalname
  };

  // File sumber disimpan setelah berhasil diuraikan (file rusak tidak menimpa sumber yang lama)
  onProgress('Menyimpan file sumber', 52);
  await putObject(SOURCE_KEY, file.buffer, 'application/octet-stream');
  await putObject(SOURCE_META_KEY, JSON.stringify(meta), 'application/json');

  await buildAndActivate(connection, records, meta, onProgress);
  console.log(`✅ [Pairing] Indeks Redis aktif: ${records.length} baris (${file.originalname})`);

  return ({
    success: true,
    message: `Berhasil mengimpor Data Tsel One Pairing! (${records.length.toLocaleString('id-ID')} baris terproses)`,
    totalRows: records.length,
    updatedAt: meta.updatedAt
  });
}

// Dipanggil saat worker menyala: bila Redis belum punya indeks aktif, bangun dari file sumber di object storage;
// bila belum ada juga, migrasikan data lama dari disk (data/pairing/tsel_one_pairing.xlsx, format sebelum Redis).
async function ensurePairingIndex(redis) {
  if (await redis.get(ACTIVE_KEY)) return 'active';

  let buffer = await getObjectBuffer(SOURCE_KEY);
  let meta = null;
  if (buffer) {
    console.log('🔄 [Pairing] Indeks Redis kosong — membangun ulang dari file sumber di object storage...');
    const rawMeta = await getObjectBuffer(SOURCE_META_KEY);
    meta = rawMeta ? JSON.parse(rawMeta.toString('utf8')) : null;
  } else {
    const legacyPath = path.join(PAIRING_DIR, 'tsel_one_pairing.xlsx');
    if (!fs.existsSync(legacyPath)) return 'empty';
    console.log('🔄 [Pairing] Memigrasikan data pairing lama dari disk ke object storage & Redis...');
    buffer = fs.readFileSync(legacyPath);
  }

  const records = parsePairingWorkbook(buffer);
  if (!records || records.length === 0) return 'empty';
  if (!meta) {
    meta = { updatedAt: new Date().toISOString(), totalRows: records.length, fileName: 'tsel_one_pairing.xlsx' };
    await putObject(SOURCE_KEY, buffer, 'application/octet-stream');
    await putObject(SOURCE_META_KEY, JSON.stringify(meta), 'application/json');
  }
  await buildAndActivate(redis, records, meta, () => {});
  console.log(`✅ [Pairing] Indeks Redis aktif: ${records.length} baris`);
  return 'rebuilt';
}

// ─── Pencarian (server API) ───

// Satu round-trip & atomik terhadap pergantian versi: GET active → HGET lookup (persis, lalu alias) → HMGET records
const SEARCH_SCRIPT = `
local ns = KEYS[1]
local version = redis.call('GET', ns .. ':active')
if not version then return {} end
local lookup = ns .. ':v:' .. version .. ':lookup'
local ids = redis.call('HGET', lookup, ARGV[1])
if (not ids) and ARGV[2] ~= '' then ids = redis.call('HGET', lookup, ARGV[2]) end
if not ids then return {} end
local list = {}
for id in string.gmatch(ids, '[^,]+') do list[#list + 1] = id end
return redis.call('HMGET', ns .. ':v:' .. version .. ':records', unpack(list))
`;
const scriptReady = new WeakSet();

async function searchPairingData(query) {
  if (!query || typeof query !== 'string') return [];
  const cleanQ = query.trim();

  if (cleanQ.length < 6) return [];

  const redis = getApiConnection();
  if (!scriptReady.has(redis)) {
    redis.defineCommand('pairingSearch', { numberOfKeys: 1, lua: SEARCH_SCRIPT });
    scriptReady.add(redis);
  }
  if (redis.status !== 'ready') throw new AppError(503, SEARCH_UNAVAILABLE_MESSAGE, 'SEARCH_UNAVAILABLE');
  let rows;
  try {
    // Strict exact match requirement: NO substring/partial fallback!
    rows = await redis.pairingSearch(NS, cleanQ, msisdnAlias(cleanQ));
  } catch (err) {
    console.error('❌ [Pairing] Pencarian Redis gagal:', err.message);
    throw new AppError(503, SEARCH_UNAVAILABLE_MESSAGE, 'SEARCH_UNAVAILABLE');
  }
  return rows.filter(Boolean).map(row => JSON.parse(row));
}

// Dipindah dari handler server.js baris 2924-2951
async function searchPairing({ query }) {
  const q = query.q; // sudah divalidasi & digabung dari ?q= / ?query= oleh skema
  const cleanQ = String(q).trim();

  if (!cleanQ || cleanQ.length < 6) {
    throw new AppError(400, {
      success: false,
      error: 'Kata kunci terlalu umum. Masukkan nilai yang akurat dan lengkap (minimal 6 karakter).'
    });
  }

  const start = Date.now();
  const results = await searchPairingData(cleanQ);
  const durationMs = Date.now() - start;

  return ({
    success: true,
    query: cleanQ,
    count: results.length,
    durationMs,
    results
  });
}

module.exports = {
  NS,
  SOURCE_KEY,
  parsePairingWorkbook,
  buildPairingLookup,
  msisdnAlias,
  importPairingExcel,
  ensurePairingIndex,
  searchPairingData,
  searchPairing
};
