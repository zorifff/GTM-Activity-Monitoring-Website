// ─── VALIDASI SKEMA TERPUSAT (Zod) — definisi skema ───
// Middleware penerapnya: src/middlewares/validate.js
// Semua request body, query parameter & form data diperiksa di sini sebelum masuk ke logika bisnis.
// Field yang tidak dikenal dibuang otomatis (z.object default = strip), sehingga hanya data yang
// terdaftar di skema yang bisa mencapai query database.
const { z } = require('zod');

// Pesan error bawaan Zod dalam Bahasa Indonesia
z.config(z.locales.id());

const ACTIVITY_TYPES = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];
const INDONESIAN_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_LABEL_REGEX = new RegExp(`^(${INDONESIAN_MONTHS.join('|')}) (20\\d{2})$`, 'i');

// Form data & JSON dari frontend sering mengirim '' / null untuk field kosong → anggap tidak diisi
const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

// Teks wajib: dipangkas & dibatasi panjangnya
const requiredText = (label, max) => z
  .string({ error: `${label} wajib diisi.` })
  .trim()
  .min(1, { error: `${label} wajib diisi.` })
  .max(max, { error: `${label} maksimal ${max} karakter.` });

// Teks opsional: '' / null / spasi saja dianggap tidak diisi
const optionalText = (label, max) => z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : emptyToUndefined(value)),
  z.string({ error: `${label} harus berupa teks.` })
    .trim()
    .max(max, { error: `${label} maksimal ${max} karakter.` })
    .optional()
);

// Koordinat WGS84 dari query string (teks → angka) dengan batas nilai
const coordinate = (label, min, max) => z.preprocess(emptyToUndefined, z.coerce
  .number({ error: `${label} wajib diisi dengan angka.` })
  .min(min, { error: `${label} harus di antara ${min} dan ${max}.` })
  .max(max, { error: `${label} harus di antara ${min} dan ${max}.` }));

const resultLimit = (fallback) => z.preprocess(emptyToUndefined, z.coerce
  .number({ error: 'limit harus berupa angka.' })
  .int({ error: 'limit harus bilangan bulat.' })
  .min(1, { error: 'limit minimal 1.' })
  .max(2000, { error: 'limit maksimal 2000.' })
  .default(fallback));

// Label periode program, dinormalisasi ke penulisan baku (mis. "agustus 2026" → "Agustus 2026")
const monthLabel = (label = 'Periode') => z
  .string({ error: `${label} wajib diisi.` })
  .trim()
  .regex(MONTH_LABEL_REGEX, { error: `${label} harus berformat "Bulan Tahun", contoh: "Agustus 2026".` })
  .transform(value => {
    const [, month, year] = MONTH_LABEL_REGEX.exec(value);
    const canonical = INDONESIAN_MONTHS.find(m => m.toLowerCase() === month.toLowerCase());
    return `${canonical} ${year}`;
  });

const activityType = z.enum(ACTIVITY_TYPES, { error: 'Jenis kegiatan tidak dikenal.' });

// Tanggal kegiatan dari input <input type="date"> (YYYY-MM-DD) atau ISO date-time
const planDate = z.preprocess(
  emptyToUndefined,
  z.string({ error: 'Tanggal kegiatan harus berupa teks tanggal.' })
    .trim()
    .max(40, { error: 'Format tanggal kegiatan tidak valid.' })
    .refine(value => /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(new Date(value).getTime()), {
      error: 'Format tanggal kegiatan tidak valid (gunakan YYYY-MM-DD).'
    })
    .optional()
);

// Link detail program hanya boleh http/https (mencegah javascript: / data: URL)
const httpUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : emptyToUndefined(value)),
  z.string({ error: 'Link detail harus berupa teks.' })
    .trim()
    .max(2048, { error: 'Link detail terlalu panjang.' })
    .refine(value => {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, { error: 'Link detail harus berupa URL yang diawali http:// atau https://.' })
    .optional()
);

// Identitas proyek untuk aksi foto/verifikasi: minimal projectId atau projectName
const projectActionBody = z.object({
  branchName: optionalText('Nama branch', 100),
  projectName: optionalText('Nama proyek', 300),
  projectId: optionalText('ID proyek', 100),
  type: activityType,
  photoId: optionalText('ID foto', 100)
}).refine(data => data.projectId || data.projectName, {
  error: 'Proyek wajib ditentukan (projectId atau projectName).',
  path: ['projectName']
});

const schemas = {
  login: {
    body: z.object({
      username: requiredText('Username', 100),
      password: z.string({ error: 'Password wajib diisi.' })
        .trim()
        .min(1, { error: 'Password wajib diisi.' })
        .max(128, { error: 'Password maksimal 128 karakter.' })
    })
  },

  revokeSessions: {
    body: z.object({
      userId: z.preprocess(emptyToUndefined, z.coerce.number({ error: 'userId tidak valid.' })
        .int({ error: 'userId tidak valid.' })
        .positive({ error: 'userId tidak valid.' })
        .optional()),
      sessionId: z.preprocess(emptyToUndefined, z.uuid({ error: 'sessionId tidak valid.' }).optional())
    }).refine(data => (data.userId === undefined) !== (data.sessionId === undefined), {
      error: 'Isi salah satu: userId atau sessionId.'
    })
  },

  // Form data multipart (dibaca setelah multer memproses file)
  createActivity: {
    body: z.object({
      branchName: requiredText('Nama branch', 100),
      projectName: requiredText('Nama proyek', 300),
      type: activityType,
      planDate,
      namaOutlet: optionalText('Nama outlet', 200),
      namaBumdes: optionalText('Nama BUMDes', 200),
      kodeSf: optionalText('Kode SF', 100),
      keterangan: optionalText('Keterangan', 500)
    })
  },

  projectAction: { body: projectActionBody },

  // Form data multipart unggah gambar program
  uploadProgramImage: {
    body: z.object({
      monthLabel: z.preprocess(emptyToUndefined, monthLabel().optional()),
      programName: optionalText('Nama program', 150),
      sheetName: optionalText('Nama program', 150),
      detailUrl: httpUrl
    })
  },

  listPrograms: {
    query: z.object({
      month: z.preprocess(emptyToUndefined, monthLabel().optional())
    })
  },

  // Parameter boleh dikirim lewat body (frontend) maupun query string; minimal monthLabel wajib di salah satunya
  deletePrograms: (() => {
    const fields = z.object({
      monthLabel: z.preprocess(emptyToUndefined, monthLabel().optional()),
      programName: optionalText('Nama program', 150),
      imageId: optionalText('ID slide gambar', 100)
    });
    return { body: fields, query: fields };
  })(),

  // Form data yang isinya hanya file (import Excel ODP & Pairing): semua field teks dibuang
  fileOnly: {
    body: z.object({})
  },

  // ID job import ODP di URL (/api/admin/import-excel/:jobId[/events])
  importJob: {
    params: z.object({
      jobId: z.uuid({ error: 'ID proses import tidak valid.' })
    })
  },

  // Query spasial ODP: dalam radius (meter) dari satu titik
  odpNearby: {
    query: z.object({
      lat: coordinate('lat', -90, 90),
      lon: coordinate('lon', -180, 180),
      radius: z.preprocess(emptyToUndefined, z.coerce
        .number({ error: 'radius harus berupa angka (meter).' })
        .positive({ error: 'radius harus lebih dari 0 meter.' })
        .max(50000, { error: 'radius maksimal 50000 meter (50 km).' })
        .default(1000)),
      limit: resultLimit(200)
    })
  },

  // Query spasial ODP: di dalam kotak batas wilayah (bounding box)
  odpWithin: {
    query: z.object({
      minLat: coordinate('minLat', -90, 90),
      minLon: coordinate('minLon', -180, 180),
      maxLat: coordinate('maxLat', -90, 90),
      maxLon: coordinate('maxLon', -180, 180),
      limit: resultLimit(500)
    }).refine(({ minLat, maxLat }) => minLat < maxLat, { error: 'minLat harus lebih kecil dari maxLat.', path: ['minLat'] })
      .refine(({ minLon, maxLon }) => minLon < maxLon, { error: 'minLon harus lebih kecil dari maxLon.', path: ['minLon'] })
  },

  pairingSearch: {
    query: z.object({
      q: optionalText('Kata kunci', 64),
      query: optionalText('Kata kunci', 64)
    }).transform(({ q, query }) => ({ q: q || query || '' }))
      .refine(({ q }) => q.length >= 6, {
        error: 'Kata kunci terlalu umum. Masukkan nilai yang akurat dan lengkap (minimal 6 karakter).',
        path: ['q']
      })
  }
};

module.exports = { z, schemas, ACTIVITY_TYPES };
