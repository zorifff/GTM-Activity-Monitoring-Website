import { useState, useCallback, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── SUB-COMPONENT: WOK SUB-ROW WITH IN-VIEW ANIMATION ───
function WokRowItem({ w, index, isMounted, isInView, goBranch, branchName }) {
  const isDecimal = Number(w.occRate) % 1 !== 0;
  const countOcc = useCountUp(w.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: 650, delay: index * 20 });
  const countProj = useCountUp(w.projCount, { enabled: isInView, duration: 600, delay: index * 20 });
  const countAct = useCountUp(w.actPct, { enabled: isInView, duration: 650, delay: index * 20 });

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (goBranch) goBranch(branchName);
      }}
      className="ranking-row-animated"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(85px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
        alignItems: 'center',
        gap: '12px',
        padding: '9px 16px',
        background: '#F8FAFC',
        borderBottom: '1px solid #F1F5F9',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        animationDelay: `${Math.min(index * 25, 200)}ms`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontWeight: 500, 
        fontSize: '12.5px', 
        color: '#334155', 
        minWidth: 0, 
        overflow: 'hidden',
        paddingLeft: '16px'
      }}>
        <span style={{ color: '#94A3B8' }}>└</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {w.name}
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
        <div 
          className="progress-bar-fill"
          style={{ 
            height: '100%', 
            width: isMounted && isInView ? `${Math.min(w.occRate, 100)}%` : '0%', 
            background: '#475569', 
            borderRadius: '999px'
          }} 
        />
      </div>

      {/* Occupancy % */}
      <div style={{ 
        fontSize: '12.5px', 
        fontWeight: 600, 
        color: '#334155', 
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {countOcc}%
      </div>

      {/* Gap WoW Badge */}
      <div style={{ textAlign: 'center' }}>
        <span className={w.delta > 0 ? 'gap-badge-pos' : w.delta < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
          {w.delta > 0 ? `+${w.delta}%` : `${w.delta}%`}
        </span>
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#64748B', 
        fontWeight: 500, 
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {countProj} proyek
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#64748B', 
        fontWeight: 500, 
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {countAct}%
      </div>

      <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
        →
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: BRANCH MAIN ROW WITH IN-VIEW ANIMATION ───
function BranchRowItem({ b, index, isMounted, isInView, isExpanded, hasWoks, onToggle, goBranch }) {
  const isDecimal = Number(b.occRate) % 1 !== 0;
  const countOcc = useCountUp(b.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: 750, delay: Math.min(index * 30, 250) });
  const countProj = useCountUp(b.projCount, { enabled: isInView, duration: 650, delay: Math.min(index * 30, 250) });
  const countAct = useCountUp(b.actPct, { enabled: isInView, duration: 750, delay: Math.min(index * 30, 250) });

  return (
    <div style={{ borderBottom: '1px solid #F1F5F9' }}>
      {/* Main Branch Row */}
      <div
        onClick={(e) => {
          if (hasWoks) onToggle(b.name, e);
          else if (goBranch) goBranch(b.name);
        }}
        className="ranking-row-animated"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(85px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: isExpanded ? '#F8FAFC' : '#FFFFFF',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
          animationDelay: `${Math.min(index * 35, 300)}ms`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = '#FFFFFF';
        }}
      >
        {/* Branch Name with Expansion Caret */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontWeight: 700, 
          fontSize: '13.5px', 
          color: '#0F172A',
          minWidth: 0, 
          overflow: 'hidden' 
        }}>
          {hasWoks && (
            <span style={{ 
              fontSize: '10px', 
              color: '#64748B', 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
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

        {/* Mini Progress Bar */}
        <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
          <div 
            className="progress-bar-fill"
            style={{ 
              height: '100%', 
              width: isMounted && isInView ? `${Math.min(b.occRate, 100)}%` : '0%', 
              background: '#0F172A', 
              borderRadius: '999px'
            }} 
          />
        </div>

        {/* Occupancy % */}
        <div style={{ 
          fontSize: '13px', 
          fontWeight: 700, 
          color: '#0F172A', 
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countOcc}%
        </div>

        {/* Gap WoW Badge */}
        <div style={{ textAlign: 'center' }}>
          <span className={b.delta > 0 ? 'gap-badge-pos' : b.delta < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
            {b.delta > 0 ? `+${b.delta}%` : `${b.delta}%`}
          </span>
        </div>

        {/* Project Count */}
        <div style={{ 
          fontSize: '12.5px', 
          color: '#64748B', 
          fontWeight: 500, 
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countProj} proyek
        </div>

        {/* GTM Done % */}
        <div style={{ 
          fontSize: '12.5px', 
          color: '#64748B', 
          fontWeight: 500, 
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countAct}%
        </div>

        {/* Action Button Link */}
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
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 6px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#C8102E';
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
          background: '#F8FAFC',
          borderTop: '1px solid #F1F5F9'
        }}>
          {b.woks.map((w, wIdx) => (
            <WokRowItem
              key={w.name}
              w={w}
              index={wIdx}
              isMounted={isMounted}
              isInView={isInView}
              goBranch={goBranch}
              branchName={b.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECTION 2: RANKING BRANCH BERDASARKAN OCCUPANCY (ROUNDED CONTAINER) ───
export default function BranchRankingCard({ safeRanking, goBranch, isInView = true }) {
  const [expandedBranches, setExpandedBranches] = useState({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const toggleBranchExpand = useCallback((branchName, e) => {
    if (e) e.stopPropagation();
    setExpandedBranches(prev => ({ ...prev, [branchName]: !prev[branchName] }));
  }, []);

  return (
    <div className="ranking-card-container">
      {/* Header Container: px-6 py-4 border-b border-slate-100 flex items-center justify-between */}
      <div className="ranking-card-header">
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#1E293B', 
            margin: '0 0 2px 0',
            letterSpacing: '-0.2px'
          }}>
            Ranking Branch Berdasarkan Occupancy
          </h2>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            Diurutkan dari occupancy terendah untuk prioritas intervensi
          </div>
        </div>
      </div>

      <div className="table-responsive-wrapper custom-table-scrollbar" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '820px' }}>
          {/* Table Column Headers: Dark Navy background (bg-slate-900) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(85px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
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
              fontSize: '13px',
              background: '#FAFAFC'
            }}>
              Belum ada data branch untuk filter yang dipilih.
            </div>
          )}

          {/* Branch Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {safeRanking.map((b, bIdx) => (
              <BranchRowItem
                key={b.name}
                b={b}
                index={bIdx}
                isMounted={isMounted}
                isInView={isInView}
                isExpanded={!!expandedBranches[b.name]}
                hasWoks={b.woks && b.woks.length > 0}
                onToggle={toggleBranchExpand}
                goBranch={goBranch}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
