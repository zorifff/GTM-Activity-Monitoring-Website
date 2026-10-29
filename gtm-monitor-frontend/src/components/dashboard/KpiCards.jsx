import { useState, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── SECTION 1: 4 KPI CARDS (RESPONSIVE 1-ROW GRID, COMPACT & PURPOSEFUL) ───
export default function KpiCards({ safeKpi, safeStatusChips, isInView = true }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const mountTimer = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(mountTimer);
  }, []);

  // Animated numbers using useCountUp, only starting when isInView is true
  const isOccDecimal = Number(safeKpi.occRate) % 1 !== 0;
  const countOccRate = useCountUp(safeKpi.occRate, { enabled: isInView, decimals: isOccDecimal ? 1 : 0, duration: 800 });
  const countTotalUsed = useCountUp(safeKpi.totalUsed, { enabled: isInView, duration: 750 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 750 });
  const countTotalAvai = useCountUp(safeKpi.totalAvai, { enabled: isInView, duration: 850 });
  const countOdpCount = useCountUp(safeKpi.odpCount, { enabled: isInView, duration: 800 });
  const countActCompletionPct = useCountUp(safeKpi.actCompletionPct, { enabled: isInView, decimals: Number(safeKpi.actCompletionPct) % 1 !== 0 ? 1 : 0, duration: 850 });
  const countActVerified = useCountUp(safeKpi.actVerified, { enabled: isInView, duration: 750 });
  const countActUploaded = useCountUp(safeKpi.actUploaded, { enabled: isInView, duration: 750 });
  const pendingCount = safeKpi.actPending || safeKpi.actBelum || 0;
  const countActPending = useCountUp(pendingCount, { enabled: isInView, duration: 750 });

  return (
    <div className="kpi-grid-4">
      {/* ─── CARD 1: TOTAL OCCUPANCY RATE ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-1">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Total Occupancy Rate
          </span>
          {safeKpi.gapWoW != null && (
            <span className={safeKpi.gapWoW > 0 ? 'gap-badge-pos' : safeKpi.gapWoW < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
              {safeKpi.gapWoW > 0 ? `+${safeKpi.gapWoW}%` : `${safeKpi.gapWoW}%`} WoW
            </span>
          )}
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countOccRate}%
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView ? `${Math.min(safeKpi.occRate, 100)}%` : '0%', 
                background: '#0F172A', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          {countTotalUsed} dari {countTotalPort} port terpakai
        </div>
      </div>

      {/* ─── CARD 2: PORT TERSEDIA ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Port Tersedia
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Kapasitas
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countTotalAvai}
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView && safeKpi.totalPort > 0 ? `${Math.min((safeKpi.totalAvai / safeKpi.totalPort) * 100, 100)}%` : '0%', 
                background: '#64748B', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          Total kapasitas {countTotalPort} port di {countOdpCount} ODP
        </div>
      </div>

      {/* ─── CARD 3: TOTAL ODP TERPANTAU ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Total ODP Terpantau
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Cakupan
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countOdpCount}
          </div>

          {/* Multi-color stacked bar horizontal (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
            {safeKpi.odpCount > 0 ? (
              safeStatusChips.map(s => {
                const sharePct = (s.count / safeKpi.odpCount) * 100;
                if (sharePct <= 0) return null;
                return (
                  <div 
                    key={s.label}
                    title={`${s.label}: ${s.count}`}
                    className="progress-bar-fill"
                    style={{
                      height: '100%',
                      width: isMounted && isInView ? `${sharePct}%` : '0%',
                      background: s.color
                    }}
                  />
                );
              })
            ) : (
              <div style={{ height: '100%', width: '0%', background: '#64748B' }} />
            )}
          </div>
        </div>

        {/* Legenda titik warna inline (G, Y, O, R, B) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          {safeStatusChips.map(s => (
            <span 
              key={s.label} 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '3.5px', 
                fontSize: '11px', 
                color: '#475569', 
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, border: s.color?.toUpperCase() === '#FFFF00' ? '1px solid #CBD5E1' : 'none', boxSizing: 'border-box', display: 'inline-block' }} />
              <span>{s.label[0]}: {s.count.toLocaleString('id-ID')}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── CARD 4: AKTIVITAS GTM SELESAI ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Aktivitas GTM Selesai
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Verifikasi
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countActCompletionPct}%
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView ? `${Math.min(safeKpi.actCompletionPct, 100)}%` : '0%', 
                background: '#0F172A', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          {countActVerified} terverifikasi · {countActUploaded} diunggah · {countActPending} belum
        </div>
      </div>
    </div>
  );
}
