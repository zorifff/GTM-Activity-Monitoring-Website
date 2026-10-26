import { useState, useEffect } from 'react';

// ─── 2. KPI CARDS ROW (CLEAN, PROPORTIONAL, COMPACT) ───
export default function KpiCards({ safeKpi, safeStatusChips }) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setIsStatusDropdownOpen(false);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px',
      marginBottom: '18px'
    }}>
      {/* KPI 1: Total Occupancy Rate */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Total Occupancy Rate
          </span>
        </div>

        <div style={{ 
          fontSize: '22px', 
          fontWeight: 700, 
          color: '#0F172A', 
          marginTop: '4px', 
          letterSpacing: '-0.3px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15
        }}>
          {safeKpi.occRate}%
        </div>

        <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${Math.min(safeKpi.occRate, 100)}%`, 
              background: '#0F172A', 
              borderRadius: '2px'
            }} 
          />
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {safeKpi.totalUsed.toLocaleString('id-ID')} dari {safeKpi.totalPort.toLocaleString('id-ID')} port terpakai
        </div>
      </div>

      {/* KPI 2: Port Tersedia */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Port Tersedia
          </span>
        </div>

        <div style={{ 
          fontSize: '22px', 
          fontWeight: 700, 
          color: '#0F172A', 
          marginTop: '4px', 
          letterSpacing: '-0.3px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15
        }}>
          {safeKpi.totalAvai.toLocaleString('id-ID')}
        </div>

        <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${safeKpi.totalPort > 0 ? Math.min((safeKpi.totalAvai / safeKpi.totalPort) * 100, 100) : 0}%`, 
              background: '#64748B', 
              borderRadius: '2px'
            }} 
          />
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Total kapasitas {safeKpi.totalPort.toLocaleString('id-ID')} port di {safeKpi.odpCount.toLocaleString('id-ID')} ODP
        </div>
      </div>

      {/* KPI 3: Status ODP */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Total ODP Terpantau
          </span>

          {/* Rincian Status Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
            }}
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              border: '1px solid #E2E8F0',
              fontSize: '10.5px',
              fontWeight: 600,
              background: isStatusDropdownOpen ? '#F1F5F9' : '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              lineHeight: 1.2
            }}
          >
            Rincian
          </button>
        </div>

        <div style={{ 
          fontSize: '22px', 
          fontWeight: 700, 
          color: '#0F172A', 
          marginTop: '4px', 
          letterSpacing: '-0.3px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15
        }}>
          {safeKpi.odpCount.toLocaleString('id-ID')}
        </div>

        <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
          {safeKpi.odpCount > 0 ? (
            safeStatusChips.map(s => {
              const sharePct = (s.count / safeKpi.odpCount) * 100;
              if (sharePct <= 0) return null;
              return (
                <div 
                  key={s.label}
                  title={`${s.label}: ${s.count}`}
                  style={{
                    height: '100%',
                    width: `${sharePct}%`,
                    background: s.color
                  }}
                />
              );
            })
          ) : (
            <div style={{ height: '100%', width: '0%', background: '#64748B' }} />
          )}
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Cakupan wilayah operasional regional Jateng DIY
        </div>

        {/* Clean Status Popover */}
        {isStatusDropdownOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              width: '210px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)',
              zIndex: 1000,
              padding: '6px 0'
            }}
          >
            <div style={{ 
              padding: '6px 12px 8px 12px', 
              fontSize: '10px', 
              fontWeight: 700, 
              color: '#64748B', 
              borderBottom: '1px solid #F1F5F9', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Rincian Kategori ODP
            </div>
            {safeStatusChips.map(s => {
              const sharePct = safeKpi.odpCount > 0 
                ? Math.round((s.count / safeKpi.odpCount) * 1000) / 10 
                : 0;
              return (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    borderBottom: '1px solid #FAFAFC'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#334155' }}>{s.label}</span>
                  <span style={{ color: '#0F172A', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {s.count.toLocaleString('id-ID')} <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '10.5px' }}>({sharePct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI 4: Aktivitas GTM Terverifikasi */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Aktivitas GTM Terverifikasi
          </span>
        </div>

        <div style={{ 
          fontSize: '22px', 
          fontWeight: 700, 
          color: '#0F172A', 
          marginTop: '4px', 
          letterSpacing: '-0.3px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15
        }}>
          {safeKpi.actCompletionPct}%
        </div>

        <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${Math.min(safeKpi.actCompletionPct, 100)}%`, 
              background: '#0F172A', 
              borderRadius: '2px'
            }} 
          />
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {safeKpi.actVerified} terverifikasi · {safeKpi.actUploaded} diunggah · {safeKpi.actPending || safeKpi.actBelum || 0} belum
        </div>
      </div>
    </div>
  );
}
