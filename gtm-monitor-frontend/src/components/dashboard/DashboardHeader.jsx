// ─── DASHBOARD PAGE HEADER & SEGMENTED TYPE FILTER ───
export default function DashboardHeader({ lastUpdateFormatted, typeDesignFilter = 'ALL', setTypeDesignFilter }) {
  const options = [
    { id: 'ALL', label: 'Semua Tipe' },
    { id: 'Greenfield', label: 'Greenfield' },
    { id: 'Brownfield', label: 'Brownfield' }
  ];

  return (
    <div 
      className="page-title-header dashboard-page-header" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}
    >
      <div>
        <div 
          style={{ 
            textTransform: 'uppercase', 
            fontSize: '11px', 
            letterSpacing: '2.5px', 
            color: '#FF5E00', 
            fontWeight: 800, 
            marginBottom: '4px' 
          }}
        >
          MONITORING &amp; TELEMETRI REGIONAL
        </div>
        <h1 
          style={{ 
            fontFamily: "var(--font-heading)", 
            fontSize: '28px', 
            fontWeight: 900, 
            color: '#0F172A', 
            margin: 0, 
            letterSpacing: '-0.5px',
            lineHeight: 1.2
          }}
        >
          Overview Kinerja Regional &amp; Occupancy
        </h1>
        {lastUpdateFormatted && (
          <div 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px', 
              color: '#64748B', 
              fontWeight: 500,
              marginTop: '6px'
            }}
          >
            <svg 
              width="13" 
              height="13" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Pembaruan data: {lastUpdateFormatted}</span>
          </div>
        )}
      </div>

      {/* Kontrol filter segmented pill button (Sesuai referensi UI) */}
      {setTypeDesignFilter && (
        <div 
          role="radiogroup"
          aria-label="Filter Tipe Proyek"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            background: '#F1F5F9', 
            padding: '3px', 
            borderRadius: '10px', 
            border: '1px solid #E2E8F0',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
          }}
        >
          {options.map((f) => {
            const isActive = typeDesignFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setTypeDesignFilter(f.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#0F172A';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#64748B';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
