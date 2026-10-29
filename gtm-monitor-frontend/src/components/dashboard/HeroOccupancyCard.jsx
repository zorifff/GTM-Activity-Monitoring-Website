import { useCountUp } from '../../hooks/useCountUp';

// ─── HERO CARD (TELKOMSEL RED - ANTI-SLOP CLEAN ARCHITECTURE) ───
export default function HeroOccupancyCard({ safeKpi, onReviewBranch, isInView = true }) {
  const isOccDecimal = Number(safeKpi.occRate) % 1 !== 0;
  const countOccRate = useCountUp(safeKpi.occRate, { enabled: isInView, decimals: isOccDecimal ? 1 : 0, duration: 800 });
  const countTotalUsed = useCountUp(safeKpi.totalUsed, { enabled: isInView, duration: 750 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 750 });

  const occPct = Math.min(Math.max(Number(safeKpi.occRate) || 0, 0), 100);

  return (
    <div
      className="hero-red-card"
      style={{
        width: '100%',
        maxWidth: '340px',
        backgroundColor: '#C8102E', // Solid Telkomsel Brand Red base with subtle depth
        backgroundImage: 'linear-gradient(160deg, #D90429 0%, #A0001E 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 8px 20px -4px rgba(200, 16, 46, 0.22), 0 2px 6px -1px rgba(200, 16, 46, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxSizing: 'border-box',
        minHeight: '260px'
      }}
    >
      {/* Top Block: Meta, Metric, Subtext & Visual Capacity Bar */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.95)',
              letterSpacing: '0.2px'
            }}
          >
            Okupansi Regional Jateng & DIY
          </span>

          {safeKpi.gapWoW != null && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {safeKpi.gapWoW > 0 ? `+${safeKpi.gapWoW}%` : `${safeKpi.gapWoW}%`} WoW
            </span>
          )}
        </div>

        {/* Primary Giant Metric */}
        <div
          style={{
            fontSize: '46px',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-1.5px',
            margin: '20px 0 10px 0',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {countOccRate}%
        </div>

        {/* Concise Functional Subtext */}
        <div
          style={{
            fontSize: '12.5px',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: 1.45,
            fontWeight: 500
          }}
        >
          <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{countTotalUsed}</span> dari <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{countTotalPort}</span> port terpakai di 6 Branch
        </div>

        {/* ─── VISUAL CAPACITY GAUGE (PROGRESS BAR LEBIH LEBAR/TEBAL 8PX) ─── */}
        <div
          style={{
            marginTop: '18px',
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.24)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}
          title={`Utilisasi Kapasitas: ${safeKpi.occRate}%`}
        >
          <div
            style={{
              height: '100%',
              width: isInView ? `${occPct}%` : '0%',
              backgroundColor: '#FFFFFF',
              borderRadius: '999px',
              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </div>
      </div>

      {/* Primary Action Button (Pinned to Bottom) */}
      <div style={{ marginTop: '22px' }}>
        <button
          type="button"
          onClick={onReviewBranch}
          className="hero-review-btn"
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            color: '#B9001D',
            fontWeight: 700,
            fontSize: '13px',
            padding: '11px 16px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FFF5F5';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span>Review Branch Prioritas</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
