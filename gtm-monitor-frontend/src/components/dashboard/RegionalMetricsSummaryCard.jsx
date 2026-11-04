import { useCountUp } from '../../hooks/useCountUp';

// ─── SECTION 1: METRIK UTAMA REGIONAL (PORT TERSEDIA, TOTAL ODP, VERIFIKASI KEGIATAN) ───
export default function RegionalMetricsSummaryCard({
  safeKpi,
  safeStatusChips = [],
  isInView = true
}) {
  // Animated numbers
  const countTotalAvai = useCountUp(safeKpi.totalAvai, { enabled: isInView, duration: 800 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 800 });
  const countOdpCount = useCountUp(safeKpi.odpCount, { enabled: isInView, duration: 800 });
  const countActVerified = useCountUp(safeKpi.actVerified, { enabled: isInView, duration: 750 });
  const pendingCount = safeKpi.actPending || 0;
  const countActPending = useCountUp(pendingCount, { enabled: isInView, duration: 750 });
  const countActBelum = useCountUp(safeKpi.actBelum || 0, { enabled: isInView, duration: 850 });
  const isActDecimal = Number(safeKpi.actCompletionPct) % 1 !== 0;
  const countActCompletionPct = useCountUp(safeKpi.actCompletionPct, { enabled: isInView, decimals: isActDecimal ? 1 : 0, duration: 850 });

  return (
    <div
      className="saas-card regional-metrics-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px 28px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        minHeight: '190px'
      }}
    >
      {/* Grid 3 Metrik Utama: Port Tersedia, Total ODP Terpantau, Verifikasi Kegiatan */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px',
          alignItems: 'flex-start',
          width: '100%'
        }}
      >
        {/* Metrik 1: Port Tersedia */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Port Tersedia
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countTotalAvai}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Kapasitas:{' '}
            <span
              style={{
                fontWeight: 600,
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginLeft: '4px'
              }}
            >
              {countTotalPort}
            </span>
          </div>
        </div>

        {/* Metrik 2: Total ODP Terpantau */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Total ODP Terpantau
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countOdpCount}
          </div>
          {/* 5-Color Status Breakdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              height: '24px'
            }}
          >
            {safeStatusChips.map((s) => (
              <span
                key={s.label}
                title={`${s.label}: ${s.count}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#475569',
                  fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum"',
                  whiteSpace: 'nowrap'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: s.color,
                    boxSizing: 'border-box',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
                <span>
                  {s.label[0]}:{s.count.toLocaleString('id-ID')}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Metrik 3: Verifikasi Kegiatan */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Verifikasi Kegiatan
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countActCompletionPct}%
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span
              style={{
                color: '#1E293B',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActVerified}
            </span>
            <span>verif</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span
              style={{
                color: '#1E293B',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActPending}
            </span>
            <span>review</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span
              style={{
                color: '#1E293B',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActBelum}
            </span>
            <span>belum</span>
          </div>
        </div>
      </div>
    </div>
  );
}
