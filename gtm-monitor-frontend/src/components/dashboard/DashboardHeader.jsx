// ─── SECTION 1: HEADER & FILTER BAR ───
export default function DashboardHeader({ lastUpdateFormatted, typeDesignFilter, setTypeDesignFilter }) {
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}
    >
      <div>
        <h1 
          style={{ 
            fontSize: '24px', 
            fontWeight: 600, 
            color: '#1E293B', 
            margin: 0, 
            letterSpacing: '-0.3px',
            lineHeight: 1.25
          }}
        >
          Overview Kinerja Regional & Occupancy
        </h1>
      </div>

      {/* Kontrol filter segmented button + timestamp kecil di bawahnya */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        {setTypeDesignFilter && (
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              background: '#F1F5F9', 
              padding: '3px', 
              borderRadius: '8px', 
              border: '1px solid #E2E8F0'
            }}
          >
            {[
              { id: 'ALL', label: 'Semua Tipe' },
              { id: 'Greenfield', label: 'Greenfield' },
              { id: 'Brownfield', label: 'Brownfield' }
            ].map((f) => {
              const isActive = typeDesignFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeDesignFilter(f.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: isActive ? '1px solid #E2E8F0' : '1px solid transparent',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#0F172A';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#64748B';
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {lastUpdateFormatted && (
          <div 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px', 
              color: '#64748B', 
              fontWeight: 500 
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Pembaruan: {lastUpdateFormatted}</span>
          </div>
        )}
      </div>
    </div>
  );
}
