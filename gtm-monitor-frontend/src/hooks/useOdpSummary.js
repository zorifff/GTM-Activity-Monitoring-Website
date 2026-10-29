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
