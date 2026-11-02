import { useMemo } from 'react';
import { ACT_TYPES_ORDER } from '../../constants/dashboard';
import { useExecutiveSummary } from '../../hooks/useExecutiveSummary';
import { useExecutiveSummaryExport } from '../../hooks/useExecutiveSummaryExport';
import { useCountUp } from '../../hooks/useCountUp';

function AnimatedNumber({ value, enabled = true, duration = 650 }) {
  const count = useCountUp(value, { enabled, duration });
  return <>{count}</>;
}

// ─── KOLOM KIRI: MATRIKS EXECUTIVE SUMMARY PER BRANCH & WOK ───
export default function ExecutiveSummarySection({
  branches,
  searchQuery = '',
  scopeFilter = 'ALL',
  onScopeChange,
  branchList = [],
  isInView = true
}) {
  const executiveSummary = useExecutiveSummary(branches);
  const { isExportingPng, handleDownloadPNG } = useExecutiveSummaryExport();

  // Filter rows based on search query & scope
  const filteredRows = useMemo(() => {
    if (!executiveSummary?.rows) return [];
    let list = executiveSummary.rows;

    if (scopeFilter !== 'ALL') {
      list = list.filter(r => (r.branch || '').toUpperCase() === scopeFilter.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.branch || '').toLowerCase().includes(q) ||
        (r.wok || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [executiveSummary?.rows, scopeFilter, searchQuery]);

  // Recalculate rowspans for filtered results to prevent broken tables
  const rowsWithComputedRowSpan = useMemo(() => {
    const branchCounts = {};
    filteredRows.forEach(r => {
      branchCounts[r.branch] = (branchCounts[r.branch] || 0) + 1;
    });

    const seenBranches = {};
    return filteredRows.map(r => {
      const isFirst = !seenBranches[r.branch];
      seenBranches[r.branch] = true;
      return {
        ...r,
        computedIsFirst: isFirst,
        computedRowSpan: branchCounts[r.branch] || 1
      };
    });
  }, [filteredRows]);

  return (
    <div
      className="saas-card executive-summary-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '20px 22px',
        overflow: 'hidden'
      }}
    >
      {/* ─── Header Card Toolbar (Clean Executive Hierarchy) ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#475569',
                margin: 0,
                letterSpacing: '-0.1px'
              }}
            >
              Executive Summary
            </h2>
          </div>
        </div>

        {/* Actions Toolbar (Scope Dropdown & Ekspor PNG) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onScopeChange && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={scopeFilter}
                onChange={(e) => onScopeChange(e.target.value)}
                aria-label="Pilih cakupan branch"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '6px 28px 6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <option value="ALL">Semua Cakupan</option>
                {branchList.map((b) => (
                  <option key={b.name || b} value={b.name || b}>
                    Branch {b.name || b}
                  </option>
                ))}
              </select>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '9px',
                  pointerEvents: 'none'
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}
          {/* Clean Outline Ekspor PNG Button with Download Icon */}
        <button
          id="btn-export-png"
          type="button"
          onClick={handleDownloadPNG}
          disabled={isExportingPng}
          style={{
            cursor: isExportingPng ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontWeight: 600,
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '8px',
            transition: 'all 0.15s ease',
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{isExportingPng ? 'Mengekspor...' : 'Ekspor PNG'}</span>
        </button>
        </div>
      </div>

      {/* ─── Body Data: Multi-Tier Table Container ─── */}
      <div
        id="executive-summary-wrapper"
        className="table-responsive-wrapper custom-table-scrollbar"
        style={{
          overflowX: 'auto',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          position: 'relative',
          background: '#FFFFFF'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'center', minWidth: '1120px' }}>
          <thead>
            {/* Row 1 Header (Telkomsel Red Branding) */}
            <tr style={{ background: '#800000', color: '#FFFFFF', fontWeight: 500 }}>
              <th
                rowSpan={2}
                style={{
                  padding: '11px 10px',
                  width: '120px',
                  verticalAlign: 'middle',
                  borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'left',
                  background: '#800000'
                }}
              >
                Branch
              </th>
              <th
                rowSpan={2}
                style={{
                  padding: '11px 10px',
                  width: '160px',
                  verticalAlign: 'middle',
                  borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'left',
                  background: '#800000'
                }}
              >
                WOK
              </th>
              <th
                rowSpan={2}
                style={{
                  padding: '11px 8px',
                  width: '75px',
                  verticalAlign: 'middle',
                  borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'right',
                  background: '#800000'
                }}
              >
                LOP
              </th>

              {/* Group Done Activity */}
              <th
                colSpan={5}
                style={{
                  background: '#800000',
                  color: '#FFFFFF',
                  padding: '9px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  borderRight: '1px solid rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  letterSpacing: '0.02em'
                }}
              >
                Done Activity (Terverifikasi)
              </th>

              {/* Group Not Yet Activity */}
              <th
                colSpan={5}
                style={{
                  background: '#800000',
                  color: '#FFFFFF',
                  padding: '9px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  borderRight: '1px solid rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  letterSpacing: '0.02em'
                }}
              >
                Not Yet Activity (Belum)
              </th>

              {/* Progress Kolom */}
              <th
                rowSpan={2}
                style={{
                  padding: '11px 10px',
                  width: '95px',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  background: '#800000',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                Progress
              </th>
            </tr>

            {/* Row 2 Header Sub-Columns (5 Kegiatan Prioritas) */}
            <tr style={{ background: '#800000', color: '#FFFFFF', fontSize: '10px', fontWeight: 500 }}>
              {ACT_TYPES_ORDER.map((item) => (
                <th
                  key={`done-${item.key}`}
                  style={{
                    padding: '8px 4px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    minWidth: '68px',
                    background: '#800000',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '1.25',
                    whiteSpace: 'normal'
                  }}
                >
                  {item.shortLabel || item.label}
                </th>
              ))}
              {ACT_TYPES_ORDER.map((item, idx) => (
                <th
                  key={`notyet-${item.key}`}
                  style={{
                    padding: '8px 4px',
                    borderRight: idx === ACT_TYPES_ORDER.length - 1 ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    minWidth: '68px',
                    background: '#800000',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '1.25',
                    whiteSpace: 'normal'
                  }}
                >
                  {item.shortLabel || item.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rowsWithComputedRowSpan.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ padding: '24px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC' }}>
                  Tidak ada data yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              rowsWithComputedRowSpan.map((r, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={`${r.branch}-${r.wok}-${idx}`}
                    style={{
                      background: isEven ? '#FFFFFF' : '#F8FAFC',
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isEven ? '#FFFFFF' : '#F8FAFC';
                    }}
                  >
                    {/* Branch Rowspan */}
                    {r.computedIsFirst && (
                      <td
                        rowSpan={r.computedRowSpan}
                        style={{
                          padding: '10px 10px',
                          textAlign: 'left',
                          fontWeight: 500,
                          color: '#0F172A',
                          verticalAlign: 'top',
                          borderRight: '1px solid #E2E8F0',
                          borderBottom: '1px solid #CBD5E1',
                          background: '#FFFFFF'
                        }}
                      >
                        {r.branch}
                      </td>
                    )}

                    {/* WOK Name */}
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#334155',
                        borderRight: '1px solid #F1F5F9'
                      }}
                    >
                      {r.wok}
                    </td>

                    {/* Jumlah LOP */}
                    <td
                      style={{
                        padding: '8px 8px',
                        textAlign: 'right',
                        fontWeight: 500,
                        color: '#0F172A',
                        borderRight: '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      <AnimatedNumber value={r.lopCount} enabled={isInView} />
                    </td>

                    {/* 5 Kolom DONE */}
                    {ACT_TYPES_ORDER.map((item) => {
                      const val = r.done[item.key] || 0;
                      return (
                        <td
                          key={`row-done-${item.key}`}
                          style={{
                            padding: '8px 4px',
                            fontWeight: 500,
                            color: '#334155',
                            borderRight: '1px solid #F1F5F9',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          <AnimatedNumber value={val} enabled={isInView} />
                        </td>
                      );
                    })}

                    {/* 5 Kolom NOT YET */}
                    {ACT_TYPES_ORDER.map((item, iIdx) => {
                      const val = r.notYet[item.key] || 0;
                      return (
                        <td
                          key={`row-notyet-${item.key}`}
                          style={{
                            padding: '8px 4px',
                            fontWeight: 500,
                            color: '#334155',
                            borderRight: iIdx === ACT_TYPES_ORDER.length - 1 ? '1px solid #E2E8F0' : '1px solid #F1F5F9',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          <AnimatedNumber value={val} enabled={isInView} />
                        </td>
                      );
                    })}

                    {/* Progress Bar Badge Persentase */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '5px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(r.progressPct, 100)}%`,
                              background: r.progressPct > 50 ? '#059669' : '#800000',
                              borderRadius: '999px',
                              transition: 'width 0.8s ease'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#334155', minWidth: '32px', textAlign: 'right' }}>
                          {r.progressPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer: Grand Totals Regional Jateng DIY */}
          {((executiveSummary?.grandTotals) || (executiveSummary?.grandTotalLop !== undefined)) && (
            <tfoot>
              <tr style={{ background: '#800000', color: '#FFFFFF', fontWeight: 600, borderTop: '2px solid #550000' }}>
                <td colSpan={2} style={{ padding: '11px 12px', textAlign: 'left', borderRight: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '11.5px', letterSpacing: '0.03em' }}>
                  GRAND TOTAL
                </td>
                <td style={{ padding: '11px 8px', textAlign: 'right', borderRight: '1px solid rgba(255, 255, 255, 0.2)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  <AnimatedNumber value={executiveSummary.grandTotals?.lop ?? executiveSummary.grandTotalLop} enabled={isInView} />
                </td>
                {ACT_TYPES_ORDER.map((item) => (
                  <td key={`grand-done-${item.key}`} style={{ padding: '11px 4px', borderRight: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
                    <AnimatedNumber value={(executiveSummary.grandTotals?.done?.[item.key]) ?? executiveSummary.grandTotalDone?.[item.key] ?? 0} enabled={isInView} />
                  </td>
                ))}
                {ACT_TYPES_ORDER.map((item, idx) => (
                  <td
                    key={`grand-notyet-${item.key}`}
                    style={{
                      padding: '11px 4px',
                      borderRight: idx === ACT_TYPES_ORDER.length - 1 ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'center'
                    }}
                  >
                    <AnimatedNumber value={(executiveSummary.grandTotals?.notYet?.[item.key]) ?? executiveSummary.grandTotalNotYet?.[item.key] ?? 0} enabled={isInView} />
                  </td>
                ))}
                <td style={{ padding: '11px 8px', textAlign: 'center', color: '#FFFFFF', fontWeight: 600 }}>
                  {(executiveSummary.grandTotals?.progressPct) ?? executiveSummary.grandProgressPct ?? 0}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
