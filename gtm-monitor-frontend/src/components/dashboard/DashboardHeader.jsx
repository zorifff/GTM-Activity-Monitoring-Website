// ─── 1. TOP HEADER & FILTER BAR (CLEAN CORPORATE HEADER) ───
export default function DashboardHeader({ lastUpdateFormatted, typeDesignFilter, setTypeDesignFilter }) {
  return (
    <div 
      className="page-title-header" 
      style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        marginBottom: '18px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}
    >
      <div>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: 700, 
          color: '#0F172A', 
          margin: 0, 
          letterSpacing: '-0.2px',
          lineHeight: 1.25
        }}>
          Overview Kinerja Regional & Occupancy
        </h1>
        {lastUpdateFormatted && (
          <div style={{ 
            fontSize: '11.5px', 
            color: '#64748B', 
            fontWeight: 500, 
            marginTop: '3px' 
          }}>
            Pembaruan data: {lastUpdateFormatted}
          </div>
        )}
      </div>

      {/* Refined Segmented Control Filter */}
      {setTypeDesignFilter && (
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            background: '#F1F5F9', 
            padding: '3px', 
            borderRadius: '7px', 
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
                  padding: '5px 12px',
                  borderRadius: '5px',
                  border: isActive ? '1px solid #E2E8F0' : '1px solid transparent',
                  fontSize: '11.5px',
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
    </div>
  );
}
