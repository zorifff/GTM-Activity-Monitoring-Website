import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { SESSION_1_MONTHS, SESSION_2_MONTHS, PROGRAM_PLACEHOLDERS } from '../../constants/programs';

// Menu PROGRAM di navigasi atas: dropdown periode (level 1) + daftar program per bulan (level 2)
export default function ProgramMenu({ user, setShowLoginModal, dynamicMonthsData, setActiveProgramModal }) {
  const programTabRef = useRef(null);
  const programMenuRef = useRef(null);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [activeHoverMonth, setActiveHoverMonth] = useState('Agustus 2026');
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });

  const updateDropdownCoords = useCallback(() => {
    if (programTabRef.current) {
      const rect = programTabRef.current.getBoundingClientRect();
      const dropdownWidth = 220;
      let targetLeft = rect.left + rect.width / 2;
      const margin = 12;
      if (targetLeft - dropdownWidth / 2 < margin) {
        targetLeft = dropdownWidth / 2 + margin;
      } else if (targetLeft + dropdownWidth / 2 > window.innerWidth - margin) {
        targetLeft = window.innerWidth - dropdownWidth / 2 - margin;
      }
      setDropdownCoords({
        top: rect.bottom + 8,
        left: targetLeft
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isProgramDropdownOpen) {
      updateDropdownCoords();
      window.addEventListener('resize', updateDropdownCoords);
      window.addEventListener('scroll', updateDropdownCoords);
      return () => {
        window.removeEventListener('resize', updateDropdownCoords);
        window.removeEventListener('scroll', updateDropdownCoords);
      };
    }
  }, [isProgramDropdownOpen, updateDropdownCoords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        programMenuRef.current && !programMenuRef.current.contains(e.target) &&
        !e.target.closest('.program-fixed-dropdown')
      ) {
        setIsProgramDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={programMenuRef} style={{ position: 'relative' }}>
      <button
        ref={programTabRef}
        type="button"
        className="nav-tab-btn"
        onClick={() => {
          if (!user) {
            setShowLoginModal(true);
            return;
          }
          if (!isProgramDropdownOpen) {
            updateDropdownCoords();
          }
          setIsProgramDropdownOpen(!isProgramDropdownOpen);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: isProgramDropdownOpen ? '#ED0226' : '#64748B',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          cursor: 'pointer',
          transition: 'color 0.2s ease',
          padding: '6px 4px',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => { if (!isProgramDropdownOpen) e.currentTarget.style.color = '#0F172A'; }}
        onMouseLeave={(e) => { if (!isProgramDropdownOpen) e.currentTarget.style.color = '#64748B'; }}
      >
        <span>PROGRAM</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isProgramDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* LEVEL 1 DROPDOWN (FIXED POSITIONING UNTUK MENGHINDARI OVERFLOW CLIPPING) */}
      {user && isProgramDropdownOpen && dropdownCoords.top > 0 && (
        <div
          className="program-fixed-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`,
            transform: 'translateX(-50%)',
            width: '210px',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.16)',
            padding: '8px 0',
            zIndex: 99999,
            animation: 'programDropdownFadeIn 0.15s ease-out'
          }}
        >
          {(() => {
            const nowMonthIdx = new Date().getMonth();
            const isSession2 = nowMonthIdx >= 6;
            const activeMonths = isSession2 ? SESSION_2_MONTHS : SESSION_1_MONTHS;

            return (
              <>
                <div style={{ padding: '8px 16px 6px 16px', fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1.2px', borderBottom: '1px solid #F1F5F9' }}>
                  Periode Program
                </div>

                {activeMonths.map(m => {
                  const monthData = dynamicMonthsData[m.label];
                  const hasDynamicData = monthData && monthData.programs && monthData.programs.length > 0;
                  const hasPlaceholders = PROGRAM_PLACEHOLDERS[m.label] && PROGRAM_PLACEHOLDERS[m.label].length > 0;
                  const hasPrograms = hasDynamicData || hasPlaceholders;

                  const isHovered = activeHoverMonth === m.label;
                  const isCurrent = m.isCurrent;

                  return (
                    <div
                      key={m.id}
                      onMouseEnter={() => {
                        if (hasPrograms) {
                          setActiveHoverMonth(m.label);
                        } else {
                          setActiveHoverMonth(null);
                        }
                      }}
                      onClick={() => {
                        if (hasPrograms) {
                          setActiveHoverMonth(activeHoverMonth === m.label ? null : m.label);
                        }
                      }}
                      style={{
                        position: 'relative',
                        padding: '10px 16px',
                        fontSize: '12.5px',
                        fontWeight: isCurrent ? 800 : 600,
                        color: !hasPrograms ? '#94A3B8' : (isHovered ? '#C8102E' : isCurrent ? '#0F172A' : '#334155'),
                        background: isHovered && hasPrograms ? 'rgba(200, 16, 46, 0.04)' : 'transparent',
                        cursor: hasPrograms ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{m.label}</span>
                      </div>

                      {hasPrograms ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isHovered ? '#C8102E' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isHovered ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#CBD5E1', fontWeight: 500, fontStyle: 'italic' }}>Belum ada</span>
                      )}

                      {/* LEVEL 2 SUBMENU (DESKTOP FLYOUT + MOBILE INLINE ACCORDION) */}
                      {isHovered && hasPrograms && (() => {
                        const programList = hasDynamicData
                          ? monthData.programs.map(p => ({ name: p.sheetName, data: p }))
                          : (PROGRAM_PLACEHOLDERS[m.label] || []).map(pName => ({ name: pName, data: null }));

                        return (
                          <>
                            {/* DESKTOP SIDE FLYOUT (Hidden on mobile via CSS) */}
                            <div
                              className="program-level2-flyout"
                              style={{
                                position: 'absolute',
                                top: '-8px',
                                left: '100%',
                                marginLeft: '8px',
                                width: '260px',
                                background: '#FFFFFF',
                                borderRadius: '16px',
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 16px 36px rgba(15, 23, 42, 0.18)',
                                padding: '8px 0',
                                zIndex: 100000,
                                animation: 'fadeIn 0.2s ease-in-out'
                              }}
                            >
                              <div style={{ padding: '8px 16px 6px 16px', fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1.2px', borderBottom: '1px solid #F1F5F9' }}>
                                Program {m.label}
                              </div>
                              {programList.map((progItem, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsProgramDropdownOpen(false);
                                    const targetProg = progItem.data || { sheetName: progItem.name, detailUrl: null, imageUrl: null };
                                    setActiveProgramModal({
                                      program: targetProg,
                                      monthLabel: m.label
                                    });
                                  }}
                                  style={{
                                    padding: '10px 16px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#C8102E';
                                    e.currentTarget.style.background = 'rgba(200, 16, 46, 0.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#334155';
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progItem.name}</span>
                                  {progItem.data?.images?.length > 1 && (
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        fontSize: '9.5px',
                                        fontWeight: 800,
                                        color: '#FF5E00',
                                        background: 'rgba(255, 94, 0, 0.08)',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255, 94, 0, 0.2)'
                                      }}
                                    >
                                      {progItem.data.images.length} Slide
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* MOBILE INLINE COLLAPSIBLE ACCORDION (Shown on mobile via CSS) */}
                            <div
                              className="program-level2-inline"
                              style={{
                                width: '100%',
                                background: '#F8FAFC',
                                borderRadius: '10px',
                                margin: '6px 0 2px 0',
                                padding: '4px 0',
                                borderLeft: '3px solid #C8102E',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div style={{ padding: '6px 12px 4px 12px', fontSize: '9.5px', fontWeight: 800, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Daftar Program {m.label}:
                              </div>
                              {programList.map((progItem, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsProgramDropdownOpen(false);
                                    const targetProg = progItem.data || { sheetName: progItem.name, detailUrl: null, imageUrl: null };
                                    setActiveProgramModal({
                                      program: targetProg,
                                      monthLabel: m.label
                                    });
                                  }}
                                  style={{
                                    padding: '8px 12px 8px 18px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ color: '#FF5E00', fontWeight: '900', flexShrink: 0 }}>•</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progItem.name}</span>
                                  </div>
                                  {progItem.data?.images?.length > 1 && (
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        color: '#FF5E00',
                                        background: 'rgba(255, 94, 0, 0.08)',
                                        padding: '1px 5px',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      {progItem.data.images.length} Slide
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
