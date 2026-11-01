// ─── KPI SUMMARY GRID (4 CARDS MATCHING DASHBOARD & ACTIVITY STYLE) ───
export default function AdminKpiGrid({ priorityBranches = [], stats = {}, totalProjects = 0 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
      {/* Card 1: Total Proyek Prioritas */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
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
          Total Proyek Prioritas
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
          {totalProjects.toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            Proyek
          </span>
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
          Tersebar di{' '}
          <span
            style={{
              fontWeight: 600,
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {priorityBranches.length}
          </span>{' '}
          Branch Jateng DIY
        </div>
      </div>

      {/* Card 2: Total ODP Terpantau */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
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
          {(stats.odpCount || 0).toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            ODP
          </span>
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
              margin: '0 4px'
            }}
          >
            {(stats.totalPort || 0).toLocaleString('id-ID')}
          </span>
          <span style={{ color: '#64748B' }}>
            ({(stats.totalUsed || 0).toLocaleString('id-ID')} port • {stats.occRate || 0}%)
          </span>
        </div>
      </div>

      {/* Card 3: Menunggu Verifikasi */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Menunggu Verifikasi</span>
          {stats.actUploaded > 0 && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF5E00' }} />}
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
          {(stats.actUploaded || 0).toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            Kegiatan
          </span>
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
          {stats.actUploaded > 0 ? 'Butuh tindakan review admin' : 'Semua kegiatan telah ditinjau'}
        </div>
      </div>

      {/* Card 4: Progress Verifikasi GTM */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
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
          Progress Verifikasi GTM
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
          {(stats.actCompletionPct || 0).toLocaleString('id-ID')}%
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
          Terverifikasi:{' '}
          <span
            style={{
              fontWeight: 600,
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {(stats.actVerified || 0).toLocaleString('id-ID')}
          </span>{' '}
          dari {(stats.totalActivitySlots || 0).toLocaleString('id-ID')} aktivitas
        </div>
      </div>
    </div>
  );
}
