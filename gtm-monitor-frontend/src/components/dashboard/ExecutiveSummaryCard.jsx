import { ACT_TYPES_ORDER } from '../../constants/dashboard';
import { useExecutiveSummary } from '../../hooks/useExecutiveSummary';
import { useExecutiveSummaryExport } from '../../hooks/useExecutiveSummaryExport';

// ─── 4. EXECUTIVE SUMMARY CARD (REKAP AKTIVITAS PER WOK & BRANCH) ───
export default function ExecutiveSummaryCard({ branches }) {
  const executiveSummary = useExecutiveSummary(branches);
  const { isExportingPng, handleDownloadPNG } = useExecutiveSummaryExport();

  return (
    <div className="dashboard-card">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '16px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <div>
          <h2 style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: '#0F172A', 
            margin: '0 0 2px 0'
          }}>
            Executive Summary Program Aktivitas GTM
          </h2>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            Rekapitulasi 5 aktivitas prioritas per Branch dan WOK
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadPNG}
          disabled={isExportingPng}
          style={{
            cursor: isExportingPng ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#0F172A',
            fontWeight: 600,
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '6px',
            transition: 'background 0.15s ease',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: isExportingPng ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (!isExportingPng) e.currentTarget.style.background = '#F8FAFC';
          }}
          onMouseLeave={(e) => {
            if (!isExportingPng) e.currentTarget.style.background = '#FFFFFF';
          }}
        >
          <span>{isExportingPng ? 'Mengekspor...' : 'Ekspor PNG'}</span>
        </button>
      </div>

      {/* Corporate Data Table Container */}
      <div 
        id="executive-summary-wrapper" 
        className="table-responsive-wrapper custom-table-scrollbar" 
        style={{ 
          overflowX: 'auto', 
          overflowY: 'auto', 
          maxHeight: '70vh', 
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
                position: 'sticky', 
                top: 0, 
                zIndex: 30, 
                background: '#0F172A', 
                color: '#FFFFFF', 
                padding: '10px 8px', 
                width: '130px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B' 
              }} rowSpan={2}>
                Branch
              </th>
              <th style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 30, 
                background: '#0F172A', 
                color: '#FFFFFF', 
                padding: '10px 8px', 
                width: '160px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B' 
              }} rowSpan={2}>
                WOK
              </th>
              <th style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 30, 
                background: '#0F172A', 
                color: '#FFFFFF', 
                padding: '10px 8px', 
                width: '80px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B' 
              }} rowSpan={2}>
                Jumlah LOP
              </th>

              {/* Done Activities Header (No green dot, cohesive slate) */}
              <th style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 25, 
                background: '#1E293B', 
                color: '#FFFFFF', 
                padding: '8px 10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.4px', 
                borderRight: '1px solid #334155',
                borderBottom: '1px solid #334155' 
              }} colSpan={5}>
                Done Activity (Terverifikasi)
              </th>

              {/* Not Yet Activities Header (No red dot, cohesive slate) */}
              <th style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 25, 
                background: '#334155', 
                color: '#FFFFFF', 
                padding: '8px 10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.4px', 
                borderRight: '1px solid #1E293B',
                borderBottom: '1px solid #1E293B' 
              }} colSpan={5}>
                Not Yet Activity (Belum)
              </th>

              <th style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 30, 
                background: '#0F172A', 
                color: '#FFFFFF', 
                padding: '10px 8px', 
                width: '90px', 
                verticalAlign: 'middle' 
              }} rowSpan={2}>
                Progress
              </th>
            </tr>

            {/* Subheader Column Names */}
            <tr style={{ background: '#0F172A', color: '#CBD5E1', fontSize: '11px', fontWeight: 600 }}>
              {/* Subheaders Done Activity */}
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Tsel Menyapa</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Branding Outlet</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>BUMDES</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Rekrut SF</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Open Table</th>

              {/* Subheaders Not Yet Activity */}
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Tsel Menyapa</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Branding Outlet</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>BUMDES</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Rekrut SF</th>
              <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Open Table</th>
            </tr>
          </thead>

          <tbody>
            {executiveSummary.rows.map((row, rIdx) => (
              <tr 
                key={`${row.branch}-${row.wok}`} 
                style={{ 
                  background: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                }}
              >
                {/* Grouped Branch Column */}
                {row.isFirstInBranch && (
                  <td 
                    rowSpan={row.branchRowSpan} 
                    style={{ 
                      padding: '10px 8px', 
                      fontWeight: 700, 
                      fontSize: '12px',
                      color: '#0F172A', 
                      borderRight: '1px solid #E2E8F0', 
                      borderBottom: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      verticalAlign: 'middle',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                      {row.branch}
                    </span>
                  </td>
                )}

                {/* WOK Name */}
                <td style={{ 
                  padding: '8px 10px', 
                  fontWeight: 500, 
                  color: '#334155', 
                  textAlign: 'left', 
                  borderRight: '1px solid #E2E8F0', 
                  borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9' 
                }}>
                  {row.wok}
                </td>

                {/* LOP Count */}
                <td style={{ 
                  padding: '8px 6px', 
                  fontWeight: 700, 
                  color: '#0F172A', 
                  borderRight: '1px solid #E2E8F0', 
                  borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                  fontVariantNumeric: 'tabular-nums' 
                }}>
                  {row.lopCount}
                </td>

                {/* 5 Done Values (Plain text numbers, no green background box) */}
                {ACT_TYPES_ORDER.map(item => {
                  const val = row.done[item.key];
                  return (
                    <td 
                      key={`done-${item.key}`} 
                      style={{ 
                        padding: '8px 4px', 
                        fontWeight: val > 0 ? 700 : 400, 
                        color: val > 0 ? '#0F172A' : '#94A3B8', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {val > 0 ? val : '-'}
                    </td>
                  );
                })}

                {/* 5 Not Yet Values (Plain text numbers, no amber background box) */}
                {ACT_TYPES_ORDER.map(item => {
                  const val = row.notYet[item.key];
                  return (
                    <td 
                      key={`notyet-${item.key}`} 
                      style={{ 
                        padding: '8px 4px', 
                        fontWeight: val > 0 ? 600 : 400, 
                        color: val > 0 ? '#475569' : '#94A3B8', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {val > 0 ? val : '-'}
                    </td>
                  );
                })}

                {/* Progress % (Plain text number, NO background color badge) */}
                <td style={{ 
                  padding: '8px 6px', 
                  fontWeight: 700,
                  color: '#0F172A',
                  borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {row.progressPct}%
                </td>
              </tr>
            ))}
          </tbody>

          {/* Table Footer: Clean Grand Totals (No rainbow colored numbers, no pill) */}
          <tfoot>
            <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 700, borderTop: '2px solid #0F172A' }}>
              <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', letterSpacing: '0.4px' }}>
                TOTAL REGIONAL JATENG DIY
              </td>
              <td style={{ padding: '10px 6px', fontSize: '12px', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                {executiveSummary.grandTotalLop}
              </td>

              {/* Grand Total Done (Clean white numbers) */}
              {ACT_TYPES_ORDER.map(item => (
                <td 
                  key={`gt-done-${item.key}`} 
                  style={{ 
                    padding: '10px 4px', 
                    color: '#FFFFFF', 
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {executiveSummary.grandTotalDone[item.key]}
                </td>
              ))}

              {/* Grand Total Not Yet (Clean white numbers) */}
              {ACT_TYPES_ORDER.map(item => (
                <td 
                  key={`gt-notyet-${item.key}`} 
                  style={{ 
                    padding: '10px 4px', 
                    color: '#FFFFFF', 
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {executiveSummary.grandTotalNotYet[item.key]}
                </td>
              ))}

              {/* Grand Total Progress (Plain white text, no background badge) */}
              <td style={{ 
                padding: '10px 6px', 
                fontSize: '12px', 
                color: '#FFFFFF', 
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums' 
              }}>
                {executiveSummary.grandProgressPct}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
