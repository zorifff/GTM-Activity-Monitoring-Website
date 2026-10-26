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

    // Styling background Telkomsel Red (#C8102E) & bold putih untuk baris header A4:N4
    const headerCols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
    headerCols.forEach(col => {
      const cellRef = `${col}4`;
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: "C8102E" } // Telkomsel Red (#C8102E)
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
