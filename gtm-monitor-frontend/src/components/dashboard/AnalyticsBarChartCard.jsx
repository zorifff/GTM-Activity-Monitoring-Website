import { useState, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// Formatter nama WOK agar muat proporsional dan jelas pada x-axis histogram
function formatWokLabel(name) {
  if (!name) return '';
  const upper = name.trim().toUpperCase();
  if (upper.includes('WONOSOBO')) return 'WONOSOBO';
  if (upper.includes('CILACAP')) return 'CILACAP';
  if (upper.includes('PEMALANG')) return 'PEMALANG';
  if (upper.includes('TEGAL')) return 'TEGAL';
  if (upper.includes('MAGELANG')) return 'MAGELANG';
  if (upper.includes('JEPARA') || upper.includes('KUDUS') || upper.includes('PATI')) return 'KUDUS-PATI';
  if (upper === 'SEMARANG 1' || upper.includes('SEMARANG 1')) return 'SMG 1';
  if (upper === 'SEMARANG 2' || upper.includes('SEMARANG 2')) return 'SMG 2';
  if (upper === 'YOGYAKARTA 1' || upper.includes('YOGYA 1')) return 'YOGYA 1';
  if (upper === 'YOGYAKARTA 2' || upper.includes('YOGYA 2')) return 'YOGYA 2';
  if (upper.includes('BOYOLALI')) return 'BOYOLALI';
  if (upper.includes('SRAGEN')) return 'SRAGEN';
  if (upper.includes('SURAKARTA') || upper.includes('SOLO')) return 'SURAKARTA';
  if (upper.includes('BATANG')) return 'BATANG';
  if (upper.includes('KEBUMEN')) return 'KEBUMEN';
  if (upper.includes('DEMAK')) return 'DEMAK';

  const firstWord = upper.split(/[\s-]+/)[0];
  return firstWord.length <= 9 ? firstWord : upper.slice(0, 8);
}

// ─── KARTU ANALITIK (ANTI-SLOP GENUINE TELEMETRY & HISTOGRAM) ───
export default function AnalyticsBarChartCard({
  safeKpi,
  safeStatusChips,
  ranking = [],
  branches = [],
  lastUpdateFormatted,
  isInView = true,
  onSelectBranch
}) {
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Trigger animasi pertumbuhan bar saat komponen masuk ke viewport
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  // Animated counters
  const countTotalAvai = useCountUp(safeKpi.totalAvai, { enabled: isInView, duration: 800 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 800 });
  const countOdpCount = useCountUp(safeKpi.odpCount, { enabled: isInView, duration: 800 });
  const countActVerified = useCountUp(safeKpi.actVerified, { enabled: isInView, duration: 750 });
  const pendingCount = safeKpi.actPending || 0;
  const countActPending = useCountUp(pendingCount, { enabled: isInView, duration: 750 });
  const countActBelum = useCountUp(safeKpi.actBelum || 0, { enabled: isInView, duration: 850 });
  const isActDecimal = Number(safeKpi.actCompletionPct) % 1 !== 0;
  const countActCompletionPct = useCountUp(safeKpi.actCompletionPct, { enabled: isInView, decimals: isActDecimal ? 1 : 0, duration: 850 });

  // Siapkan Histogram Bars dari data ranking dan branches asli (tanpa mock)
  const branchList = Array.isArray(ranking) && ranking.length > 0 ? ranking : branches;

  const histogramBars = [];
  branchList.forEach((b) => {
    // Cari data proyek lengkap dari cabang terkait untuk verifikasi kalkulasi port
    const rawBranch = branches.find(br => (br.name || '').toUpperCase() === (b.name || '').toUpperCase()) || b;
    const branchProjects = rawBranch.projects || [];

    if (b.woks && b.woks.length > 0) {
      b.woks.forEach((w) => {
        let portUsed = w.totalUsed;
        let portTotal = w.totalPort;

        // Fallback agregasi langsung dari proyek jika properti total belum terhitung
        if (portTotal === undefined || portTotal === null || portTotal === 0) {
          const cleanW = (w.name || '').toUpperCase().replace(/[\s-]/g, '');
          const matchingProjs = branchProjects.filter(p => {
            const pWok = (p.wok || '').toUpperCase().replace(/[\s-]/g, '');
            return pWok === cleanW || pWok.includes(cleanW) || cleanW.includes(pWok);
          });
          portUsed = matchingProjs.reduce((s, p) => s + (p.usedTotal ?? (p.odps || []).reduce((so, o) => so + (o.used || 0), 0)), 0);
          portTotal = matchingProjs.reduce((s, p) => s + (p.totalPort ?? (p.odps || []).reduce((so, o) => so + (o.total || 0), 0)), 0);
        }

        const safePortTotal = portTotal > 0 ? portTotal : 1;
        const occRate = w.occRate !== undefined && w.occRate !== null
          ? w.occRate
          : Math.round(((portUsed || 0) / safePortTotal) * 1000) / 10;

        histogramBars.push({
          id: `${b.name}-${w.name}`,
          branchName: b.name,
          displayName: w.name,
          shortWokLabel: formatWokLabel(w.name),
          occRate,
          portUsed: portUsed || 0,
          portTotal: portTotal || 0,
          portAvai: Math.max((portTotal || 0) - (portUsed || 0), 0),
          delta: w.delta ?? 0,
          branchCode: b.name.slice(0, 3).toUpperCase()
        });
      });
    } else {
      let portUsed = b.totalUsed;
      let portTotal = b.totalPort;

      if (portTotal === undefined || portTotal === null || portTotal === 0) {
        portUsed = branchProjects.reduce((s, p) => s + (p.usedTotal ?? (p.odps || []).reduce((so, o) => so + (o.used || 0), 0)), 0);
        portTotal = branchProjects.reduce((s, p) => s + (p.totalPort ?? (p.odps || []).reduce((so, o) => so + (o.total || 0), 0)), 0);
      }

      const safePortTotal = portTotal > 0 ? portTotal : 1;
      const occRate = b.occRate !== undefined && b.occRate !== null
        ? b.occRate
        : Math.round(((portUsed || 0) / safePortTotal) * 1000) / 10;

      histogramBars.push({
        id: b.name,
        branchName: b.name,
        displayName: b.name,
        shortWokLabel: formatWokLabel(b.name),
        occRate,
        portUsed: portUsed || 0,
        portTotal: portTotal || 0,
        portAvai: Math.max((portTotal || 0) - (portUsed || 0), 0),
        delta: b.delta ?? 0,
        branchCode: b.name.slice(0, 3).toUpperCase()
      });
    }
  });

  const maxTotalPort = Math.max(...histogramBars.map(h => h.portTotal), 1000);
  const activeBar = hoveredBarIndex !== null ? histogramBars[hoveredBarIndex] : null;

  return (
    <div
      className="saas-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px 26px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        minHeight: '260px'
      }}
    >
      {/* ─── ROW ATAS: METRICS SUMMARY (STABLE FIXED-WIDTH COLUMNS TO PREVENT SHAKING) ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' }}>
          {/* Metrik 1: Port Tersedia (Stable Width) */}
          <div style={{ minWidth: '150px', flex: '0 0 auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>
              Port Tersedia
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginTop: '3px', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {countTotalAvai}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              Kapasitas: <span style={{ fontWeight: 700, color: '#1E293B', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>{countTotalPort}</span>
            </div>
          </div>

          {/* Metrik 2: Total ODP (Stable Width) */}
          <div style={{ minWidth: '260px', flex: '0 0 auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>
              Total ODP Terpantau
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginTop: '3px', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {countOdpCount}
            </div>
            {/* 5-Color Status Breakdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', marginTop: '4px' }}>
              {safeStatusChips.map(s => (
                <span
                  key={s.label}
                  title={`${s.label}: ${s.count}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: '#475569',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    fontFeatureSettings: '"tnum"',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, border: s.color?.toUpperCase() === '#FFFF00' ? '1px solid #CBD5E1' : 'none', boxSizing: 'border-box', display: 'inline-block', flexShrink: 0 }} />
                  <span>{s.label[0]}:{s.count.toLocaleString('id-ID')}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Metrik 3: Verifikasi GTM (Stable Width) */}
          <div style={{ minWidth: '235px', flex: '0 0 auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>
              Verifikasi Kegiatan
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginTop: '3px', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {countActCompletionPct}%
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#059669', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>{countActVerified}</span> verif · <span style={{ color: '#D97706', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>{countActPending}</span> review · <span style={{ color: '#64748B', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>{countActBelum}</span> belum
            </div>
          </div>
        </div>

        {/* Pojok Kanan: Timestamp Data */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 500,
              color: '#64748B'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Pembaruan: {lastUpdateFormatted || '21 Oktober 2026'}</span>
          </div>
        </div>
      </div>

      {/* ─── ROW BAWAH: HISTOGRAM UTILISASI PORT (ZERO LAYOUT SHIFT / JITTER-FREE) ─── */}
      <div style={{ marginTop: '16px', position: 'relative' }}>
        {/* Header Baris Chart dengan Tinggi Terkunci (30px) untuk Mencegah Guncangan Layout / CLS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            minHeight: '30px',
            height: '30px',
            gap: '12px'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#1E293B',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Distribusi Utilisasi Kapasitas Port per Branch & WOK
          </div>

          {/* Active Inspector Info / Legend Slot (Fixed Height & Box-Sizing) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '26px',
              minWidth: 0,
              flexShrink: 1
            }}
          >
            {activeBar ? (
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#0F172A',
                  fontWeight: 600,
                  background: '#F8FAFC',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  whiteSpace: 'nowrap',
                  lineHeight: '18px',
                  height: '26px',
                  boxSizing: 'border-box',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ color: '#C8102E', fontWeight: 800 }}>{activeBar.branchName}</span>&nbsp;({activeBar.displayName}):&nbsp;{activeBar.occRate}% ({activeBar.portUsed.toLocaleString('id-ID')} / {activeBar.portTotal.toLocaleString('id-ID')} port)
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  fontSize: '11px',
                  color: '#64748B',
                  fontWeight: 600,
                  height: '26px',
                  lineHeight: '18px',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#C8102E' }} />
                  Terpakai
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#E2E8F0' }} />
                  Tersedia
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Histogram Track Container: onMouseLeave di sini mencegah flicker saat kursor berpindah antar bar */}
        <div
          className="histogram-chart-track"
          onMouseLeave={() => setHoveredBarIndex(null)}
          style={{
            height: '100px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '6px',
            padding: '6px 2px 0',
            position: 'relative'
          }}
        >
          {histogramBars.length === 0 ? (
            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', width: '100%' }}>
              Belum ada data distribusi port untuk ditampilkan.
            </div>
          ) : (
            histogramBars.map((bar, idx) => {
              const targetTotalHeight = Math.min(Math.max((bar.portTotal / maxTotalPort) * 100, 26), 100);
              const targetUsedHeight = bar.portTotal > 0 ? Math.min((bar.portUsed / bar.portTotal) * 100, 100) : 0;

              // Nilai tinggi dengan animasi transisi saat mount / in-view
              const currentTotalHeight = hasAnimated ? targetTotalHeight : 6;
              const currentUsedHeight = hasAnimated ? targetUsedHeight : 0;
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={bar.id}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onClick={() => {
                    if (onSelectBranch) onSelectBranch(bar.branchName);
                  }}
                  style={{
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {/* Stacked Vertical Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '24px',
                      height: `${currentTotalHeight}%`,
                      background: isHovered ? '#CBD5E1' : '#E2E8F0', // Neutral capacity surface
                      borderRadius: '4px 4px 1px 1px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      overflow: 'hidden',
                      transformOrigin: 'bottom',
                      transform: isHovered ? 'scaleY(1.03)' : 'none',
                      transition: 'height 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s ease, background-color 0.15s ease',
                      transitionDelay: hasAnimated ? `${idx * 28}ms, 0ms, 0ms` : '0ms'
                    }}
                  >
                    {/* Bottom Segment: Telkomsel Red (Used Port) */}
                    <div
                      style={{
                        width: '100%',
                        height: `${currentUsedHeight}%`,
                        background: isHovered ? '#B9001D' : '#C8102E',
                        borderRadius: currentUsedHeight >= 96 ? '3px 3px 0 0' : '0',
                        transition: 'height 0.65s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease',
                        transitionDelay: hasAnimated ? `${idx * 28 + 120}ms, 0ms` : '0ms'
                      }}
                    />
                  </div>

                  {/* Bottom Label (WOK Name) dengan Tinggi Konstan (14px) agar Tidak Mengubah Geometri */}
                  <span
                    title={`${bar.displayName} (${bar.branchName})`}
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      lineHeight: '14px',
                      height: '14px',
                      color: isHovered ? '#C8102E' : '#64748B',
                      marginTop: '6px',
                      width: '100%',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      letterSpacing: '-0.2px',
                      transition: 'color 0.15s ease'
                    }}
                  >
                    {bar.shortWokLabel}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
