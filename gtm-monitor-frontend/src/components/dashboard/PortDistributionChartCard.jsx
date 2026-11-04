import { useState, useEffect, useMemo, useRef } from 'react';

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

  // Bangun daftar WOK dengan urutan kolom sumbu X yang stabil dari master branches,
  // lalu pasangkan dengan nilai metrik hasil filter aktif (ranking) agar bar bergerak naik-turun secara mulus
  const targetBars = useMemo(() => {
    const bars = [];
    const masterBranches = Array.isArray(branches) && branches.length > 0 ? branches : ranking;

    masterBranches.forEach((rawBranch) => {
      const bName = rawBranch.name || '';
      const bUpper = bName.toUpperCase();
      const rankedBranch = (ranking || []).find(
        (r) => (r.name || '').toUpperCase() === bUpper
      ) || rawBranch;

      const allWokNames = Array.from(
        new Set(
          (rawBranch.projects || [])
            .map((p) => (p.wok || '').toString().trim())
            .filter((w) => w && w !== '-' && w !== 'NONE')
        )
      ).sort();

      if (allWokNames.length > 0) {
        allWokNames.forEach((wokName) => {
          const cleanW = wokName.toUpperCase().replace(/[\s-]/g, '');
          const matchedWok = (rankedBranch.woks || []).find((w) => {
            const wClean = (w.name || '').toUpperCase().replace(/[\s-]/g, '');
            return wClean === cleanW || wClean.includes(cleanW) || cleanW.includes(wClean);
          });

          const portUsed = matchedWok ? (matchedWok.totalUsed || 0) : 0;
          const portTotal = matchedWok ? (matchedWok.totalPort || 0) : 0;
          const occRate = matchedWok && matchedWok.occRate !== undefined && matchedWok.occRate !== null
            ? matchedWok.occRate
            : (portTotal > 0 ? Math.round((portUsed / portTotal) * 1000) / 10 : 0);

          bars.push({
            id: `${bName}-${wokName}`,
            branchName: bName,
            displayName: wokName,
            shortWokLabel: formatWokLabel(wokName),
            occRate,
            portUsed,
            portTotal,
            portAvai: Math.max(portTotal - portUsed, 0),
            delta: matchedWok ? (matchedWok.delta ?? 0) : 0,
            branchCode: bName.slice(0, 3).toUpperCase()
          });
        });
      } else if (rankedBranch.woks && rankedBranch.woks.length > 0) {
        rankedBranch.woks.forEach((w) => {
          const portUsed = w.totalUsed || 0;
          const portTotal = w.totalPort || 0;
          const occRate = w.occRate ?? (portTotal > 0 ? Math.round((portUsed / portTotal) * 1000) / 10 : 0);

          bars.push({
            id: `${bName}-${w.name}`,
            branchName: bName,
            displayName: w.name,
            shortWokLabel: formatWokLabel(w.name),
            occRate,
            portUsed,
            portTotal,
            portAvai: Math.max(portTotal - portUsed, 0),
            delta: w.delta ?? 0,
            branchCode: bName.slice(0, 3).toUpperCase()
          });
        });
      } else {
        const portUsed = rankedBranch.totalUsed || 0;
        const portTotal = rankedBranch.totalPort || 0;
        const occRate = rankedBranch.occRate ?? (portTotal > 0 ? Math.round((portUsed / portTotal) * 1000) / 10 : 0);

        bars.push({
          id: bName,
          branchName: bName,
          displayName: bName,
          shortWokLabel: formatWokLabel(bName),
          occRate,
          portUsed,
          portTotal,
          portAvai: Math.max(portTotal - portUsed, 0),
          delta: rankedBranch.delta ?? 0,
          branchCode: bName.slice(0, 3).toUpperCase()
        });
      }
    });

    return bars;
  }, [branches, ranking]);

  // Interpolasi frame-by-frame (requestAnimationFrame) untuk pergerakan naik-turun bar yang mulus
  const currentAnimRef = useRef({});
  const [animMap, setAnimMap] = useState({});

  useEffect(() => {
    if (!isInView || targetBars.length === 0) return;

    const startValues = {};
    targetBars.forEach((bar) => {
      const prev = currentAnimRef.current[bar.id];
      startValues[bar.id] = {
        occRate: prev ? prev.occRate : 0,
        portUsed: prev ? prev.portUsed : 0,
        portTotal: prev ? prev.portTotal : 0
      };
    });

    const duration = 650;
    const startTime = performance.now();
    let frameId = null;

    const tick = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Cubic ease-out yang halus
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      const nextMap = {};
      targetBars.forEach((bar) => {
        const s = startValues[bar.id] || { occRate: 0, portUsed: 0, portTotal: 0 };
        nextMap[bar.id] = {
          occRate: s.occRate + (bar.occRate - s.occRate) * ease,
          portUsed: s.portUsed + (bar.portUsed - s.portUsed) * ease,
          portTotal: s.portTotal + (bar.portTotal - s.portTotal) * ease
        };
      });

      currentAnimRef.current = nextMap;
      setAnimMap(nextMap);

      if (rawProgress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [targetBars, isInView]);

  const activeBar = hoveredBarIndex !== null ? targetBars[hoveredBarIndex] : null;
  const activeAnim = activeBar ? (animMap[activeBar.id] || activeBar) : null;
  const PERCENTAGE_TICKS = [100, 80, 60, 40, 20, 0];

  return (
    <div
      className="saas-card port-distribution-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Header Baris Chart dengan Judul dan Legend / Inspector Slot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '16px',
          minHeight: '28px',
          height: 'auto',
          gap: '6px 12px'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            color: '#475569',
            letterSpacing: '-0.1px',
            whiteSpace: 'normal',
            lineHeight: 1.35,
            minWidth: 0,
            flex: '1 1 220px'
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
            minHeight: '24px',
            height: 'auto',
            minWidth: 0,
            maxWidth: '100%',
            flexShrink: 0
          }}
        >
          {activeBar && activeAnim ? (
            <div
              style={{
                fontSize: '11.5px',
                color: '#0F172A',
                background: '#F8FAFC',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontVariantNumeric: 'tabular-nums',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                whiteSpace: 'normal',
                lineHeight: '18px',
                minHeight: '26px',
                height: 'auto',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ color: '#0F172A' }}>{activeBar.branchName}</span>&nbsp;({activeBar.displayName}):&nbsp;{Math.round(activeAnim.occRate * 10) / 10}% ({Math.round(activeAnim.portUsed).toLocaleString('id-ID')} / {Math.round(activeAnim.portTotal).toLocaleString('id-ID')} port)
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '11px',
                color: '#64748B',
                minHeight: '24px',
                height: 'auto',
                lineHeight: '18px',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#800000', flexShrink: 0 }} />
                Utilisasi Port Terpakai
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kontainer Diagram Batang dengan Sumbu X, Sumbu Y Solid & Garis Kisi Solid */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '6px' }}>
        <div style={{ minWidth: '660px', width: '100%' }}>
          {targetBars.length === 0 ? (
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
                    {targetBars.map((bar, idx) => {
                      const isHovered = hoveredBarIndex === idx;
                      const anim = animMap[bar.id];
                      const currentOcc = anim ? anim.occRate : 0;
                      const safeOcc = Math.min(Math.max(currentOcc, 0), 100);

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
                          {/* Box Progress Batang Port Terpakai Saja */}
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '26px',
                              height: `${safeOcc}%`,
                              minHeight: safeOcc > 0.15 ? '3px' : '0px',
                              backgroundColor: isHovered ? '#660000' : '#800000',
                              borderRadius: '4px 4px 0 0',
                              zIndex: 1,
                              transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
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
                  {targetBars.map((bar, idx) => {
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
                        {/* Label Singkat WOK */}
                        <span
                          title={`${bar.displayName} (${bar.branchName})`}
                          style={{
                            fontSize: '10px',
                            color: isHovered ? '#0F172A' : '#475569',
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
                            color: isHovered ? '#0F172A' : '#94A3B8',
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
