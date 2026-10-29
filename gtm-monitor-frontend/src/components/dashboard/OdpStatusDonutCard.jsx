import { useState, useMemo, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

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
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setIsAnimated(true), 60);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [isInView]);

  // Total count & anim counter
  const safeTotal = useMemo(() => {
    if (totalOdp > 0) return totalOdp;
    return statusChips.reduce((sum, s) => sum + (s.count || 0), 0) || 1;
  }, [totalOdp, statusChips]);

  const countTotalOdp = useCountUp(safeTotal, { enabled: isInView, duration: 800 });

  // Donut geometry: Center at (100, 100), Radius 66, Stroke 28
  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.69

  // Calculate arc slices
  const slices = useMemo(() => {
    let accumulatedOffset = 0;
    return statusChips.map((chip, idx) => {
      const count = chip.count || 0;
      const pct = (count / safeTotal);
      const strokeLength = pct * circumference;
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      // Ensure Yellow strictly uses #FFFF00
      const color = chip.label?.toLowerCase() === 'yellow' ? '#FFFF00' : (chip.color || '#334155');

      return {
        ...chip,
        color,
        pct: Math.round(pct * 1000) / 10,
        strokeLength,
        offset,
        description: STATUS_DESCRIPTIONS[chip.label] || chip.label
      };
    });
  }, [statusChips, safeTotal, circumference]);

  const activeChip = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div
      className="saas-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '22px 24px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '260px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── HEADER KARTU ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
            Profil Status Utilisasi ODP
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
            Distribusi 5 level kesehatan okupansi ODP regional
          </div>
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#475569',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {safeTotal.toLocaleString('id-ID')} ODP
        </span>
      </div>

      {/* ─── KONTEN: DONUT SVG (KIRI) + INTERACTIVE LEGEND (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Donut Chart */}
        <div style={{ position: 'relative', width: '170px', height: '170px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="170"
            height="170"
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
              // Animated stroke: grow from 0 to full length
              const visibleLength = isAnimated ? slice.strokeLength : 0;
              const gapAdjustedLength = Math.max(visibleLength - 1.5, 0); // 1.5px gap between segments

              return (
                <circle
                  key={slice.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 34 : 28}
                  strokeDasharray={`${gapAdjustedLength} ${circumference - gapAdjustedLength}`}
                  strokeDashoffset={-slice.offset}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.18s ease, filter 0.18s ease, stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
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
                    fontSize: '18px',
                    fontWeight: 900,
                    color: activeChip.label?.toLowerCase() === 'yellow' ? '#CA8A04' : activeChip.color,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {activeChip.count.toLocaleString('id-ID')}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#475569',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '2px'
                  }}
                >
                  {activeChip.label} ({activeChip.pct}%)
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: '#0F172A',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {countTotalOdp}
                </div>
                <div
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    color: '#64748B',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    marginTop: '2px'
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
                      border: slice.color?.toUpperCase() === '#FFFF00' ? '1px solid #CBD5E1' : 'none',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isHovered ? 700 : 600,
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
                      fontWeight: 700,
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count.toLocaleString('id-ID')}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
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
