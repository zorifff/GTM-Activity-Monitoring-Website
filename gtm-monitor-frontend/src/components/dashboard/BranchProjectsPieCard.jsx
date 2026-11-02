import { useState, useMemo, useEffect } from 'react';
import { BRANCH_COLORS } from '../../utils';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  // Clamp angle so it doesn't wrap around 360 awkwardly
  const safeEndAngle = endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
  const start = polarToCartesian(x, y, radius, safeEndAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = safeEndAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

export default function BranchProjectsPieCard({ ranking = [], branches = [], goBranch, isInView = true }) {
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

  // Aggregate project count per branch & sort descending
  const branchData = useMemo(() => {
    const list = Array.isArray(ranking) && ranking.length > 0 ? ranking : branches;
    const mapped = list.map(b => {
      const count = b.projCount ?? (b.projects?.length || 0);
      const bUpper = b.name?.toString().trim().toUpperCase();
      const color = b.color || BRANCH_COLORS[bUpper] || '#64748B';

      return {
        name: b.name,
        count,
        color
      };
    }).sort((a, b) => b.count - a.count); // Largest share first

    return mapped;
  }, [ranking, branches]);

  const totalProjects = useMemo(() => {
    return branchData.reduce((acc, b) => acc + (b.count || 0), 0) || 1;
  }, [branchData]);


  // Compute angles for each pie slice
  const slices = useMemo(() => {
    let currentAngle = 0;
    return branchData.map((b) => {
      const share = b.count / totalProjects;
      const angle = share * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      const midAngle = (startAngle + endAngle) / 2;
      const rad = ((midAngle - 90) * Math.PI) / 180;
      const offsetX = Math.cos(rad) * 5;
      const offsetY = Math.sin(rad) * 5;

      return {
        ...b,
        startAngle,
        endAngle,
        midAngle,
        offsetX,
        offsetY,
        pct: Math.round(share * 1000) / 10,
        path: describeArc(100, 100, 80, startAngle, endAngle)
      };
    });
  }, [branchData, totalProjects]);

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
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569', letterSpacing: '-0.1px' }}>
          Sebaran Volume Proyek per Branch
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#475569'
          }}
        >
          {slices.length} Branch
        </span>
      </div>

      {/* ─── KONTEN: PIE CHART SVG (KIRI) + LEGEND PER BRANCH (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Pie Chart (~50% diperbesar dari 170px ke 255px) */}
        <div style={{ position: 'relative', width: '255px', height: '255px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="255"
            height="255"
            viewBox="0 0 200 200"
            style={{
              overflow: 'visible',
              transform: isAnimated ? 'scale(1) rotate(0deg)' : 'scale(0.85) rotate(-15deg)',
              opacity: isAnimated ? 1 : 0,
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease'
            }}
          >
            {slices.map((slice, idx) => {
              const isHovered = hoveredIndex === idx;

              return (
                <path
                  key={slice.name}
                  d={slice.path}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  style={{
                    cursor: 'pointer',
                    transform: isHovered ? `translate(${slice.offsetX}px, ${slice.offsetY}px) scale(1.03)` : 'translate(0px, 0px) scale(1)',
                    transformOrigin: '100px 100px',
                    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.18s ease',
                    filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.22))' : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => {
                    if (goBranch) goBranch(slice.name);
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend Sisi Kanan (Ranking Volume Proyek) */}
        <div style={{ flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={slice.name}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  if (goBranch) goBranch(slice.name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                title={`Klik untuk melihat detail branch ${slice.name}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isHovered ? 600 : 500,
                      color: isHovered ? '#0F172A' : '#334155',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {slice.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count} <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>proj</span>
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
