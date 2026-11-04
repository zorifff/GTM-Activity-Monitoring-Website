import { memo } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

function MiniProgressItem({ b, index, isLast, goBranch, isInView }) {
  const isDecimal = Number(b.occRate) % 1 !== 0;
  const animDuration = 800;
  const animDelay = index * 40;
  const countOcc = useCountUp(b.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: animDuration, delay: animDelay });

  const isPositive = b.delta > 0;
  const isNegative = b.delta < 0;
  const deltaColor = isPositive ? '#16A34A' : isNegative ? '#800000' : '#64748B';
  const deltaFormatted = isPositive ? `+${b.delta}%` : `${b.delta}%`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (goBranch) goBranch(b.name);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (goBranch) goBranch(b.name);
        }
      }}
      aria-label={`Buka detail branch ${b.name}`}
      className="ranking-mini-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        padding: '12px 6px',
        borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        borderRadius: '6px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Baris 1: Rank, Nama Branch & Persentase + Trend Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', flexShrink: 0 }}>
            #{index + 1}
          </span>
          <span style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '13.5px', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
            {countOcc}%
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11.5px',
              color: deltaColor,
              fontVariantNumeric: 'tabular-nums',
              background: 'none',
              border: 'none',
              padding: 0
            }}
          >
            {isPositive ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            ) : isNegative ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#800000"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <span>{deltaFormatted}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── RIGHT WIDGET PANEL (CLEAN RANKING BRANCH) ───
export default memo(function RightWidgetPanel({
  ranking = [],
  goBranch,
  isInView = true
}) {
  const sortedBranches = Array.isArray(ranking) && ranking.length > 0
    ? [...ranking].sort((a, b) => a.occRate - b.occRate)
    : [];

  return (
    <div
      className="saas-card right-widget-panel"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Ranking Branch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', color: '#0F172A', letterSpacing: '-0.2px' }}>
          Ranking Branch
        </span>
        <span style={{ fontSize: '11px', color: '#64748B', }}>
          OCC Terendah
        </span>
      </div>

      {/* List 6 Branch Terurut OCC Terendah */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sortedBranches.length > 0 ? (
          sortedBranches.slice(0, 6).map((b, idx, arr) => (
            <MiniProgressItem
              key={b.name}
              b={b}
              index={idx}
              isLast={idx === arr.length - 1}
              goBranch={goBranch}
              isInView={isInView}
            />
          ))
        ) : (
          <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC', borderRadius: '10px' }}>
            Belum ada data peringkat branch.
          </div>
        )}
      </div>
    </div>
  );
});
