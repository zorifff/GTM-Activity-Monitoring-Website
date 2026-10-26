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
          delta: wokDelta,
          projCount: wokProjCount,
          actPct: wokActPct
        };
      }).filter(w => w.projCount > 0);

      return {
        name: b.name, occRate, projCount: filteredProjs.length, actPct: st.actCompletionPct,
        color: BRANCH_COLORS[bUpper] || BRANCH_COLORS[b.name] || '#64748b', delta, woks
      };
    }).sort((a, b) => a.occRate - b.occRate);
  }, [branches, typeDesignFilter]);
}
