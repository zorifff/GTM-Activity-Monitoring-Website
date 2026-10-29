import { ACT_TYPES_ORDER } from '../../constants/dashboard';
import { useExecutiveSummary } from '../../hooks/useExecutiveSummary';
import { useExecutiveSummaryExport } from '../../hooks/useExecutiveSummaryExport';
import { useCountUp } from '../../hooks/useCountUp';

function AnimatedCounterText({ value, decimals = 0, duration = 800, enabled = true }) {
  const animated = useCountUp(value, { enabled, decimals, duration });
  return <>{animated}</>;
}

// ─── SECTION 3: EXECUTIVE SUMMARY (MATRIKS WOK & AKTIVITAS DENGAN ROWSPAN) ───
export default function ExecutiveSummaryCard({ branches, isInView = true }) {
  const executiveSummary = useExecutiveSummary(branches);
  const { isExportingPng, handleDownloadPNG } = useExecutiveSummaryExport();

  return (
    <div className="executive-summary-container">
      {/* Header Toolbar: Judul di kiri, tombol Ekspor PNG di kanan */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '20px', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}
      >
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#1E293B', 
            margin: '0 0 2px 0',
            letterSpacing: '-0.2px'
          }}>
            Executive Summary
          </h2>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            Rekapitulasi 5 aktivitas prioritas per Branch dan WOK
          </div>
        </div>

        {/* Tombol Ekspor PNG (Outline rapi dengan ikon unduh) */}
        <button
          type="button"
          onClick={handleDownloadPNG}
          disabled={isExportingPng}
          style={{
            cursor: isExportingPng ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontWeight: 600,
            fontSize: '12px',
            padding: '7px 14px',
            borderRadius: '8px',
            transition: 'all 0.15s ease',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: isExportingPng ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
          }}
          onMouseEnter={(e) => {
            if (!isExportingPng) {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
              e.currentTarget.style.color = '#0F172A';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExportingPng) {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = '#334155';
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{isExportingPng ? 'Mengekspor...' : 'Ekspor PNG'}</span>
        </button>
      </div>

      {/* Corporate Multi-Tier Data Table Container */}
      <div 
        id="executive-summary-wrapper" 
        className="table-responsive-wrapper custom-table-scrollbar" 
        style={{ 
          overflowX: 'auto', 
          borderRadius: '8px', 
          border: '1px solid #E2E8F0', 
          position: 'relative', 
          background: '#FFFFFF' 
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center', minWidth: '1100px' }}>
          <thead>
            {/* Primary Header Row */}
            <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 700 }}>
              <th style={{ 
                padding: '12px 10px', 
                width: '130px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B',
                textAlign: 'left'
              }} rowSpan={2}>
                Branch
              </th>
              <th style={{ 
                padding: '12px 10px', 
                width: '160px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B',
                textAlign: 'left'
              }} rowSpan={2}>
                WOK
              </th>
              <th style={{ 
                padding: '12px 8px', 
                width: '85px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B',
                textAlign: 'right'
              }} rowSpan={2}>
                Jumlah LOP
              </th>

              {/* Group Header: DONE ACTIVITY (TERVERIFIKASI) */}
              <th style={{ 
                background: '#1E293B', 
                color: '#FFFFFF', 
                padding: '10px 10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                fontSize: '11px',
                borderRight: '1px solid #334155',
                borderBottom: '1px solid #334155' 
              }} colSpan={5}>
                Done Activity (Terverifikasi)
              </th>

              {/* Group Header: NOT YET ACTIVITY (BELUM) */}
              <th style={{ 
                background: '#334155', 
                color: '#FFFFFF', 
                padding: '10px 10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                fontSize: '11px',
                borderRight: '1px solid #1E293B',
                borderBottom: '1px solid #1E293B' 
              }} colSpan={5}>
                Not Yet Activity (Belum)
              </th>

              <th style={{ 
                padding: '12px 10px', 
                width: '95px', 
                verticalAlign: 'middle',
                textAlign: 'right' 
              }} rowSpan={2}>
                Progress
              </th>
            </tr>

            {/* Subheader Column Names */}
            <tr style={{ background: '#0F172A', color: '#CBD5E1', fontSize: '11px', fontWeight: 600 }}>
              {/* Subheaders Done Activity */}
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Tsel Menyapa</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Branding Outlet</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>BUMDES</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Rekrut SF</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Open Table</th>

              {/* Subheaders Not Yet Activity */}
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Tsel Menyapa</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Branding Outlet</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>BUMDES</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Rekrut SF</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Open Table</th>
            </tr>
          </thead>

          <tbody>
            {executiveSummary.rows.map((row, rIdx) => (
              <tr 
                key={`${row.branch}-${row.wok}`} 
                style={{ 
                  background: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                }}
              >
                {/* Grouped Branch Column with Strong Rowspan Separator */}
                {row.isFirstInBranch && (
                  <td 
                    rowSpan={row.branchRowSpan} 
                    style={{ 
                      padding: '10px 12px', 
                      fontWeight: 700, 
                      fontSize: '12.5px',
                      color: '#0F172A', 
                      borderRight: '1px solid #E2E8F0', 
                      borderBottom: '2px solid #CBD5E1',
                      background: '#FFFFFF',
                      verticalAlign: 'middle',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                      {row.branch}
                    </span>
                  </td>
                )}

                {/* WOK Name (Rata Kiri) */}
                <td style={{ 
                  padding: '9px 12px', 
                  fontWeight: 500, 
                  color: '#334155', 
                  textAlign: 'left', 
                  borderRight: '1px solid #E2E8F0', 
                  borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9' 
                }}>
                  {row.wok}
                </td>

                {/* LOP Count (Rata Kanan) */}
                <td style={{ 
                  padding: '9px 8px', 
                  fontWeight: 700, 
                  color: '#0F172A', 
                  textAlign: 'right',
                  borderRight: '1px solid #E2E8F0', 
                  borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                  fontVariantNumeric: 'tabular-nums' 
                }}>
                  {row.lopCount}
                </td>

                {/* 5 Done Values (Rata Kanan/Tengah) */}
                {ACT_TYPES_ORDER.map(item => {
                  const val = row.done[item.key];
                  return (
                    <td 
                      key={`done-${item.key}`} 
                      style={{ 
                        padding: '9px 6px', 
                        fontWeight: val > 0 ? 700 : 400, 
                        color: val > 0 ? '#0F172A' : '#94A3B8', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'center'
                      }}
                    >
                      {val > 0 ? val : '-'}
                    </td>
                  );
                })}

                {/* 5 Not Yet Values (Rata Kanan/Tengah) */}
                {ACT_TYPES_ORDER.map(item => {
                  const val = row.notYet[item.key];
                  return (
                    <td 
                      key={`notyet-${item.key}`} 
                      style={{ 
                        padding: '9px 6px', 
                        fontWeight: val > 0 ? 600 : 400, 
                        color: val > 0 ? '#475569' : '#94A3B8', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'center'
                      }}
                    >
                      {val > 0 ? val : '-'}
                    </td>
                  );
                })}

                {/* Progress % (Rata Kanan) */}
                <td style={{ 
                  padding: '9px 10px', 
                  fontWeight: 700,
                  color: '#0F172A', 
                  textAlign: 'right',
                  borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {row.progressPct}%
                </td>
              </tr>
            ))}
          </tbody>

          {/* Table Footer: Grand Totals Regional Jateng DIY */}
          <tfoot>
            <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 700, borderTop: '2px solid #0F172A' }}>
              <td colSpan={2} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11.5px', letterSpacing: '0.05em' }}>
                TOTAL REGIONAL JATENG DIY
              </td>
              <td style={{ padding: '12px 8px', fontSize: '12.5px', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                <AnimatedCounterText value={executiveSummary.grandTotalLop} duration={800} enabled={isInView} />
              </td>

              {/* Grand Total Done */}
              {ACT_TYPES_ORDER.map(item => (
                <td 
                  key={`gt-done-${item.key}`} 
                  style={{ 
                    padding: '12px 6px', 
                    color: '#FFFFFF', 
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center'
                  }}
                >
                  <AnimatedCounterText value={executiveSummary.grandTotalDone[item.key]} duration={800} enabled={isInView} />
                </td>
              ))}

              {/* Grand Total Not Yet */}
              {ACT_TYPES_ORDER.map(item => (
                <td 
                  key={`gt-notyet-${item.key}`} 
                  style={{ 
                    padding: '12px 6px', 
                    color: '#FFFFFF', 
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center'
                  }}
                >
                  <AnimatedCounterText value={executiveSummary.grandTotalNotYet[item.key]} duration={800} enabled={isInView} />
                </td>
              ))}

              {/* Grand Total Progress */}
              <td style={{ 
                padding: '12px 10px', 
                fontSize: '12.5px', 
                color: '#FFFFFF', 
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right' 
              }}>
                <AnimatedCounterText 
                  value={executiveSummary.grandProgressPct} 
                  decimals={executiveSummary.grandProgressPct % 1 !== 0 ? 1 : 0} 
                  duration={850} 
                  enabled={isInView} 
                />%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
