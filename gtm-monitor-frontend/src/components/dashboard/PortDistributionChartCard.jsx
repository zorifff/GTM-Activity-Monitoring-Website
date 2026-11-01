import { useState, useEffect } from 'react';

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

// ─── SECTION 2: DISTRIBUSI UTILISASI PORT PER BRANCH & WOK ───
export default function PortDistributionChartCard({
  ranking = [],
  branches = [],
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

  // Siapkan Histogram Bars dari data ranking dan branches asli
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

  const activeBar = hoveredBarIndex !== null ? histogramBars[hoveredBarIndex] : null;
  const PERCENTAGE_TICKS = [100, 80, 60, 40, 20, 0];

  return (
    <div
      className="saas-card port-distribution-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* Header Baris Chart dengan Judul dan Legend / Inspector Slot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          minHeight: '30px',
          height: '30px',
          gap: '12px'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            letterSpacing: '-0.1px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          Distribusi Utilisasi Kapasitas Port per Branch & WOK
        </div>

        {/* Active Inspector Info / Legend Slot */}
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
              <span style={{ color: '#800000', fontWeight: 600 }}>{activeBar.branchName}</span>&nbsp;({activeBar.displayName}):&nbsp;{activeBar.occRate}% ({activeBar.portUsed.toLocaleString('id-ID')} / {activeBar.portTotal.toLocaleString('id-ID')} port)
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#800000' }} />
                Utilisasi Port Terpakai
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kontainer Diagram Batang dengan Sumbu X, Sumbu Y Solid & Garis Kisi Solid */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '6px' }}>
        <div style={{ minWidth: '660px', width: '100%' }}>
          {histogramBars.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', width: '100%' }}>
              Belum ada data distribusi port untuk ditampilkan.
            </div>
          ) : (
            <>
              {/* ─── AREA PLOTTING (SUMBU Y DI KIRI + GRID SOLID & BOX PROGRESS DI KANAN) ─── */}
              <div
                style={{
                  display: 'flex',
                  height: '210px',
                  width: '100%',
                  position: 'relative',
                  paddingTop: '18px',
                  boxSizing: 'border-box'
                }}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {/* 1. Sumbu Y (Garis Vertikal di Kiri + Nilai Persentase, Tanpa Strip) */}
                <div
                  style={{
                    width: '46px',
                    height: '100%',
                    position: 'relative',
                    flexShrink: 0,
                    borderRight: '1.5px solid #94A3B8'
                  }}
                  aria-label="Garis Sumbu Y Kuantitas Persentase"
                >
                  {PERCENTAGE_TICKS.map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: 'absolute',
                        bottom: `${pct}%`,
                        right: 0,
                        transform: 'translateY(50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '8px',
                        zIndex: 2
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#64748B',
                          fontVariantNumeric: 'tabular-nums',
                          userSelect: 'none',
                          lineHeight: 1
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* 2. Area Plotting Canvas (Sumbu X Solid di Bawah + Garis Panduan Grid Solid + Box Progress) */}
                <div
                  style={{
                    flex: 1,
                    height: '100%',
                    position: 'relative',
                    borderBottom: '1.5px solid #94A3B8'
                  }}
                  aria-label="Area Diagram Batang dan Sumbu X"
                >
                  {/* Garis-Garis Solid Sumbu Y Penanda Persentase (Tidak Putus-Putus) */}
                  {PERCENTAGE_TICKS.filter(p => p > 0).map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: `${pct}%`,
                        borderTop: '1px solid #E2E8F0',
                        pointerEvents: 'none',
                        zIndex: 0
                      }}
                    />
                  ))}

                  {/* Kontainer Kolom Batang (Hanya Box Progress Saja) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '8px',
                      padding: '0 8px'
                    }}
                  >
                    {histogramBars.map((bar, idx) => {
                      const isHovered = hoveredBarIndex === idx;
                      const safeOcc = Math.min(Math.max(bar.occRate, 0), 100);
                      const currentHeight = hasAnimated ? safeOcc : 0;

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
                            position: 'relative',
                            minWidth: 0
                          }}
                        >
                          {/* Box Progress Batang Port Terpakai Saja (Tanpa Outer Box & Tanpa Tanda Persen di Atasnya) */}
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '26px',
                              height: `${currentHeight}%`,
                              minHeight: safeOcc > 0 ? '3px' : '0',
                              backgroundColor: isHovered ? '#660000' : '#800000',
                              borderRadius: '4px 4px 0 0',
                              zIndex: 1,
                              transition: 'height 0.7s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                              transitionDelay: hasAnimated ? `${idx * 20}ms` : '0ms',
                              transform: isHovered ? 'translateY(-2px)' : 'none',
                              boxShadow: isHovered ? '0 4px 12px rgba(128, 0, 0, 0.25)' : 'none'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ─── LABEL SUMBU X (GARIS HORIZONTAL SOLID, NAMA WOK & BRANCH TANPA STRIP) ─── */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  marginTop: '0px'
                }}
              >
                {/* Spacer Menyesuaikan Lebar Sumbu Y */}
                <div style={{ width: '46px', flexShrink: 0 }} />

                {/* Kontainer Label WOK & Branch per Kolom Sumbu X */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    gap: '8px',
                    padding: '0 8px'
                  }}
                >
                  {histogramBars.map((bar, idx) => {
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
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          minWidth: 0,
                          paddingTop: '6px'
                        }}
                      >
                        {/* Label Singkat WOK (Tanpa Penanda Strip) */}
                        <span
                          title={`${bar.displayName} (${bar.branchName})`}
                          style={{
                            fontSize: '10px',
                            fontWeight: isHovered ? 600 : 500,
                            color: isHovered ? '#800000' : '#475569',
                            width: '100%',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            letterSpacing: '-0.1px',
                            lineHeight: '13px',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          {bar.shortWokLabel}
                        </span>

                        {/* Kode Branch */}
                        <span
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 500,
                            color: isHovered ? '#800000' : '#94A3B8',
                            lineHeight: '11px',
                            letterSpacing: '0.2px',
                            marginTop: '2px'
                          }}
                        >
                          {bar.branchCode}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
