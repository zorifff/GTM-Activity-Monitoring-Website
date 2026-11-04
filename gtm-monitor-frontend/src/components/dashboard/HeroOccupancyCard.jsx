import { useCountUp } from '../../hooks/useCountUp';

// ─── HERO CARD (TELKOMSEL MAROON - CLEAN ARCHITECTURE) ───
export default function HeroOccupancyCard({ safeKpi, onReviewBranch, isAdmin, isInView = true }) {
  const isOccDecimal = Number(safeKpi.occRate) % 1 !== 0;
  const countOccRate = useCountUp(safeKpi.occRate, { enabled: isInView, decimals: isOccDecimal ? 1 : 0, duration: 800 });
  const countTotalUsed = useCountUp(safeKpi.totalUsed, { enabled: isInView, duration: 750 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 750 });

  return (
    <div
      className="hero-red-card saas-card"
      style={{
        width: '100%',
        maxWidth: '360px',
        minWidth: 0,
        backgroundColor: '#800000',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: 'none',
        boxSizing: 'border-box',
        minHeight: '190px'
      }}
    >
      {/* Baris 1: Header (Judul & WoW Badge) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', minHeight: '24px', height: 'auto' }}>
        <span
          style={{
            fontSize: '15px',
            color: '#FFFFFF',
            letterSpacing: '-0.1px',
            lineHeight: 1.35,
            minWidth: 0
          }}
        >
          Okupansi Regional Jateng & DIY
        </span>

        {safeKpi.gapWoW != null && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0
            }}
          >
            {safeKpi.gapWoW > 0 ? `+${safeKpi.gapWoW}%` : `${safeKpi.gapWoW}%`} WoW
          </span>
        )}
      </div>

      {/* Baris 2: Primary Giant Metric (Sejajar sempurna dengan 3 metrik kanan) */}
      <div
        style={{
          fontSize: '48px',
          lineHeight: 1,
          letterSpacing: '-1.5px',
          margin: '18px 0 16px 0',
          fontVariantNumeric: 'tabular-nums',
          color: '#FFFFFF'
        }}
      >
        {countOccRate}%
      </div>

      {/* Baris 3: Metadata Ringkas + Tombol Aksi Kompak */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          minHeight: '24px',
          height: 'auto'
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: 1.4,
            minWidth: 0
          }}
        >
          <span style={{ color: '#FFFFFF' }}>{countTotalUsed}</span> dari{' '}
          <span style={{ color: '#FFFFFF' }}>{countTotalPort}</span> port
        </div>

        {isAdmin && onReviewBranch && (
          <button
            type="button"
            onClick={onReviewBranch}
            className="hero-review-btn"
            title="Review Branch Prioritas (Purwokerto)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '11.5px',
              padding: '3px 9px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <span>Review Prioritas</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
