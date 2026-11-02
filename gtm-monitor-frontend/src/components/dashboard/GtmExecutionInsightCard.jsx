import { memo, useMemo } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── 5 PILAR AKTIVITAS GTM CARD (SEJAJAR VERTIKAL DENGAN EXECUTIVE SUMMARY) ───
const GtmExecutionInsightCard = memo(function GtmExecutionInsightCard({
  branches = [],
  isInView = true
}) {
  // Hitung progres real 5 pilar aktivitas GTM
  const pillarStats = useMemo(() => {
    const counts = {
      tsel_menyapa: { verified: 0, pending: 0, belum: 0, total: 0 },
      branding_outlet: { verified: 0, pending: 0, belum: 0, total: 0 },
      bumdes: { verified: 0, pending: 0, belum: 0, total: 0 },
      rekrutmen_sf: { verified: 0, pending: 0, belum: 0, total: 0 },
      open_table: { verified: 0, pending: 0, belum: 0, total: 0 }
    };

    (branches || []).forEach((b) => {
      (b.projects || []).forEach((p) => {
        const acts = p.activities || [];
        const keys = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];
        keys.forEach((key) => {
          counts[key].total++;
          const act = acts.find((a) => a.type === key);
          if (act?.status === 'verified') {
            counts[key].verified++;
          } else if (act?.status === 'upload' || act?.status === 'menunggu_verifikasi') {
            counts[key].pending++;
          } else {
            counts[key].belum++;
          }
        });
      });
    });

    return [
      { key: 'tsel_menyapa', label: 'Telkomsel Menyapa', desc: 'Edukasi & penetrasi warga cluster', ...counts.tsel_menyapa },
      { key: 'branding_outlet', label: 'Branding Outlet', desc: 'Visibilitas & promosi outlet mitra', ...counts.branding_outlet },
      { key: 'bumdes', label: 'Kerjasama BUMDes', desc: 'Kemitraan badan usaha desa', ...counts.bumdes },
      { key: 'rekrutmen_sf', label: 'Rekrutmen Sales Force', desc: 'Akuisisi armada sales lapangan', ...counts.rekrutmen_sf },
      { key: 'open_table', label: 'Open Table', desc: 'Penjualan langsung on-the-spot', ...counts.open_table }
    ];
  }, [branches]);

  const totalSlots = pillarStats.reduce((acc, p) => acc + p.total, 0);
  const animTotalSlots = useCountUp(totalSlots, { enabled: isInView, duration: 800 });

  return (
    <div
      className="saas-card gtm-insight-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      {/* Header 5 Pilar Aktivitas GTM */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '8px' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
          5 Pilar Aktivitas GTM
        </span>
        <span
          style={{
            fontSize: '12px',
            color: '#64748B',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          Total {animTotalSlots} Slot
        </span>
      </div>

      {/* 5 Pilar List terdistribusi rapi secara vertikal */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around', gap: '14px', padding: '6px 0' }}>
        {pillarStats.map((pillar) => {
          const pct = pillar.total > 0 ? Math.round((pillar.verified / pillar.total) * 100) : 0;
          return (
            <div key={pillar.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  {pillar.label}
                </span>
                <span style={{ color: '#0F172A', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  <span>
                    {pillar.verified}
                  </span>
                  /{pillar.total}{' '}
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
                    ({pct}%)
                  </span>
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '7px',
                  borderRadius: '9999px',
                  backgroundColor: '#F1F5F9',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: '100%',
                    backgroundColor: pct >= 80 ? '#16A34A' : pct > 0 ? '#F59E0B' : '#CBD5E1',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GtmExecutionInsightCard;
