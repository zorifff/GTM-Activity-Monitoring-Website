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
