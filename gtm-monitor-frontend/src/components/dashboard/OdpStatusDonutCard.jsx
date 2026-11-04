import { useState, useMemo, useEffect, useRef } from 'react';

// ─── STATUS DESCRIPTIONS & COLOR PALETTE ───
const STATUS_DESCRIPTIONS = {
  Green: 'Okupansi < 25% (Siap Jual)',
  Yellow: 'Okupansi 25% - 50% (Moderat)',
  Orange: 'Okupansi 50% - 75% (Tinggi)',
  Red: 'Okupansi > 75% (Kritis)',
  Black: '0 Port Terpakai (Idle / Kosong)'
};

export default function OdpStatusDonutCard({ statusChips = [], totalOdp = 0, isInView = true }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Total ODP aktual berdasarkan filter aktif
  const rawTotal = useMemo(() => {
    if (totalOdp > 0) return totalOdp;
    return statusChips.reduce((sum, s) => sum + (s.count || 0), 0);
  }, [totalOdp, statusChips]);

  const safeDivisor = rawTotal > 0 ? rawTotal : 1;

  // Target proporsi & kuantitas tiap status untuk diinterpolasi
  const targetChips = useMemo(() => {
    return statusChips.map((chip) => {
      const count = chip.count || 0;
      const share = rawTotal > 0 ? count / safeDivisor : 0;
      return {
        ...chip,
        color: chip.color || '#334155',
        targetCount: count,
        targetShare: share,
        description: STATUS_DESCRIPTIONS[chip.label] || chip.label
      };
    });
  }, [statusChips, rawTotal, safeDivisor]);

  // Interpolasi circular mulus (requestAnimationFrame) saat mount maupun saat ganti filter
  const currentAnimRef = useRef({ total: 0, chips: {} });
  const [animState, setAnimState] = useState({ total: 0, chips: {} });

  useEffect(() => {
    if (!isInView) return;

    const startTotal = currentAnimRef.current.total || 0;
    const startChips = {};
    targetChips.forEach((c) => {
      const prev = currentAnimRef.current.chips[c.label];
      startChips[c.label] = {
        count: prev ? prev.count : 0,
        share: prev ? prev.share : 0
      };
    });

    const duration = 700;
    const startTime = performance.now();
    let frameId = null;

    const tick = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Cubic ease-out untuk pergerakan rotasi busur donat yang halus
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      const nextChips = {};
      targetChips.forEach((c) => {
        const s = startChips[c.label] || { count: 0, share: 0 };
        nextChips[c.label] = {
          count: s.count + (c.targetCount - s.count) * ease,
          share: s.share + (c.targetShare - s.share) * ease
        };
      });

      const nextState = {
        total: startTotal + (rawTotal - startTotal) * ease,
        chips: nextChips
      };

      currentAnimRef.current = nextState;
      setAnimState(nextState);

      if (rawProgress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [targetChips, rawTotal, isInView]);

  // Donut geometry: Center at (100, 100), Radius 66, Stroke 28
  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.69

  // Hitung panjang busur (strokeLength) dan posisi rotasi (offset) di setiap frame
  const slices = useMemo(() => {
    let accumulatedOffset = 0;
    return targetChips.map((chip) => {
      const anim = animState.chips[chip.label] || { count: 0, share: 0 };
      const strokeLength = Math.max(anim.share * circumference, 0);
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...chip,
        count: Math.round(anim.count),
        pct: Math.round(anim.share * 1000) / 10,
        strokeLength,
        offset
      };
    });
  }, [targetChips, animState, circumference]);

  const activeChip = hoveredIndex !== null ? slices[hoveredIndex] : null;
  const displayTotalOdp = Math.round(animState.total).toLocaleString('id-ID');

  return (
    <div
      className="saas-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '22px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '320px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── HEADER KARTU ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
        <div style={{ fontSize: '15px', color: '#475569', letterSpacing: '-0.1px' }}>
          Profil Status Utilisasi ODP
        </div>

        <span
          style={{
            fontSize: '12px',
            color: '#475569',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {displayTotalOdp} ODP
        </span>
      </div>

      {/* ─── KONTEN: DONUT SVG (KIRI) + INTERACTIVE LEGEND (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Donut Chart (~50% diperbesar dari 170px ke 255px) */}
        <div style={{ position: 'relative', width: '255px', height: '255px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="255"
            height="255"
            viewBox="0 0 200 200"
            style={{
              overflow: 'visible',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center'
            }}
          >
            {/* Background Track Circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="28"
            />

            {/* Slices */}
            {slices.map((slice, idx) => {
              const isHovered = hoveredIndex === idx;
              const visibleLength = slice.strokeLength;
              const gapAdjustedLength = visibleLength > 2 ? visibleLength - 1.5 : Math.max(visibleLength, 0);

              return (
                <circle
                  key={slice.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 34 : 28}
                  strokeDasharray={`${gapAdjustedLength} ${Math.max(circumference - gapAdjustedLength, 0)}`}
                  strokeDashoffset={-slice.offset}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.18s ease, filter 0.18s ease',
                    filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Donut Hub (Telemetry Center) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center'
            }}
          >
            {activeChip ? (
              <>
                <div
                  style={{
                    fontSize: '26px',
                    color: '#0F172A',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {activeChip.count.toLocaleString('id-ID')}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '3px'
                  }}
                >
                  {activeChip.label} ({activeChip.pct}%)
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '28px',
                    color: '#0F172A',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {displayTotalOdp}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748B',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    marginTop: '3px'
                  }}
                >
                  TOTAL ODP
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend Interaktif Sisi Kanan */}
        <div style={{ flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={slice.label}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      color: isHovered ? '#0F172A' : '#334155',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {slice.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count.toLocaleString('id-ID')}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748B',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '38px',
                      textAlign: 'right'
                    }}
                  >
                    {slice.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
