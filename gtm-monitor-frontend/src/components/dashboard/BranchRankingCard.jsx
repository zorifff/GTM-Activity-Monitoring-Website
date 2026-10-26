import { useState, useCallback } from 'react';

// ─── 3. RANKING BRANCH & WOK SECTION (CLEAN ENTERPRISE TABLE) ───
export default function BranchRankingCard({ safeRanking, goBranch }) {
  const [expandedBranches, setExpandedBranches] = useState({});

  const toggleBranchExpand = useCallback((branchName, e) => {
    if (e) e.stopPropagation();
    setExpandedBranches(prev => ({ ...prev, [branchName]: !prev[branchName] }));
  }, []);

  return (
    <div className="dashboard-card" style={{ marginBottom: '20px', padding: '18px 20px', borderRadius: '12px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '14px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <div>
          <h2 style={{ 
            fontSize: '15px', 
            fontWeight: 700, 
            color: '#0F172A', 
            margin: '0 0 2px 0'
          }}>
            Ranking Branch Berdasarkan Occupancy
          </h2>
          <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
            Diurutkan dari occupancy terendah
          </div>
        </div>
      </div>

      <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '780px' }}>
          {/* Table Column Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(170px, 1.2fr) minmax(75px, 0.6fr) minmax(75px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 14px',
            background: '#F8FAFC',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748B',
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}>
            <div>Branch / WOK</div>
            <div>Occupancy</div>
            <div style={{ textAlign: 'right' }}>Persentase</div>
            <div style={{ textAlign: 'center' }}>Gap WoW</div>
            <div style={{ textAlign: 'right' }}>Proyek</div>
            <div style={{ textAlign: 'right' }}>GTM Selesai</div>
            <div style={{ textAlign: 'center' }}>Aksi</div>
          </div>

          {/* Empty state when ranking is empty */}
          {safeRanking.length === 0 && (
            <div style={{ 
              padding: '36px 16px', 
              textAlign: 'center', 
              color: '#94A3B8', 
              fontSize: '12.5px',
              background: '#FAFAFC',
              borderRadius: '6px',
              border: '1px dashed #E2E8F0',
              marginTop: '6px'
            }}>
              Belum ada data branch untuk filter yang dipilih.
            </div>
          )}

          {/* Branch Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {safeRanking.map(b => {
              const isExpanded = !!expandedBranches[b.name];
              const hasWoks = b.woks && b.woks.length > 0;

              return (
                <div key={b.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {/* Main Branch Row */}
                  <div
                    onClick={(e) => {
                      if (hasWoks) toggleBranchExpand(b.name, e);
                      else if (goBranch) goBranch(b.name);
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(170px, 1.2fr) minmax(75px, 0.6fr) minmax(75px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: isExpanded ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) e.currentTarget.style.background = '#FFFFFF';
                    }}
                  >
                    {/* Branch Name with Expansion Caret */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontWeight: 700, 
                      fontSize: '13px', 
                      color: '#0F172A',
                      minWidth: 0, 
                      overflow: 'hidden' 
                    }}>
                      {hasWoks && (
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#64748B', 
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease',
                          display: 'inline-block',
                          width: '12px'
                        }}>
                          ▶
                        </span>
                      )}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.name}
                      </span>
                    </div>

                    {/* Clean Progress Bar (No 35% line, no clutter) */}
                    <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${Math.min(b.occRate, 100)}%`, 
                          background: '#0F172A', 
                          borderRadius: '3px'
                        }} 
                      />
                    </div>

                    {/* Occupancy % (Clean text, no background badge) */}
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: 700, 
                      color: '#0F172A', 
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {b.occRate}%
                    </div>

                    {/* Gap WoW (Clean plain text, no colored badge) */}
                    <div style={{ 
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: b.delta > 0 ? '#16A34A' : b.delta < 0 ? '#DC2626' : '#64748B'
                    }}>
                      {b.delta > 0 ? `+${b.delta}%` : `${b.delta}%`}
                    </div>

                    {/* Project Count */}
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#64748B', 
                      fontWeight: 500, 
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {b.projCount} proyek
                    </div>

                    {/* GTM Done % */}
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#64748B', 
                      fontWeight: 500, 
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {b.actPct}%
                    </div>

                    {/* Action */}
                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (goBranch) goBranch(b.name);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#0F172A',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontFamily: "'Plus Jakarta Sans', sans-serif"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ED0226';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#0F172A';
                        }}
                      >
                        Detail →
                      </button>
                    </div>
                  </div>

                  {/* Sub-Rows for WOKs */}
                  {isExpanded && hasWoks && (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '2px', 
                      paddingLeft: '16px',
                      borderLeft: '2px solid #E2E8F0',
                      marginLeft: '8px'
                    }}>
                      {b.woks.map((w) => (
                        <div
                          key={w.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (goBranch) goBranch(b.name);
                          }}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(180px, 1.4fr) minmax(170px, 1.2fr) minmax(75px, 0.6fr) minmax(75px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            background: '#F8FAFC',
                            border: '1px solid #F1F5F9',
                            cursor: 'pointer',
                            transition: 'background 0.1s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F1F5F9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            fontWeight: 500, 
                            fontSize: '12px', 
                            color: '#334155', 
                            minWidth: 0, 
                            overflow: 'hidden' 
                          }}>
                            <span style={{ color: '#94A3B8' }}>└</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {w.name}
                            </span>
                          </div>

                          <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${Math.min(w.occRate, 100)}%`, 
                                background: '#475569', 
                                borderRadius: '2px'
                              }} 
                            />
                          </div>

                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: 600, 
                            color: '#334155', 
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {w.occRate}%
                          </div>

                          <div style={{ 
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color: w.delta > 0 ? '#16A34A' : w.delta < 0 ? '#DC2626' : '#64748B'
                          }}>
                            {w.delta > 0 ? `+${w.delta}%` : `${w.delta}%`}
                          </div>

                          <div style={{ 
                            fontSize: '11px', 
                            color: '#64748B', 
                            fontWeight: 500, 
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {w.projCount} proyek
                          </div>

                          <div style={{ 
                            fontSize: '11px', 
                            color: '#64748B', 
                            fontWeight: 500, 
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {w.actPct}%
                          </div>

                          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
                            →
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
