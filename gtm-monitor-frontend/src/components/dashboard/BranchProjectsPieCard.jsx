import { useState, useMemo, useEffect, useRef } from 'react';
import { BRANCH_COLORS } from '../../utils';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.08) return '';
  // Clamp angle so it doesn't wrap around 360 awkwardly
  const safeEndAngle = sweep >= 359.99 ? startAngle + 359.99 : endAngle;
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

  // Urutan branch stabil dari master branches (urut volume terbesar keseluruhan)
  // lalu pasangkan dengan projCount dari filter aktif (ranking) agar transisi sudut pie berputar mulus
  const branchData = useMemo(() => {
    const masterList = Array.isArray(branches) && branches.length > 0 ? branches : ranking;

    const baseList = [...masterList].sort((a, b) => {
      const countA = a.projects?.length ?? a.projCount ?? 0;
      const countB = b.projects?.length ?? b.projCount ?? 0;
      return countB - countA;
    });

    return baseList.map((b) => {
      const bUpper = (b.name || '').toString().trim().toUpperCase();
      const rankedMatch = (ranking || []).find(
        (r) => (r.name || '').toString().trim().toUpperCase() === bUpper
      );
      const count = rankedMatch
        ? (rankedMatch.projCount ?? 0)
        : (b.projCount ?? (b.projects?.length || 0));
      const color = rankedMatch?.color || b.color || BRANCH_COLORS[bUpper] || '#64748B';

      return {
        name: b.name,
        count,
        color
      };
    });
  }, [ranking, branches]);

  const rawTotalProjects = useMemo(() => {
    return branchData.reduce((acc, b) => acc + (b.count || 0), 0);
  }, [branchData]);

  const safeDivisor = rawTotalProjects > 0 ? rawTotalProjects : 1;

  // Target nilai per branch untuk diinterpolasi
  const targetBranches = useMemo(() => {
    return branchData.map((b) => ({
      ...b,
      targetCount: b.count || 0,
      targetShare: rawTotalProjects > 0 ? (b.count || 0) / safeDivisor : 0
    }));
  }, [branchData, rawTotalProjects, safeDivisor]);

  // Interpolasi sudut circular (requestAnimationFrame) saat mount maupun saat ganti filter
  const currentAnimRef = useRef({});
  const [animMap, setAnimMap] = useState({});

  useEffect(() => {
    if (!isInView || targetBranches.length === 0) return;

    const startValues = {};
    targetBranches.forEach((b) => {
      const prev = currentAnimRef.current[b.name];
      startValues[b.name] = {
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
      // Cubic ease-out untuk rotasi juring lingkaran yang halus
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      const nextMap = {};
      targetBranches.forEach((b) => {
        const s = startValues[b.name] || { count: 0, share: 0 };
        nextMap[b.name] = {
          count: s.count + (b.targetCount - s.count) * ease,
          share: s.share + (b.targetShare - s.share) * ease
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
  }, [targetBranches, isInView]);

  // Hitung sudut startAngle, endAngle, dan path SVG pada setiap frame animasi
  const slices = useMemo(() => {
    let currentAngle = 0;
    return targetBranches.map((b) => {
      const anim = animMap[b.name] || { count: 0, share: 0 };
      const share = Math.max(anim.share, 0);
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
        count: Math.round(anim.count),
        angle,
        startAngle,
        endAngle,
        midAngle,
        offsetX,
        offsetY,
        pct: Math.round(share * 1000) / 10,
        path: describeArc(100, 100, 80, startAngle, endAngle)
      };
    });
  }, [targetBranches, animMap]);

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
          Sebaran Volume Proyek per Branch
        </div>

        <span
          style={{
            fontSize: '12px',
            color: '#475569'
          }}
        >
          {slices.length} Branch
        </span>
      </div>

      {/* ─── KONTEN: PIE CHART SVG (KIRI) + LEGEND PER BRANCH (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Pie Chart (~50% diperbesar dari 170px ke 255px) */}
        <div className="chart-donut-svg-wrap" style={{ position: 'relative', width: '255px', height: '255px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 200"
            style={{
              overflow: 'visible'
            }}
          >
            {/* Lingkaran dasar abu-abu lembut saat transisi awal atau jika total 0 */}
            <circle cx="100" cy="100" r="80" fill="#F1F5F9" />

            {slices.map((slice, idx) => {
              if (!slice.path) return null;
              const isHovered = hoveredIndex === idx;
              const isFullCircle = slice.angle >= 359.5;

              return (
                <path
                  key={slice.name}
                  d={slice.path}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth={isFullCircle ? '0' : '2'}
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
        <div style={{ flex: 1, minWidth: 'min(100%, 190px)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count} <span style={{ fontSize: '10.5px', color: '#64748B' }}>proj</span>
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
