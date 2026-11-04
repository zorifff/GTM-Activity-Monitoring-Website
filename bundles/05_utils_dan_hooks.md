# Bundle 5: Utilitas, Konstanta, & Custom Hooks

> Berisi fungsi helper kalkulasi (utils.js), konstanta program/target gap, query fetching, penanganan SSE (jobEvents), serta lapisan logika bisnis custom hooks.

**Daftar Berkas Terlampir (25 berkas):**

- `gtm-monitor-frontend/src/utils.js` (294 baris)
- `gtm-monitor-frontend/src/constants/programs.js` (29 baris)
- `gtm-monitor-frontend/src/constants/dashboard.js` (36 baris)
- `gtm-monitor-frontend/src/constants/gapWow.js` (85 baris)
- `gtm-monitor-frontend/src/api/queries.js` (48 baris)
- `gtm-monitor-frontend/src/jobEvents.js` (71 baris)
- `gtm-monitor-frontend/src/hooks/useAppNotifications.js` (94 baris)
- `gtm-monitor-frontend/src/hooks/useMonitoringData.js` (36 baris)
- `gtm-monitor-frontend/src/hooks/useActivityActions.js` (159 baris)
- `gtm-monitor-frontend/src/hooks/useOdpSummary.js` (49 baris)
- `gtm-monitor-frontend/src/hooks/useGtmMonitoring.js` (94 baris)
- `gtm-monitor-frontend/src/hooks/useExecutiveSummary.js` (85 baris)
- `gtm-monitor-frontend/src/hooks/useExecutiveSummaryExport.js` (61 baris)
- `gtm-monitor-frontend/src/hooks/useRekapExcelExport.js` (170 baris)
- `gtm-monitor-frontend/src/hooks/useOdpImport.js` (92 baris)
- `gtm-monitor-frontend/src/hooks/usePairingImport.js` (86 baris)
- `gtm-monitor-frontend/src/hooks/usePairingSearch.js` (27 baris)
- `gtm-monitor-frontend/src/hooks/usePrograms.js` (31 baris)
- `gtm-monitor-frontend/src/hooks/useProgramUpload.js` (84 baris)
- `gtm-monitor-frontend/src/hooks/useProgramDelete.js` (65 baris)
- `gtm-monitor-frontend/src/hooks/useAdminMonitoring.js` (98 baris)
- `gtm-monitor-frontend/src/hooks/useProjectReviewModal.js` (33 baris)
- `gtm-monitor-frontend/src/hooks/useCountUp.js` (102 baris)
- `gtm-monitor-frontend/src/hooks/useInView.js` (55 baris)
- `gtm-monitor-frontend/src/hooks/useLastUpdateLabel.js` (44 baris)

**Total Baris Kode**: 2.028 baris

---

## File: `gtm-monitor-frontend/src/utils.js` (294 baris)

```javascript
export const ACT_TYPES = [
  { key: 'tsel_menyapa', label: 'Tsel Menyapa Warga', kind: 'date_photo', fieldKey: 'planDate' },
  { key: 'branding_outlet', label: 'Branding Downline/Outlet', kind: 'photo' },
  { key: 'bumdes', label: 'Kerjasama dengan BUMDES', kind: 'photo' },
  { key: 'rekrutmen_sf', label: 'Rekrutmen SF AKAMSI', kind: 'text', fieldKey: 'keterangan', placeholder: 'Kode SF' },
  { key: 'open_table', label: 'Always ON Open Table', kind: 'photo' }
];

export const BRANCH_COLORS = {
  MAGELANG: '#10b981',   // Emerald Green
  PEKALONGAN: '#f97316', // Sunset Orange
  PURWOKERTO: '#3b82f6', // Royal Blue
  SEMARANG: '#ef4444',   // Telkomsel Red / Crimson
  SURAKARTA: '#8b5cf6',  // Royal Purple / Violet
  YOGYAKARTA: '#06b6d4'  // Cyan / Turquoise
};

const BRANCH_COORDS = {
  MAGELANG: { lat: -7.4797, lon: 110.2177 },
  PEKALONGAN: { lat: -6.8886, lon: 109.6753 },
  PURWOKERTO: { lat: -7.4245, lon: 109.2302 },
  SEMARANG: { lat: -7.0051, lon: 110.4381 },
  SURAKARTA: { lat: -7.5755, lon: 110.8243 },
  YOGYAKARTA: { lat: -7.7956, lon: 110.3695 }
};

export function getOdpCoords(odpName, branchName, existingLat, existingLon) {
  if (typeof existingLat === 'number' && typeof existingLon === 'number' && !isNaN(existingLat) && !isNaN(existingLon)) {
    return { lat: existingLat, lon: existingLon };
  }
  const base = BRANCH_COORDS[branchName?.toString().trim().toUpperCase()] || { lat: -7.25, lon: 110.0 };
  let h = 0;
  for (let i = 0; i < (odpName || '').length; i++) {
    h = ((h << 5) - h) + odpName.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h);
  const latOffset = ((abs % 1000) - 500) * 0.0003; // ~ +/- 0.15 deg (~15 km radius)
  const lonOffset = (((abs / 1000) | 0) % 1000 - 500) * 0.0003;
  return { lat: base.lat + latOffset, lon: base.lon + lonOffset };
}

export function actMeta(status) {
  if (status === 'verified') return { label: 'Terverifikasi', bg: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
  if (status === 'upload') return { label: 'Menunggu Verifikasi', bg: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  if (status === 'gagal' || status === 'rejected') return { label: 'Ditolak', bg: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' };
  if (status === 'proses' || status === 'processing') return { label: 'Diproses', bg: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
  return { label: 'Belum Dikerjakan', bg: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
}

export function flatOdps(branches, typeDesignFilter) {
  const out = [];
  for (const b of (Array.isArray(branches) ? branches : [])) {
    for (const p of (b.projects || [])) {
      if (typeDesignFilter && typeDesignFilter !== 'ALL' && (p.typeDesign || 'Greenfield') !== typeDesignFilter) {
        continue;
      }
      for (const o of (p.odps || [])) {
        const coords = getOdpCoords(o.odp, b.name, o.lat, o.lon);
        out.push({ ...o, lat: coords.lat, lon: coords.lon, branch: b.name, project: p.name, wok: p.wok });
      }
    }
  }
  return out;
}

export function computeStats(branches, typeDesignFilter) {
  let totalAvai = 0, totalUsed = 0, totalPort = 0, odpCount = 0;
  let totalProjCount = 0;
  const allActs = [];

  for (const b of (Array.isArray(branches) ? branches : [])) {
    const projs = b.projects || [];
    for (const p of projs) {
      if (typeDesignFilter && typeDesignFilter !== 'ALL' && (p.typeDesign || 'Greenfield') !== typeDesignFilter) {
        continue;
      }
      totalProjCount++;
      for (const o of (p.odps || [])) {
        totalAvai += o.avai;
        totalUsed += o.used;
        totalPort += o.total;
        odpCount++;
      }
      // Activities are at project level
      if (p.activities) {
        allActs.push(...p.activities);
      }
    }
  }

  const occRate = totalPort ? Math.round((totalUsed / totalPort) * 1000) / 10 : 0;
  const actVerified = allActs.filter(a => a.status === 'verified').length;
  const actUploaded = allActs.filter(a => a.status === 'upload').length;
  const actBelum = allActs.filter(a => a.status === 'belum').length;
  
  // Perhitungan Kontribusi Persentase Verifikasi:
  // Setiap 1 Proyek memiliki 5 Tipe Aktivitas.
  // Total Kapasitas Aktivitas = Total Proyek * 5.
  // Progress (%) = (Jumlah Aktivitas Terverifikasi / (Total Proyek * 5)) * 100%
  const totalActivitySlots = totalProjCount * 5;
  const actCompletionPct = totalActivitySlots ? Math.round((actVerified / totalActivitySlots) * 1000) / 10 : 0;
  
  return {
    totalAvai, totalUsed, totalPort, occRate,
    actVerified, actUploaded, actBelum, actCompletionPct, odpCount,
    totalProjCount, totalActivitySlots
  };
}

export function formatBranch(name) {
  if (!name || name === 'Semua Branch' || name === 'Multi Branch') return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function exportProjectsToExcel(branches, selectedBranchName = null) {
  import('xlsx-js-style').then(XLSX => {
    let targetBranches = Array.isArray(branches) ? branches : [];
    if (selectedBranchName && selectedBranchName !== 'Semua Branch' && selectedBranchName !== 'Multi Branch') {
      targetBranches = targetBranches.filter(b => b.name === selectedBranchName || b.name.toLowerCase() === selectedBranchName.toLowerCase());
    }

    const getActStatusLabel = (act, actTypeKey) => {
      if (!act || !act.status || act.status === 'belum') return 'Belum Dikerjakan';
      let label = act.status === 'verified' ? 'Terverifikasi' : 'Menunggu Verifikasi';
      if (actTypeKey === 'tsel_menyapa' && act.planDate) {
        const dStr = new Date(act.planDate).toLocaleDateString('id-ID');
        label += ` (Tgl: ${dStr})`;
      } else if (actTypeKey === 'branding_outlet' && act.namaOutlet) {
        label += ` (${act.namaOutlet})`;
      } else if (actTypeKey === 'bumdes' && (act.namaBumdes || act.keterangan)) {
        label += ` (${act.namaBumdes || act.keterangan})`;
      } else if (actTypeKey === 'rekrutmen_sf' && (act.keterangan || act.kodeSf)) {
        label += ` (${act.kodeSf || act.keterangan})`;
      }
      return label;
    };

    const getOverallProjectStatus = (acts) => {
      if (acts.some(a => a.status === 'upload')) return 'Menunggu Verifikasi';
      if (acts.some(a => a.status === 'verified')) return 'Terverifikasi';
      return 'Belum Dikerjakan';
    };

    const dataRows = [];

    targetBranches.forEach(b => {
      const bName = formatBranch(b.name);
      (b.projects || []).forEach(p => {
        const used = p.usedTotal ?? (p.odps || []).reduce((s, o) => s + (o.used || 0), 0);
        const avai = p.avaiTotal ?? (p.odps || []).reduce((s, o) => s + (o.avai || 0), 0);
        const total = p.totalPort ?? (p.odps || []).reduce((s, o) => s + (o.total || 0), 0);
        const occ = total > 0 ? (used / total * 100).toFixed(1) + '%' : '0%';

        const acts = p.activities || [];
        const tselAct = acts.find(a => a.type === 'tsel_menyapa');
        const brandingAct = acts.find(a => a.type === 'branding_outlet');
        const bumdesAct = acts.find(a => a.type === 'bumdes');
        const rekrutmenAct = acts.find(a => a.type === 'rekrutmen_sf');
        const openTableAct = acts.find(a => a.type === 'open_table');

        dataRows.push([
          bName,
          p.wok || '-',
          p.name,
          p.typeDesign || 'Greenfield',
          used,
          avai,
          total,
          occ,
          getActStatusLabel(tselAct, 'tsel_menyapa'),
          getActStatusLabel(brandingAct, 'branding_outlet'),
          getActStatusLabel(bumdesAct, 'bumdes'),
          getActStatusLabel(rekrutmenAct, 'rekrutmen_sf'),
          getActStatusLabel(openTableAct, 'open_table'),
          getOverallProjectStatus(acts)
        ]);
      });
    });

    if (dataRows.length === 0) {
      alert('⚠️ Tidak ada data proyek untuk diexport.');
      return;
    }

    const dateFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const titleRow1 = ['REKAPITULASI MONITORING AKTIVITAS GTM (GENERATING TRAFFIC & MOVEMENT)'];
    const titleRow2 = [`Tanggal Export: ${dateFormatted} | Total LOP / Proyek: ${dataRows.length}`];
    const emptyRow = [];
    const headerRow = [
      'Branch',
      'WOK',
      'Nama LOP / Proyek',
      'Type Design',
      'Used Port',
      'Avai Port',
      'Total Port',
      'Occupancy Rate (%)',
      'Tsel Menyapa Warga',
      'Branding Outlet',
      'BUMDES',
      'Rekrutmen SF',
      'Open Table',
      'Status LOP'
    ];

    const sheetData = [titleRow1, titleRow2, emptyRow, headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge title rows A1 & A2
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }
    ];

    if (ws['A1']) {
      ws['A1'].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "0F172A" } },
        alignment: { vertical: "center" }
      };
    }
    if (ws['A2']) {
      ws['A2'].s = {
        font: { name: "Calibri", sz: 11, italic: true, color: { rgb: "475569" } },
        alignment: { vertical: "center" }
      };
    }

    // AutoFilter across A4:N...
    ws['!autofilter'] = { ref: `A4:N${3 + dataRows.length}` };

    // Style Header A4:N4 with Telkomsel Red (#800000) & White Bold Text (#FFFFFF)
    const headerCols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
    headerCols.forEach(col => {
      const cellRef = `${col}4`;
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: "C8102E" } // Telkomsel Red (#800000)
          },
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: { rgb: "FFFFFF" } // White text
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          },
          border: {
            top: { style: "thin", color: { rgb: "BFBFBF" } },
            bottom: { style: "thin", color: { rgb: "BFBFBF" } },
            left: { style: "thin", color: { rgb: "BFBFBF" } },
            right: { style: "thin", color: { rgb: "BFBFBF" } }
          }
        };
      }
    });

    ws['!cols'] = [
      { wch: 16 }, // Branch
      { wch: 22 }, // WOK
      { wch: 32 }, // Nama LOP
      { wch: 14 }, // Type Design
      { wch: 10 }, // Used Port
      { wch: 10 }, // Avai Port
      { wch: 10 }, // Total Port
      { wch: 18 }, // Occupancy Rate
      { wch: 30 }, // Tsel Menyapa
      { wch: 22 }, // Branding
      { wch: 22 }, // BUMDES
      { wch: 30 }, // Rekrutmen SF
      { wch: 22 }, // Open Table
      { wch: 24 }  // Status LOP
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap LOP');

    const cleanName = selectedBranchName && selectedBranchName !== 'Semua Branch' && selectedBranchName !== 'Multi Branch'
      ? formatBranch(selectedBranchName).replace(/\s+/g, '_')
      : 'Semua_Branch';

    const today = new Date().toISOString().split('T')[0];
    const fileName = cleanName !== 'Semua_Branch'
      ? `Rekap_GTM_Activity_${cleanName}_${today}.xlsx`
      : `Rekap_GTM_Activity_${today}.xlsx`;

    XLSX.writeFile(wb, fileName);
  });
}

```

---

## File: `gtm-monitor-frontend/src/constants/programs.js` (29 baris)

```javascript
export const SHOW_PROGRAM_MENU = true; // Feature flag to toggle PROGRAM menu visibility

export const SESSION_1_MONTHS = [
  { id: '2026-01', label: 'Januari 2026' },
  { id: '2026-02', label: 'Februari 2026' },
  { id: '2026-03', label: 'Maret 2026' },
  { id: '2026-04', label: 'April 2026' },
  { id: '2026-05', label: 'Mei 2026' },
  { id: '2026-06', label: 'Juni 2026' }
];

export const SESSION_2_MONTHS = [
  { id: '2026-07', label: 'Juli 2026' },
  { id: '2026-08', label: 'Agustus 2026', isCurrent: true },
  { id: '2026-09', label: 'September 2026' },
  { id: '2026-10', label: 'Oktober 2026' },
  { id: '2026-11', label: 'November 2026' },
  { id: '2026-12', label: 'Desember 2026' }
];

export const PROGRAM_PLACEHOLDERS = {
  'Agustus 2026': [
    'Program GTM Tsel Menyapa Warga',
    'Program Branding Outlet Priority',
    'Program Insentif BUMDes & SF',
    'Program Open Table Tematik'
  ]
};

```

---

## File: `gtm-monitor-frontend/src/constants/dashboard.js` (36 baris)

```javascript
// Struktur Branch → WOK & urutan jenis kegiatan pada tabel Executive Summary Dashboard
export const BRANCH_WOK_MATRIX = [
  {
    branch: 'MAGELANG',
    woks: ['KEBUMEN', 'MAGELANG TEMANGGUNG']
  },
  {
    branch: 'PEKALONGAN',
    woks: ['BATANG', 'PEMALANG PURBALINGGA', 'TEGAL BREBES']
  },
  {
    branch: 'PURWOKERTO',
    woks: ['CILACAP BANYUMAS', 'WONOSOBO BANJARNEGARA']
  },
  {
    branch: 'SEMARANG',
    woks: ['DEMAK', 'JEPARA KUDUS - PATI', 'SEMARANG 1', 'SEMARANG 2']
  },
  {
    branch: 'SURAKARTA',
    woks: ['BOYOLALI', 'SRAGEN', 'SURAKARTA']
  },
  {
    branch: 'YOGYAKARTA',
    woks: ['YOGYA 1', 'YOGYA 2']
  }
];

export const ACT_TYPES_ORDER = [
  { key: 'tsel_menyapa', shortLabel: 'Tsel Menyapa', label: 'Tsel Menyapa' },
  { key: 'branding_outlet', shortLabel: 'Branding Outlet', label: 'Branding Outlet' },
  { key: 'bumdes', shortLabel: 'BUMDES', label: 'BUMDES' },
  { key: 'rekrutmen_sf', shortLabel: 'Rekrut SF', label: 'Rekrut SF' },
  { key: 'open_table', shortLabel: 'Open Table', label: 'Open Table' }
];

```

---

## File: `gtm-monitor-frontend/src/constants/gapWow.js` (85 baris)

```javascript
// Nilai Gap WoW cadangan per branch & per WOK (dipakai ranking bila nilai dari Excel tidak tersedia)
export const GAP_WOW_MAP_BY_FILTER = {
  ALL: {
    MAGELANG: -0.0024,  // -0.24% (▼ -0.2%)
    PEKALONGAN: 0.0055, // +0.55% (▲ +0.5%)
    PURWOKERTO: -0.0034,// -0.34% (▼ -0.3%)
    SEMARANG: 0.0024,   // +0.24% (▲ +0.2%)
    SURAKARTA: 0.0016,  // +0.16% (▲ +0.2%)
    YOGYAKARTA: 0.0062  // +0.62% (▲ +0.6%)
  },
  Greenfield: {
    MAGELANG: 0.0067,   // +0.67% (▲ +0.7%)
    PEKALONGAN: 0.0084, // +0.84% (▲ +0.8%)
    PURWOKERTO: 0.0005, // +0.05% (▲ +0.1%)
    SEMARANG: 0.0049,   // +0.49% (▲ +0.5%)
    SURAKARTA: 0.0056,  // +0.56% (▲ +0.6%)
    YOGYAKARTA: -0.0004 // -0.04% (▼ -0.0%)
  },
  Brownfield: {
    MAGELANG: -0.0116,  // -1.16% (▼ -1.2%)
    PEKALONGAN: 0.0018, // +0.18% (▲ +0.2%)
    PURWOKERTO: -0.0039,// -0.39% (▼ -0.4%)
    SEMARANG: -0.0008,  // -0.08% (▼ -0.1%)
    SURAKARTA: -0.0022, // -0.22% (▼ -0.2%)
    YOGYAKARTA: 0.0100  // +1.00% (▲ +1.0%)
  }
};

export const WOK_GAP_WOW_MAP = {
  ALL: {
    'MAGELANG||KEBUMEN': 0.0085,
    'MAGELANG||MAGELANG TEMANGGUNG': -0.0117,
    'PEKALONGAN||BATANG': 0.0047,
    'PEKALONGAN||PEMALANG PURBALINGGA': 0.0095,
    'PEKALONGAN||TEGAL BREBES': 0.0046,
    'PURWOKERTO||CILACAP BANYUMAS': 0.0061,
    'PURWOKERTO||WONOSOBO BANJARNEGARA': -0.0064,
    'SEMARANG||DEMAK': 0.0032,
    'SEMARANG||JEPARA KUDUS - PATI': 0.0043,
    'SEMARANG||SEMARANG 1': -0.0025,
    'SEMARANG||SEMARANG 2': 0.0053,
    'SURAKARTA||BOYOLALI': 0.0003,
    'SURAKARTA||SRAGEN': -0.0014,
    'SURAKARTA||SURAKARTA': 0.0132,
    'YOGYAKARTA||YOGYA 1': 0.0047,
    'YOGYAKARTA||YOGYA 2': 0.0074
  },
  Greenfield: {
    'MAGELANG||KEBUMEN': 0.0091,
    'MAGELANG||MAGELANG TEMANGGUNG': 0.0036,
    'PEKALONGAN||BATANG': 0.0083,
    'PEKALONGAN||PEMALANG PURBALINGGA': 0.0139,
    'PEKALONGAN||TEGAL BREBES': 0.0066,
    'PURWOKERTO||CILACAP BANYUMAS': 0.0037,
    'PURWOKERTO||WONOSOBO BANJARNEGARA': 0.0008,
    'SEMARANG||DEMAK': 0.0064,
    'SEMARANG||JEPARA KUDUS - PATI': 0.0027,
    'SEMARANG||SEMARANG 1': 0.0037,
    'SEMARANG||SEMARANG 2': 0.0067,
    'SURAKARTA||BOYOLALI': 0.0018,
    'SURAKARTA||SRAGEN': 0.0000,
    'SURAKARTA||SURAKARTA': 0.0227,
    'YOGYAKARTA||YOGYA 1': 0.0012,
    'YOGYAKARTA||YOGYA 2': -0.0028
  },
  Brownfield: {
    'MAGELANG||KEBUMEN': 0.0077,
    'MAGELANG||MAGELANG TEMANGGUNG': -0.0228,
    'PEKALONGAN||BATANG': -0.0009,
    'PEKALONGAN||PEMALANG PURBALINGGA': 0.0025,
    'PEKALONGAN||TEGAL BREBES': 0.0027,
    'PURWOKERTO||CILACAP BANYUMAS': 0.0069,
    'PURWOKERTO||WONOSOBO BANJARNEGARA': -0.0147,
    'SEMARANG||DEMAK': -0.0058,
    'SEMARANG||JEPARA KUDUS - PATI': 0.0076,
    'SEMARANG||SEMARANG 1': -0.0053,
    'SEMARANG||SEMARANG 2': 0.0048,
    'SURAKARTA||BOYOLALI': -0.0026,
    'SURAKARTA||SRAGEN': -0.0018,
    'SURAKARTA||SURAKARTA': 0.0000,
    'YOGYAKARTA||YOGYA 1': 0.0082,
    'YOGYAKARTA||YOGYA 2': 0.0110
  }
};

```

---

## File: `gtm-monitor-frontend/src/api/queries.js` (48 baris)

```javascript
// Kunci & fungsi pengambil data server (dipakai TanStack Query). Mutasi (upload/verifikasi/hapus/import)
// memanggil queryClient.invalidateQueries({ queryKey: … }) agar data yang terkait diambil ulang.
import { API_BASE_URL } from '../apiConfig';

export const queryKeys = {
  // Data monitoring per akun (branch → proyek → ODP & aktivitas) + ringkasan Jateng DIY
  monitoring: (userKey) => ['monitoring', userKey],
  monitoringAll: ['monitoring'],
  // Program bulanan: semua periode ('all') atau satu periode (label bulan)
  programs: (month = 'all') => ['programs', month],
  programsAll: ['programs'],
  authSession: ['auth', 'session']
};

// GET /api/data + /api/import-meta (meta bersifat pelengkap: kegagalannya tidak menggagalkan data utama)
export async function fetchMonitoringData() {
  const [dataRes, metaRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/data`, { credentials: 'include' }),
    fetch(`${API_BASE_URL}/api/import-meta`, { credentials: 'include' }).catch(() => null)
  ]);
  if (!dataRes.ok) throw new Error(`Gagal memuat data monitoring (Status ${dataRes.status}).`);
  const branches = await dataRes.json();
  let importMeta = null;
  if (metaRes && metaRes.ok) importMeta = await metaRes.json();
  return { branches, importMeta };
}

// GET /api/programs — tanpa periode: { monthsData } untuk menu PROGRAM; dengan periode: daftar program periode itu
export async function fetchPrograms(month) {
  const url = month && month !== 'all'
    ? `${API_BASE_URL}/api/programs?month=${encodeURIComponent(month)}`
    : `${API_BASE_URL}/api/programs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat data program (Status ${res.status}).`);
  return res.json();
}

// GET /api/auth/session — selalu 200; { retry: true } bila tab lain sedang memperbarui sesi yang sama
export async function fetchAuthSession(attempt = 1) {
  const res = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' });
  const data = res.ok ? await res.json() : null;
  if (data?.retry && attempt < 3) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return fetchAuthSession(attempt + 1);
  }
  return data;
}

```

---

## File: `gtm-monitor-frontend/src/jobEvents.js` (71 baris)

```javascript
import { authFetch } from './apiConfig';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RECONNECT_ATTEMPTS = 20;

// Satu blok SSE ("event: x\ndata: {...}") → { event, data }
const parseSseBlock = (block) => {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
};

// Memantau job latar belakang lewat Server-Sent Events sampai selesai.
// Dibaca dengan authFetch (bukan EventSource) agar cookie sesi yang kedaluwarsa diperbarui otomatis.
// Koneksi yang putus (jaringan / server restart) disambung ulang; server selalu mengirim status terakhir saat tersambung.
// Hasil: { event: 'completed' | 'failed', data }
export const watchJobEvents = async (url, { onProgress, signal } = {}) => {
  let attempts = 0;
  while (true) {
    let res;
    try {
      res = await authFetch(url, { headers: { Accept: 'text/event-stream' }, signal });
    } catch (err) {
      if (signal?.aborted) throw err;
      res = null;
    }

    if (res && res.ok && res.body) {
      attempts = 0;
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value.replace(/\r\n/g, '\n');
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const message = parseSseBlock(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            if (!message) continue;
            if (message.event === 'progress') onProgress?.(message.data);
            if (message.event === 'completed' || message.event === 'failed') return message;
          }
        }
      } catch (err) {
        if (signal?.aborted) throw err;
      }
    } else if (res && res.status < 500) {
      // 4xx (job tidak ditemukan / sesi berakhir / akses ditolak) tidak akan berubah bila diulang
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || `Gagal memantau progres (Status ${res.status}).`);
    }

    // Stream terputus sebelum hasil akhir → coba sambung ulang
    if (++attempts > MAX_RECONNECT_ATTEMPTS) {
      throw new Error('Koneksi ke server terputus saat memantau progres. Muat ulang halaman untuk melihat data terbaru.');
    }
    await sleep(3000);
  }
};

```

---

## File: `gtm-monitor-frontend/src/hooks/useAppNotifications.js` (94 baris)

```javascript
import { useMemo } from 'react';
import { ACT_TYPES } from '../utils';

/**
 * Hook untuk menghitung dan mengelompokkan notifikasi aktivitas:
 * - Admin: seluruh aktivitas yang berstatus 'upload' / menunggu verifikasi di semua branch.
 * - User (Akun Branch): aktivitas yang telah disetujui ('verified') oleh admin KHUSUS pada branch milik user.
 */
export function useAppNotifications(branches, user, isAdmin) {
  return useMemo(() => {
    if (!user) {
      return { notifications: [], count: 0 };
    }

    const items = [];

    if (isAdmin) {
      // ─── ADMIN: Menampilkan kegiatan yang diunggah & menunggu verifikasi ───
      (branches || []).forEach((b) => {
        (b.projects || []).forEach((p) => {
          (p.activities || []).forEach((a) => {
            const hasUploadStatus = a.status === 'upload' || a.status === 'need_review' || a.status === 'pending';
            const uploadPhotos = Array.isArray(a.photos) ? a.photos.filter((ph) => ph.status === 'upload' || ph.status === 'need_review') : [];

            if (hasUploadStatus || uploadPhotos.length > 0) {
              const actMeta = ACT_TYPES.find((t) => t.key === a.type);
              const actLabel = actMeta?.label || a.type;
              const latestPhoto = uploadPhotos[uploadPhotos.length - 1];
              const timestamp = latestPhoto?.createdAt || latestPhoto?.updatedAt || a.updatedAt || a.createdAt || latestPhoto?.planDate;

              items.push({
                id: `admin-${b.name}-${p.name}-${a.type}`,
                branchName: b.name,
                projectName: p.name,
                wok: p.wok,
                actType: a.type,
                actLabel,
                status: 'upload',
                title: actLabel,
                timestamp
              });
            }
          });
        });
      });
    } else if (user.role === 'USER' && user.branchName) {
      // ─── USER: Menampilkan kegiatan yang telah disetujui admin pada branch user tersebut saja ───
      const userBranchNormalized = user.branchName.trim().toUpperCase();
      const targetBranch = (branches || []).find((b) => b.name?.trim().toUpperCase() === userBranchNormalized);

      if (targetBranch) {
        (targetBranch.projects || []).forEach((p) => {
          (p.activities || []).forEach((a) => {
            const isVerified = a.status === 'verified';
            const verifiedPhotos = Array.isArray(a.photos) ? a.photos.filter((ph) => ph.status === 'verified') : [];

            if (isVerified || verifiedPhotos.length > 0) {
              const actMeta = ACT_TYPES.find((t) => t.key === a.type);
              const actLabel = actMeta?.label || a.type;
              const latestPhoto = verifiedPhotos[verifiedPhotos.length - 1];
              const timestamp = latestPhoto?.updatedAt || latestPhoto?.createdAt || a.updatedAt || a.createdAt || latestPhoto?.planDate;

              items.push({
                id: `user-${targetBranch.name}-${p.name}-${a.type}`,
                branchName: targetBranch.name,
                projectName: p.name,
                wok: p.wok,
                actType: a.type,
                actLabel,
                status: 'verified',
                title: actLabel,
                timestamp
              });
            }
          });
        });
      }
    }

    // Urutkan dari notifikasi dengan timestamp terbaru jika tersedia
    items.sort((x, y) => {
      const tx = x.timestamp ? new Date(x.timestamp).getTime() : 0;
      const ty = y.timestamp ? new Date(y.timestamp).getTime() : 0;
      return ty - tx;
    });

    return {
      notifications: items,
      count: items.length
    };
  }, [branches, user, isAdmin]);
}


```

---

## File: `gtm-monitor-frontend/src/hooks/useMonitoringData.js` (36 baris)

```javascript
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMonitoringData, queryKeys } from '../api/queries';
import { useAuth } from '../auth/AuthContext';

const EMPTY_BRANCHES = [];

// Data monitoring (branch → proyek → ODP & aktivitas) + ringkasan Jateng DIY, per akun yang login.
// Cache 60 detik; diperbarui diam-diam saat tab aktif kembali & setelah aksi (upload/verifikasi/hapus/import).
export function useMonitoringData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userKey = user ? `${user.id ?? user.username}:${user.role}` : null;

  const query = useQuery({
    queryKey: queryKeys.monitoring(userKey),
    queryFn: fetchMonitoringData,
    enabled: !!user
  });

  // Ambil ulang data monitoring & tunggu sampai selesai (pengganti fetchData() lama)
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.monitoringAll }),
    [queryClient]
  );

  return {
    branches: query.data?.branches ?? EMPTY_BRANCHES,
    importMeta: query.data?.importMeta ?? null,
    // Layar "Memuat data" hanya saat belum ada data sama sekali (refetch latar belakang tidak menampilkannya)
    isInitialLoading: !!user && query.isPending,
    isError: query.isError,
    refresh
  };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useActivityActions.js` (159 baris)

```javascript
import { useCallback } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useAuth } from '../auth/AuthContext';
import { useMonitoringData } from './useMonitoringData';

// Aksi kegiatan GTM per proyek: unggah foto, verifikasi & tolak (Admin), hapus foto.
// Setelah aksi, data monitoring diambil ulang (TanStack Query invalidate) — sama seperti fetchData() sebelumnya.
export function useActivityActions() {
  const { isAdmin } = useAuth();
  const { branches, refresh } = useMonitoringData();

  const uploadPhoto = useCallback(async (branchName, projectName, actType, payload) => {
    let file = payload;
    let planDate = null;
    let namaOutlet = null;
    let namaBumdes = null;
    let kodeSf = null;
    let keterangan = null;

    if (payload && typeof payload === 'object' && !(payload instanceof File)) {
      file = payload.file;
      planDate = payload.planDate;
      namaOutlet = payload.namaOutlet;
      namaBumdes = payload.namaBumdes;
      kodeSf = payload.kodeSf;
      keterangan = payload.keterangan;
    }

    const b = branches.find(x => x.name === branchName);
    const p = b?.projects.find(x => x.name === projectName);

    const formData = new FormData();
    formData.append('branchName', branchName);
    formData.append('projectName', projectName);
    formData.append('wokName', p?.wok || 'WOK');
    formData.append('type', actType);
    if (file) formData.append('photo', file);
    if (planDate) formData.append('planDate', planDate);
    if (namaOutlet) formData.append('namaOutlet', namaOutlet);
    if (namaBumdes) formData.append('namaBumdes', namaBumdes);
    if (kodeSf) formData.append('kodeSf', kodeSf);
    if (keterangan) formData.append('keterangan', keterangan);

    try {
      const res = await authFetch(`${API_BASE_URL}/api/activities`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await refresh();
        return { success: true };
      } else {
        if (res.status === 401) return { success: false, error: 'Sesi login berakhir.' };
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || errData.message || `Gagal menyimpan kegiatan (Status ${res.status}).`;
        alert(`❌ ${errMsg}`);
        await refresh();
        return { success: false, error: errMsg };
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('❌ Gagal terhubung ke server saat mengunggah kegiatan. Periksa koneksi lalu coba lagi.');
      await refresh();
      return { success: false, error: err.message };
    }
  }, [branches, refresh]);

  const verifyActivity = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    if (!isAdmin) return false;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          photoId,
          projectId
        })
      });
      if (res.ok) {
        await refresh();
        return true;
      }
      if (res.status !== 401) {
        const data = await res.json().catch(() => ({}));
        alert(`❌ ${data.message || data.error || `Gagal memverifikasi activity (Status ${res.status}).`}`);
      }
      return false;
    } catch (err) {
      console.error('Error verifying activity:', err);
      alert('❌ Terjadi kesalahan server saat memverifikasi activity.');
      return false;
    }
  }, [isAdmin, refresh]);

  const rejectActivity = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    if (!isAdmin) return false;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          photoId,
          projectId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refresh();
        return true;
      } else {
        if (res.status !== 401) alert(`❌ ${data.message || 'Gagal menolak verifikasi activity.'}`);
        return false;
      }
    } catch (err) {
      console.error('Error rejecting activity:', err);
      alert('❌ Terjadi kesalahan server saat menolak verifikasi.');
      return false;
    }
  }, [isAdmin, refresh]);

  const deletePhoto = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/activities/delete-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ branchName, projectName, type: actType, photoId, projectId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refresh();
        return true;
      } else {
        if (res.status !== 401) alert(`❌ ${data.message || 'Gagal menghapus foto.'}`);
        return false;
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('❌ Terjadi kesalahan saat menghapus foto.');
      return false;
    }
  }, [refresh]);

  return { uploadPhoto, verifyActivity, rejectActivity, deletePhoto };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useOdpSummary.js` (49 baris)

```javascript
import { useMemo } from 'react';
import { flatOdps, computeStats } from '../utils';

// Ringkasan ODP untuk Dashboard: daftar ODP datar, KPI (dioverride nilai resmi Excel bila filter = ALL), chip status ODP
export function useOdpSummary(branches, importMeta, typeDesignFilter) {
  // ─── PRE-COMPUTED DATA (dihitung 1x saat branches/typeDesignFilter berubah, reused saat ganti tab) ───
  const allOdps = useMemo(() => flatOdps(branches, typeDesignFilter), [branches, typeDesignFilter]);

  const kpiRaw = useMemo(() => computeStats(branches, typeDesignFilter), [branches, typeDesignFilter]);

  // Override KPI dengan nilai resmi dari file Excel (Jateng DIY summary) jika filter = ALL
  const kpi = useMemo(() => {
    if (typeDesignFilter === 'ALL' && importMeta && typeof importMeta.occRate === 'number' && !isNaN(importMeta.occRate)) {
      return {
        ...kpiRaw,
        occRate: Math.round(importMeta.occRate * 1000) / 10,  // 0.121 -> 12.1
        // FIX: gunakan != null agar nilai 0 tidak dianggap "kosong" dan fallback ke DB
        totalAvai: importMeta.available != null ? importMeta.available : kpiRaw.totalAvai,
        totalUsed: importMeta.used != null ? importMeta.used : kpiRaw.totalUsed,
        totalPort: importMeta.total != null ? importMeta.total : kpiRaw.totalPort,
        odpCount: kpiRaw.odpCount,
        gapWoW: importMeta.gapWoW,
      };
    }
    const calcRate = kpiRaw.totalPort > 0 ? Math.round((kpiRaw.totalUsed / kpiRaw.totalPort) * 1000) / 10 : 0;
    return { ...kpiRaw, occRate: kpiRaw.occRate || calcRate, gapWoW: null };
  }, [kpiRaw, importMeta, typeDesignFilter]);


  const statusChips = useMemo(() => {
    const counts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0, BLACK: 0 };
    allOdps.forEach(o => {
      const pct = o.total > 0 ? o.used / o.total : 0;
      const calcStatus = o.used === 0 ? 'BLACK' : pct < 0.25 ? 'GREEN' : pct < 0.50 ? 'YELLOW' : pct < 0.75 ? 'ORANGE' : 'RED';
      const status = (o.occStatus || calcStatus).toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return [
      { label: 'Green', count: counts.GREEN || 0, color: '#16a34a' },
      { label: 'Yellow', count: counts.YELLOW || 0, color: '#FFFF00' },
      { label: 'Orange', count: counts.ORANGE || 0, color: '#f97316' },
      { label: 'Red', count: counts.RED || 0, color: '#dc2626' },
      { label: 'Black', count: counts.BLACK || 0, color: '#334155' }
    ];
  }, [allOdps]);

  return { allOdps, kpi, statusChips };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useGtmMonitoring.js` (94 baris)

```javascript
import { useMemo } from 'react';
import { computeStats, BRANCH_COLORS } from '../utils';
import { GAP_WOW_MAP_BY_FILTER, WOK_GAP_WOW_MAP } from '../constants/gapWow';

// Ranking branch (urut OCC terendah) beserta rincian metrik per WOK & Gap WoW
export function useGtmMonitoring(branches, typeDesignFilter) {
  return useMemo(() => {
    return (branches || []).map(b => {
      const st = computeStats([b], typeDesignFilter);
      // Gunakan OCC BRANCH dari kolom Excel jika filter ALL dan b.occRate tersedia, jika tidak gunakan st.occRate
      const occRate = (typeDesignFilter === 'ALL' && b.occRate !== null && b.occRate !== undefined)
        ? Math.round(b.occRate * 1000) / 10
        : st.occRate;

      const bUpper = b.name?.toString().trim().toUpperCase();
      const currentFilterMap = GAP_WOW_MAP_BY_FILTER[typeDesignFilter] || GAP_WOW_MAP_BY_FILTER.ALL;

      let rawGap = 0;
      if (typeDesignFilter !== 'ALL') {
        rawGap = currentFilterMap[bUpper] !== undefined ? currentFilterMap[bUpper] : 0;
      } else {
        const isOldRawSnapshot = b.gapWoW !== null && b.gapWoW !== undefined && b.gapWoW < -0.03 && Math.abs(b.gapWoW - (currentFilterMap[bUpper] || 0)) > 0.02;
        rawGap = (b.gapWoW !== null && b.gapWoW !== undefined && !isOldRawSnapshot)
          ? b.gapWoW
          : (currentFilterMap[bUpper] !== undefined ? currentFilterMap[bUpper] : 0);
      }

      const delta = Math.round(rawGap * 1000) / 10;
      const filteredProjs = (b && Array.isArray(b.projects))
        ? (typeDesignFilter === 'ALL' ? b.projects : b.projects.filter(p => (p.typeDesign || 'Greenfield') === typeDesignFilter))
        : [];

      // Kalkulasi Rincian Metrik per WOK di dalam Branch
      const branchWokNames = Array.from(new Set(
        (b.projects || [])
          .map(p => (p.wok || '').toString().trim())
          .filter(w => w && w !== '-' && w !== 'NONE')
      )).sort();

      const currentWokFilterMap = WOK_GAP_WOW_MAP[typeDesignFilter] || WOK_GAP_WOW_MAP.ALL;
      const actKeys = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];

      const woks = branchWokNames.map(wokName => {
        const cleanWok = wokName.toUpperCase();
        const wokProjects = (b.projects || []).filter(p => {
          const pWok = (p.wok || '').toString().trim().toUpperCase();
          const cleanP = pWok.replace(/[\s-]/g, '');
          const cleanW = cleanWok.replace(/[\s-]/g, '');
          const isWokMatch = pWok === cleanWok || cleanP === cleanW || cleanP.includes(cleanW) || cleanW.includes(cleanP);
          if (!isWokMatch) return false;
          if (typeDesignFilter === 'ALL') return true;
          return (p.typeDesign || 'Greenfield') === typeDesignFilter;
        });

        const wokProjCount = wokProjects.length;
        const wokUsed = wokProjects.reduce((s, p) => s + (p.usedTotal ?? (p.odps || []).reduce((so, o) => so + (o.used || 0), 0)), 0);
        const wokTotal = wokProjects.reduce((s, p) => s + (p.totalPort ?? (p.odps || []).reduce((so, o) => so + (o.total || 0), 0)), 0);
        const wokOccRate = wokTotal > 0 ? Math.round((wokUsed / wokTotal) * 1000) / 10 : 0;

        let verifiedCount = 0;
        wokProjects.forEach(p => {
          actKeys.forEach(k => {
            if (p.activities?.some(a => a.type === k && a.status === 'verified')) {
              verifiedCount++;
            }
          });
        });
        const totalSlots = wokProjCount * 5;
        const wokActPct = totalSlots > 0 ? Math.round((verifiedCount / totalSlots) * 1000) / 10 : 0;

        const wokDeltaKey = `${bUpper}||${cleanWok}`;
        const rawWokDelta = currentWokFilterMap[wokDeltaKey] !== undefined ? currentWokFilterMap[wokDeltaKey] : 0;
        const wokDelta = Math.round(rawWokDelta * 1000) / 10;

        return {
          name: wokName,
          occRate: wokOccRate,
          totalUsed: wokUsed,
          totalPort: wokTotal,
          delta: wokDelta,
          projCount: wokProjCount,
          actPct: wokActPct
        };
      }).filter(w => w.projCount > 0);

      return {
        name: b.name, occRate, projCount: filteredProjs.length, actPct: st.actCompletionPct,
        totalUsed: st.totalUsed, totalPort: st.totalPort,
        color: BRANCH_COLORS[bUpper] || BRANCH_COLORS[b.name] || '#64748b', delta, woks
      };
    }).sort((a, b) => a.occRate - b.occRate);
  }, [branches, typeDesignFilter]);
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useExecutiveSummary.js` (85 baris)

```javascript
import { useMemo } from 'react';
import { BRANCH_WOK_MATRIX, ACT_TYPES_ORDER } from '../constants/dashboard';

// Executive Summary Computation per Branch & WOK (LOP prioritas Greenfield: selesai / belum per jenis kegiatan)
export function useExecutiveSummary(branches) {
  return useMemo(() => {
    let grandTotalLop = 0;
    const grandTotalDone = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
    const grandTotalNotYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

    const rows = [];

    BRANCH_WOK_MATRIX.forEach(group => {
      const bData = (branches || []).find(b => (b.name || '').toString().trim().toUpperCase() === group.branch);
      const allProjects = bData?.projects || [];

      // Filter Greenfield Priority Projects
      const priorityProjects = allProjects.filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      });

      group.woks.forEach((wokName, wIdx) => {
        const wokProjects = priorityProjects.filter(p => {
          const pWok = (p.wok || '').toString().trim().toUpperCase();
          const cleanP = pWok.replace(/[\s-]/g, '');
          const cleanW = wokName.replace(/[\s-]/g, '');
          return pWok === wokName || cleanP === cleanW || cleanP.includes(cleanW) || cleanW.includes(cleanP);
        });

        const lopCount = wokProjects.length;
        grandTotalLop += lopCount;

        const done = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
        const notYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

        ACT_TYPES_ORDER.forEach(item => {
          const k = item.key;
          const verifiedCount = wokProjects.filter(p => p.activities?.some(a => a.type === k && a.status === 'verified')).length;
          done[k] = verifiedCount;
          notYet[k] = lopCount - verifiedCount;

          grandTotalDone[k] += verifiedCount;
          grandTotalNotYet[k] += lopCount - verifiedCount;
        });

        const totalDoneWok = ACT_TYPES_ORDER.reduce((s, item) => s + done[item.key], 0);
        const totalSlotsWok = lopCount * 5;
        const progressPct = totalSlotsWok > 0 ? Math.round((totalDoneWok / totalSlotsWok) * 1000) / 10 : 0;

        rows.push({
          branch: group.branch,
          wok: wokName,
          isFirstInBranch: wIdx === 0,
          isLastInBranch: wIdx === group.woks.length - 1,
          branchRowSpan: group.woks.length,
          lopCount,
          done,
          notYet,
          progressPct
        });
      });
    });

    const grandTotalDoneAll = ACT_TYPES_ORDER.reduce((s, item) => s + grandTotalDone[item.key], 0);
    const grandTotalSlotsAll = grandTotalLop * 5;
    const grandProgressPct = grandTotalSlotsAll > 0 ? Math.round((grandTotalDoneAll / grandTotalSlotsAll) * 1000) / 10 : 0;

    return {
      rows,
      grandTotalLop,
      grandTotalDone,
      grandTotalNotYet,
      grandProgressPct,
      grandTotals: {
        lop: grandTotalLop,
        done: grandTotalDone,
        notYet: grandTotalNotYet,
        progressPct: grandProgressPct
      }
    };
  }, [branches]);
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useExecutiveSummaryExport.js` (61 baris)

```javascript
import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

// Unduh tabel Executive Summary (#executive-summary-wrapper) sebagai gambar PNG
export function useExecutiveSummaryExport() {
  const [isExportingPng, setIsExportingPng] = useState(false);

  const handleDownloadPNG = useCallback(async () => {
    const tableWrapper = document.getElementById('executive-summary-wrapper');
    if (!tableWrapper || isExportingPng) return;

    try {
      setIsExportingPng(true);

      const canvas = await html2canvas(tableWrapper, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedWrapper = clonedDoc.getElementById('executive-summary-wrapper');
          if (clonedWrapper) {
            const clonedTable = clonedWrapper.querySelector('table');
            const totalScrollWidth = Math.max(clonedTable?.scrollWidth || 0, clonedWrapper.scrollWidth || 0, 1250) + 60;

            clonedWrapper.style.maxHeight = 'none';
            clonedWrapper.style.overflowY = 'visible';
            clonedWrapper.style.overflowX = 'visible';
            clonedWrapper.style.width = `${totalScrollWidth}px`;
            clonedWrapper.style.maxWidth = 'none';

            if (clonedTable) {
              clonedTable.style.width = `${totalScrollWidth}px`;
              clonedTable.style.minWidth = `${totalScrollWidth}px`;
            }

            const stickyEls = clonedWrapper.querySelectorAll('[style*="sticky"]');
            stickyEls.forEach(el => {
              el.style.position = 'static';
            });
          }
        }
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Executive_Summary_GTM_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      setIsExportingPng(false);
    }
  }, [isExportingPng]);

  return { isExportingPng, handleDownloadPNG };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useRekapExcelExport.js` (170 baris)

```javascript
import { useCallback } from 'react';
import { formatBranch } from '../utils';

// Export Rekap Excel (Opsi A: Client-side Export seluruh LOP)
export function useRekapExcelExport(branches) {
  return useCallback(async () => {
    const XLSX = await import('xlsx');
    const getActStatusLabel = (act, actTypeKey) => {
      if (!act || !act.status || act.status === 'belum') return 'Belum Dikerjakan';
      let label = act.status === 'verified' ? 'Terverifikasi' : 'Menunggu Verifikasi';
      if (actTypeKey === 'tsel_menyapa' && act.planDate) {
        const dStr = new Date(act.planDate).toISOString().split('T')[0];
        label += ` (Tgl: ${dStr})`;
      } else if (actTypeKey === 'branding_outlet' && act.namaOutlet) {
        label += ` (${act.namaOutlet})`;
      } else if (actTypeKey === 'bumdes' && (act.namaBumdes || act.keterangan)) {
        label += ` (${act.namaBumdes || act.keterangan})`;
      } else if (actTypeKey === 'rekrutmen_sf' && act.keterangan) {
        label += ` (${act.keterangan})`;
      }
      return label;
    };

    const getOverallProjectStatus = (acts) => {
      if (acts.some(a => a.status === 'upload')) return 'Menunggu Verifikasi';
      if (acts.some(a => a.status === 'verified')) return 'Terverifikasi';
      return 'Belum Dikerjakan';
    };

    const dataRows = [];

    (branches || []).forEach(b => {
      const bName = formatBranch(b.name);
      (b.projects || []).forEach(p => {
        const used = p.usedTotal ?? (p.odps || []).reduce((s, o) => s + (o.used || 0), 0);
        const avai = p.avaiTotal ?? (p.odps || []).reduce((s, o) => s + (o.avai || 0), 0);
        const total = p.totalPort ?? (p.odps || []).reduce((s, o) => s + (o.total || 0), 0);
        const occ = total > 0 ? (used / total * 100).toFixed(1) + '%' : '0%';

        const acts = p.activities || [];
        const tselAct = acts.find(a => a.type === 'tsel_menyapa');
        const brandingAct = acts.find(a => a.type === 'branding_outlet');
        const bumdesAct = acts.find(a => a.type === 'bumdes');
        const rekrutmenAct = acts.find(a => a.type === 'rekrutmen_sf');
        const openTableAct = acts.find(a => a.type === 'open_table');

        dataRows.push([
          bName,
          p.wok || '-',
          p.name,
          p.typeDesign || 'Greenfield',
          used,
          avai,
          total,
          occ,
          getActStatusLabel(tselAct, 'tsel_menyapa'),
          getActStatusLabel(brandingAct, 'branding_outlet'),
          getActStatusLabel(bumdesAct, 'bumdes'),
          getActStatusLabel(rekrutmenAct, 'rekrutmen_sf'),
          getActStatusLabel(openTableAct, 'open_table'),
          getOverallProjectStatus(acts)
        ]);
      });
    });

    const dateFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const titleRow1 = ['REKAPITULASI MONITORING AKTIVITAS GTM (GENERATING TRAFFIC & MOVEMENT)'];
    const titleRow2 = [`Tanggal Export: ${dateFormatted} | Total LOP / Proyek: ${dataRows.length}`];
    const emptyRow = [];
    const headerRow = [
      'Branch',
      'WOK',
      'Nama LOP / Proyek',
      'Type Design',
      'Used Port',
      'Avai Port',
      'Total Port',
      'Occupancy Rate (%)',
      'Tsel Menyapa Warga',
      'Branding Outlet',
      'BUMDES',
      'Rekrutmen SF',
      'Open Table',
      'Status LOP'
    ];

    const sheetData = [titleRow1, titleRow2, emptyRow, headerRow, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge judul di baris 1 dan 2 (A1:N1 dan A2:N2)
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }
    ];

    // Style Title Rows A1 & A2
    if (worksheet['A1']) {
      worksheet['A1'].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "0F172A" } },
        alignment: { vertical: "center" }
      };
    }
    if (worksheet['A2']) {
      worksheet['A2'].s = {
        font: { name: "Calibri", sz: 11, italic: true, color: { rgb: "475569" } },
        alignment: { vertical: "center" }
      };
    }

    // Aktifkan AutoFilter bawaan Excel pada baris header (Baris ke-4: A4:N...)
    if (dataRows.length > 0) {
      worksheet['!autofilter'] = { ref: `A4:N${3 + dataRows.length}` };
    }

    // Styling background Telkomsel Red (#800000) & bold putih untuk baris header A4:N4
    const headerCols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
    headerCols.forEach(col => {
      const cellRef = `${col}4`;
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: "C8102E" } // Telkomsel Red (#800000)
          },
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: { rgb: "FFFFFF" } // White text
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          },
          border: {
            top: { style: "thin", color: { rgb: "BFBFBF" } },
            bottom: { style: "thin", color: { rgb: "BFBFBF" } },
            left: { style: "thin", color: { rgb: "BFBFBF" } },
            right: { style: "thin", color: { rgb: "BFBFBF" } }
          }
        };
      }
    });

    const colWidths = [
      { wch: 16 }, // Branch
      { wch: 22 }, // WOK
      { wch: 32 }, // Nama LOP
      { wch: 14 }, // Type Design
      { wch: 10 }, // Used
      { wch: 10 }, // Avai
      { wch: 10 }, // Total
      { wch: 18 }, // OCC Rate
      { wch: 30 }, // Tsel Menyapa
      { wch: 22 }, // Branding
      { wch: 22 }, // BUMDES
      { wch: 30 }, // Rekrutmen SF
      { wch: 22 }, // Open Table
      { wch: 24 }  // Status LOP
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap LOP');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Rekap_GTM_Activity_${todayStr}.xlsx`);
  }, [branches]);
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useOdpImport.js` (92 baris)

```javascript
import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { watchJobEvents } from '../jobEvents';

// Update Data ODP mingguan (Excel) → diproses worker latar belakang, progres via SSE. onUpdate = muat ulang data monitoring.
export function useOdpImport({ onUpdate }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  // Progres import ODP dari worker latar belakang (ditampilkan di teks tombol)
  const [importProgress, setImportProgress] = useState('');
  const importAbortRef = useRef(null);
  useEffect(() => () => importAbortRef.current?.abort(), []);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);
    setImportProgress('');

    const formData = new FormData();
    formData.append('file', file);
    const abortController = new AbortController();
    importAbortRef.current = abortController;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/admin/import-excel`, {
        method: 'POST',
        body: formData
      });

      const contentType = response.headers.get('content-type') || '';
      let result = {};
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textErr = await response.text();
        throw new Error(`Server mengembalikan respon non-JSON (${response.status}): ${textErr.slice(0, 120)}...`);
      }

      let succeeded = response.ok && result.success;
      // 202 = file diterima & diproses worker latar belakang → pantau progres (SSE) sampai selesai
      if (response.status === 202 && result.jobId) {
        setImportProgress('Menunggu antrean');
        const outcome = await watchJobEvents(`${API_BASE_URL}/api/admin/import-excel/${result.jobId}/events`, {
          signal: abortController.signal,
          onProgress: (job) => {
            if (job.state === 'waiting' || job.state === 'delayed') setImportProgress('Menunggu antrean');
            else if (job.progress?.stage) setImportProgress(`${job.progress.stage} ${job.progress.percent}%`);
          }
        });
        result = outcome.event === 'completed' ? (outcome.data.result || {}) : (outcome.data.error?.body || {});
        succeeded = outcome.event === 'completed' && !!result.success;
      }

      if (succeeded) {
        setMessage(result.message || 'Database berhasil diperbarui dengan data Excel baru!');
        setFile(null);
        if (onUpdate) onUpdate();
      } else if (response.status === 401) {
        setError(result.message || result.error || 'Sesi login Admin telah berakhir. Silakan login kembali.');
      } else {
        setError(result.message || result.error || 'Gagal mengunggah dan memperbarui database.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // panel ditutup; import tetap berjalan di server
      setError(err.message || 'Terjadi kesalahan koneksi ke server. Pastikan server backend sedang berjalan.');
      console.error(err);
    } finally {
      setLoading(false);
      setImportProgress('');
    }
  };

  return { file, setFile, loading, importProgress, message, setMessage, error, setError, handleFileChange, handleUpload };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/usePairingImport.js` (86 baris)

```javascript
import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { watchJobEvents } from '../jobEvents';

// Update Data Tsel One Pairing (Excel) → diproses worker latar belakang, progres via SSE
export function usePairingImport() {
  const [pairingFile, setPairingFile] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  // Progres import pairing dari worker latar belakang (ditampilkan di teks tombol)
  const [pairingProgress, setPairingProgress] = useState('');
  const pairingAbortRef = useRef(null);
  useEffect(() => () => pairingAbortRef.current?.abort(), []);
  const [pairingMessage, setPairingMessage] = useState(null);
  const [pairingError, setPairingError] = useState(null);

  const handlePairingUpload = async (e) => {
    e.preventDefault();
    if (!pairingFile) {
      setPairingError('Pilih file Excel Tsel One Pairing terlebih dahulu.');
      return;
    }

    setPairingLoading(true);
    setPairingMessage('Sedang mengunggah & mengindeks data pairing... Harap tunggu (±15-20 detik)...');
    setPairingError(null);
    setPairingProgress('');

    const formData = new FormData();
    formData.append('file', pairingFile);
    const abortController = new AbortController();
    pairingAbortRef.current = abortController;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/upload-pairing-excel`, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Sesi login Admin telah berakhir atau tidak sah (Status 401/403). Silakan tekan tombol Log Out lalu masuk kembali.');
        }
        throw new Error(data.error || data.message || `Gagal mengunggah file Tsel One Pairing (Status ${res.status}).`);
      }

      // 202 = file diterima & diproses worker latar belakang → pantau progres (SSE) sampai selesai
      if (res.status === 202 && data.jobId) {
        setPairingProgress('Menunggu antrean');
        const outcome = await watchJobEvents(`${API_BASE_URL}/api/admin/upload-pairing-excel/${data.jobId}/events`, {
          signal: abortController.signal,
          onProgress: (job) => {
            if (job.state === 'waiting' || job.state === 'delayed') setPairingProgress('Menunggu antrean');
            else if (job.progress?.stage) setPairingProgress(`${job.progress.stage} ${job.progress.percent}%`);
          }
        });
        if (outcome.event !== 'completed') {
          const body = outcome.data.error?.body || {};
          throw new Error(body.error || body.message || 'Gagal memproses file Excel pairing.');
        }
        data = outcome.data.result || {};
      }

      setPairingMessage(data.message || 'Berhasil mengimpor Data Tsel One Pairing!');
      setPairingFile(null);
    } catch (err) {
      if (err.name === 'AbortError') return; // panel ditutup; import tetap berjalan di server
      setPairingMessage(null);
      setPairingError(err.message || 'Terjadi kesalahan saat upload file Tsel One Pairing.');
    } finally {
      setPairingLoading(false);
      setPairingProgress('');
    }
  };

  return { pairingFile, setPairingFile, pairingLoading, pairingProgress, pairingMessage, setPairingMessage, pairingError, setPairingError, handlePairingUpload };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/usePairingSearch.js` (27 baris)

```javascript
import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL, authFetch } from '../apiConfig';

// GET /api/pairing/search — cari Tsel One Pairing berdasarkan BB ID / Order ID / MSISDN.
// Dipicu tombol cari (bukan otomatis), jadi memakai useMutation: status loading/error terpadu & request tidak dobel.
async function searchPairing(cleanQ) {
  const res = await authFetch(`${API_BASE_URL}/api/pairing/search?q=${encodeURIComponent(cleanQ)}`);
  const contentType = res.headers.get('content-type') || '';

  let data = {};
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Terjadi kesalahan saat mencari data pairing (Status ${res.status}).`);
  }
  return data;
}

export function usePairingSearch() {
  return useMutation({ mutationFn: searchPairing });
}

```

---

## File: `gtm-monitor-frontend/src/hooks/usePrograms.js` (31 baris)

```javascript
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPrograms, queryKeys } from '../api/queries';

const EMPTY = [];

// Semua periode untuk menu PROGRAM di navigasi: { [label bulan]: { programs } }
export function useProgramMonths() {
  const query = useQuery({ queryKey: queryKeys.programs('all'), queryFn: () => fetchPrograms('all') });
  const monthsData = useMemo(() => {
    const data = query.data;
    if (data && data.monthsData) return data.monthsData;
    if (data && data.programs) return { 'Agustus 2026': { programs: data.programs } };
    return {};
  }, [query.data]);
  if (query.error) console.error('Error fetching dynamic programs:', query.error);
  return monthsData;
}

// Daftar program terdaftar untuk satu periode (form upload & hapus program di Control Panel)
export function useProgramsForMonth(month) {
  const query = useQuery({ queryKey: queryKeys.programs(month), queryFn: () => fetchPrograms(month) });
  return query.data?.programs ?? EMPTY;
}

// Dipanggil setelah program diunggah / dihapus: seluruh daftar program (menu & form) diambil ulang
export function useInvalidatePrograms() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.programsAll }), [queryClient]);
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useProgramUpload.js` (84 baris)

```javascript
import { useState } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useProgramsForMonth, useInvalidatePrograms } from './usePrograms';

// Upload gambar Tracking Program bulanan (Cloudinary + pindai link OCR)
export function useProgramUpload() {
  const [programFile, setProgramFile] = useState(null);
  const [programMonthLabel, setProgramMonthLabel] = useState('Agustus 2026');
  const [programName, setProgramName] = useState('');
  const [programDetailUrl, setProgramDetailUrl] = useState('');
  const [programLoading, setProgramLoading] = useState(false);
  const [programMessage, setProgramMessage] = useState(null);
  const [programError, setProgramError] = useState(null);
  const [programResultUpload, setProgramResultUpload] = useState(null);
  const uploadAvailablePrograms = useProgramsForMonth(programMonthLabel);
  const invalidatePrograms = useInvalidatePrograms();

  const handleProgramUpload = async (e) => {
    e.preventDefault();
    if (!programFile) {
      setProgramError('Pilih file gambar tracking program (.jpg, .png) terlebih dahulu.');
      return;
    }

    const finalProgramName = programName.trim();
    if (!finalProgramName) {
      setProgramError('Masukkan nama program terlebih dahulu.');
      return;
    }

    setProgramLoading(true);
    setProgramMessage('Mengunggah ke Cloudinary & memindai link otomatis (OCR)... Harap tunggu...');
    setProgramError(null);
    setProgramResultUpload(null);

    const formData = new FormData();
    formData.append('file', programFile);
    formData.append('monthLabel', programMonthLabel);
    formData.append('programName', finalProgramName);
    if (programDetailUrl) {
      formData.append('detailUrl', programDetailUrl.trim());
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/upload-program-image`, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${textErr.slice(0, 120)}...`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Gagal mengunggah gambar program (Status ${res.status}).`);
      }

      setProgramMessage(data.message || `Berhasil mengunggah Gambar Program "${finalProgramName}" (${programMonthLabel}) ke Cloudinary!`);
      setProgramResultUpload(data);
      setProgramFile(null);
      setProgramName('');
      setProgramDetailUrl('');
      // Daftar program (menu PROGRAM & form di panel ini) diambil ulang
      invalidatePrograms();
    } catch (err) {
      console.error('Program Image Upload Error:', err);
      setProgramError(err.message);
    } finally {
      setProgramLoading(false);
    }
  };

  return {
    programFile, setProgramFile, programMonthLabel, setProgramMonthLabel, programName, setProgramName,
    programDetailUrl, setProgramDetailUrl, programLoading, programMessage, setProgramMessage,
    programError, setProgramError, programResultUpload, uploadAvailablePrograms, handleProgramUpload
  };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useProgramDelete.js` (65 baris)

```javascript
import { useState } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useProgramsForMonth, useInvalidatePrograms } from './usePrograms';

// Kelola & hapus program terdaftar per periode
export function useProgramDelete() {
  const [deleteProgramMonth, setDeleteProgramMonth] = useState('Agustus 2026');
  const [deleteProgramTarget, setDeleteProgramTarget] = useState('ALL');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const deleteAvailablePrograms = useProgramsForMonth(deleteProgramMonth);
  const invalidatePrograms = useInvalidatePrograms();

  const handleExecuteDeleteProgram = async () => {
    setDeleteLoading(true);
    setDeleteMessage(null);
    setDeleteError(null);
    setShowDeleteConfirmModal(false);

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/programs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monthLabel: deleteProgramMonth,
          programName: deleteProgramTarget
        })
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        throw new Error(`Server mengembalikan respon (${res.status}): ${textErr.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Gagal menghapus program (Status ${res.status}).`);
      }

      setDeleteMessage(data.message || 'Program berhasil dihapus.');
      setDeleteProgramTarget('ALL');
      // Daftar program (menu PROGRAM & form di panel ini) diambil ulang
      invalidatePrograms();
    } catch (err) {
      console.error('Delete Program Error:', err);
      setDeleteError(err.message || 'Terjadi kesalahan saat menghapus program.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    deleteProgramMonth, setDeleteProgramMonth, deleteProgramTarget, setDeleteProgramTarget,
    deleteAvailablePrograms, deleteLoading, deleteMessage, setDeleteMessage, deleteError, setDeleteError,
    showDeleteConfirmModal, setShowDeleteConfirmModal, handleExecuteDeleteProgram
  };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useAdminMonitoring.js` (98 baris)

```javascript
import { useState, useMemo } from 'react';
import { computeStats } from '../utils';

// Tab "Monitoring & Verifikasi Proyek": LOP prioritas, filter branch / status / pencarian & statistik terkait
export function useAdminMonitoring(branches) {
  const priorityBranches = useMemo(() => {
    return (branches || []).map(b => ({
      ...b,
      projects: (b.projects || []).filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      })
    })).filter(b => b.projects && b.projects.length > 0);
  }, [branches]);

  const totalProjects = useMemo(() => priorityBranches.reduce((s, b) => s + (b.projects?.length || 0), 0), [priorityBranches]);

  // Monitoring Filters States
  const [selectedBranch, setSelectedBranch] = useState('Semua Branch');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'need_review' | 'verified' | 'pending'
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Filter Branches and Projects for Monitoring Tab
  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return priorityBranches;
    return priorityBranches.filter(b => b.name === selectedBranch);
  }, [priorityBranches, selectedBranch]);

  // Dynamic KPI stats recalculated based on the selected branch filter
  const stats = useMemo(() => computeStats(filteredBranches), [filteredBranches]);

  // Hitung jumlah proyek per status filter (Semua, Menunggu Verifikasi, Sudah Terverifikasi, Belum Dikerjakan)
  const statusCounts = useMemo(() => {
    let needReviewCount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;
    let totalCount = 0;

    filteredBranches.forEach(b => {
      (b.projects || []).forEach(p => {
        totalCount++;
        const acts = p.activities || [];
        if (acts.some(a => a.status === 'upload')) {
          needReviewCount++;
        } else if (acts.some(a => a.status === 'verified')) {
          verifiedCount++;
        } else if (acts.length === 0 || acts.every(a => a.status === 'belum')) {
          pendingCount++;
        }
      });
    });

    return {
      all: totalCount,
      need_review: needReviewCount,
      verified: verifiedCount,
      pending: pendingCount
    };
  }, [filteredBranches]);

  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      let projs = (b.projects || []).filter(p => 
        !s || 
        p.name.toLowerCase().includes(s) || 
        (p.wok && p.wok.toLowerCase().includes(s)) ||
        (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
      );

      // Apply status filter
      if (statusFilter === 'need_review') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'upload'));
      } else if (statusFilter === 'verified') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'verified'));
      } else if (statusFilter === 'pending') {
        projs = projs.filter(p => !p.activities || p.activities.length === 0 || p.activities.every(a => a.status === 'belum'));
      }

      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search, statusFilter]);

  const allProjectsMultiBranch = useMemo(() => {
    return branchesWithFilteredProjects.flatMap(b => b.projects.map(p => ({ ...p, branchName: b.name })));
  }, [branchesWithFilteredProjects]);

  return {
    priorityBranches, totalProjects,
    selectedBranch, setSelectedBranch, search, setSearch, statusFilter, setStatusFilter,
    isBranchDropdownOpen, setIsBranchDropdownOpen, isStatusDropdownOpen, setIsStatusDropdownOpen,
    filteredBranches, stats, statusCounts, branchesWithFilteredProjects, allProjectsMultiBranch
  };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useProjectReviewModal.js` (33 baris)

```javascript
import { useState } from 'react';

// Modal review proyek (foto kegiatan, verifikasi/tolak) — dibuka dari tabel proyek
export function useProjectReviewModal(branches) {
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey) {
    const [bName, pName] = modalKey.split('||');
    const b = branches.find(x => x.name === bName);
    const p = b?.projects?.find(x => x.name === pName);
    if (p) {
      const totalAvai = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalUsed = p.odps.reduce((s, o) => s + o.used, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);

      modalData = {
        bName, pName, wok: p.wok,
        projectId: p.id,
        odps: p.odps,
        totalAvai, totalUsed, totalPort,
        odpCount: p.odps.length,
        activities: p.activities || []
      };
    }
  }

  return { modalData, openModal, closeModal };
}

```

---

## File: `gtm-monitor-frontend/src/hooks/useCountUp.js` (102 baris)

```javascript
import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp hook
 * Animates a numeric value from startVal (or previous value) to targetVal
 * Uses cubic ease-out: 1 - Math.pow(1 - progress, 3)
 * Respects prefers-reduced-motion and in-view enabled trigger
 *
 * @param {number} targetValue - Target number to count up to
 * @param {object} options
 * @param {boolean} [options.enabled=true] - Only start animation when enabled is true
 * @param {number} [options.duration=800] - Duration in ms
 * @param {number} [options.decimals=0] - Decimal places
 * @param {number} [options.delay=0] - Delay in ms before starting
 * @param {boolean} [options.formatThousands=true] - Format with id-ID thousand separator
 * @returns {string} Formatted display value
 */
export function useCountUp(targetValue = 0, {
  enabled = true,
  duration = 800,
  decimals = 0,
  delay = 0,
  formatThousands = true
} = {}) {
  const isReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [displayValue, setDisplayValue] = useState(() => (isReducedMotion ? (Number(targetValue) || 0) : 0));
  
  const prevTargetRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // If not enabled yet, keep at 0
    if (!enabled) {
      return;
    }

    const endVal = Number(targetValue) || 0;

    if (isReducedMotion) {
      setDisplayValue(endVal);
      prevTargetRef.current = endVal;
      return;
    }

    const startVal = prevTargetRef.current;
    if (startVal === endVal && displayValue === endVal) {
      return;
    }

    const startTime = performance.now() + delay;

    const animate = (currentTime) => {
      if (currentTime < startTime) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Natural cubic ease-out
      const easeProgress = 1 - Math.pow(1 - rawProgress, 3);
      const currentVal = startVal + (endVal - startVal) * easeProgress;

      setDisplayValue(currentVal);

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        prevTargetRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetValue, duration, delay, isReducedMotion, enabled]);

  const numVal = Number(displayValue) || 0;

  if (decimals > 0) {
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(numVal * factor) / factor;
    return rounded.toFixed(decimals);
  }

  const roundedInt = Math.round(numVal);
  if (formatThousands) {
    return roundedInt.toLocaleString('id-ID');
  }
  return String(roundedInt);
}

export default useCountUp;

```

---

## File: `gtm-monitor-frontend/src/hooks/useInView.js` (55 baris)

```javascript
import { useState, useEffect, useRef } from 'react';

/**
 * useInView hook
 * Observes an element and returns whether it is currently visible in the viewport.
 * 
 * @param {object} options
 * @param {number} [options.threshold=0.15] - Percentage of target visible before triggering
 * @param {string} [options.rootMargin='-40px 0px'] - Margin around the root
 * @param {boolean} [options.triggerOnce=true] - Only trigger once or continuously track
 * @returns {[React.RefObject, boolean]} [ref, isInView]
 */
export function useInView({
  threshold = 0.15,
  rootMargin = '-20px 0px',
  triggerOnce = true
} = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView];
}

export default useInView;

```

---

## File: `gtm-monitor-frontend/src/hooks/useLastUpdateLabel.js` (44 baris)

```javascript
import { useMemo } from 'react';

// Label "Pembaruan data: 21 Oktober 2026" — dari ImportMeta, atau aktivitas terbaru bila ImportMeta kosong
export function useLastUpdateLabel(importMeta, branches) {
  return useMemo(() => {
    let rawDate = importMeta?.updatedAt || importMeta?.lastUpdate;

    if (!rawDate && branches && branches.length > 0) {
      let latestTime = 0;
      branches.forEach(b => {
        (b.projects || []).forEach(p => {
          (p.activities || []).forEach(a => {
            if (a.updatedAt) {
              const t = new Date(a.updatedAt).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
            if (a.actualDate) {
              const t = new Date(a.actualDate).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
          });
        });
      });
      if (latestTime > 0) {
        rawDate = new Date(latestTime);
      }
    }

    if (!rawDate) {
      rawDate = new Date();
    }

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;

    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return `${d.getDate()} ${monthsIndo[d.getMonth()]} ${d.getFullYear()}`;
  }, [importMeta, branches]);
}

```

---

