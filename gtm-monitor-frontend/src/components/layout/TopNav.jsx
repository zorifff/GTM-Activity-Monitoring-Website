import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import CekPairingNavItem from './CekPairingNavItem';
import ProgramMenu from './ProgramMenu';
import { SHOW_PROGRAM_MENU } from '../../constants/programs';
import { formatBranch } from '../../utils';

// ─── SINGLE UNIFIED PERSISTENT TOP NAVIGATION BAR (SEAMLESS ACROSS ALL PAGES) ───
// layoutVersion: berubah saat data dimuat ulang → posisi garis indikator menu dihitung ulang
export default function TopNav({
  view, user, isAdmin, layoutVersion,
  goDashboard, goUpload, goAdmin, onLoginClick,
  setShowLoginModal, showProfileModal, setShowProfileModal,
  dynamicMonthsData, setActiveProgramModal
}) {
  const monitoringTabRef = useRef(null);
  const activityTabRef = useRef(null);
  const controlTabRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = useCallback((targetView = view) => {
    let target = null;
    if (targetView === 'dashboard' || targetView === 'branch') {
      target = monitoringTabRef.current;
    } else if (targetView === 'upload') {
      target = activityTabRef.current;
    } else if (targetView === 'admin') {
      target = controlTabRef.current;
    }

    if (target && target.offsetWidth > 0) {
      setIndicatorStyle({
        left: target.offsetLeft,
        width: target.offsetWidth,
        opacity: 1
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [view]);

  useLayoutEffect(() => {
    updateIndicator(view);
    const timer = setTimeout(() => { updateIndicator(view); }, 50);
    const timer2 = setTimeout(() => { updateIndicator(view); }, 200);
    const handleResize = () => { updateIndicator(view); };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [view, layoutVersion, user, updateIndicator]);

  return (
    <nav className="main-top-nav" style={{
      position: 'sticky',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #E2E8F0',
      padding: '16px 48px',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center'
    }}>
      {/* Left: LOGO TELKOMSEL (Pojok Kiri Bar Menu) */}
      <div 
        className="nav-logo-section"
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifySelf: 'start', flexShrink: 0 }} 
        onClick={goDashboard}
        title="Beranda Monitoring Telkomsel"
      >
        <img 
          src="/telkomsel-logo.png" 
          alt="Telkomsel" 
          style={{ 
            height: '24px', 
            width: 'auto', 
            display: 'block', 
            objectFit: 'contain' 
          }} 
        />
      </div>

      {/* Center: Nav Menu Options (Semua menu terlihat langsung tanpa scroll horizontal) */}
      <div className="nav-menu-section" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
        <div 
          className="nav-menu-items" 
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '32px', paddingBottom: '4px' }}
        >

          <button
            ref={monitoringTabRef}
            type="button"
            className="nav-tab-btn"
            onClick={goDashboard}
            style={{
              background: 'none',
              border: 'none',
              color: (view === 'dashboard' || view === 'branch') ? '#ED0226' : '#64748B',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              padding: '6px 4px',
              outline: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={(e) => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#64748B'; }}
          >
            MONITORING
          </button>

          <button
            ref={activityTabRef}
            type="button"
            className="nav-tab-btn"
            onClick={goUpload}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'upload' ? '#ED0226' : '#64748B',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              padding: '6px 4px',
              outline: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { if (view !== 'upload') e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={(e) => { if (view !== 'upload') e.currentTarget.style.color = '#64748B'; }}
          >
            ACTIVITY
          </button>

          <CekPairingNavItem user={user} setShowLoginModal={setShowLoginModal} />

          {isAdmin && (
            <button
              ref={controlTabRef}
              type="button"
              className="nav-tab-btn"
              onClick={goAdmin}
              style={{
                background: 'none',
                border: 'none',
                color: view === 'admin' ? '#ED0226' : '#64748B',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                padding: '6px 4px',
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => { if (view !== 'admin') e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { if (view !== 'admin') e.currentTarget.style.color = '#64748B'; }}
            >
              CONTROL
            </button>
          )}

          {/* MENU PROGRAM DENGAN 2-TIER SIDE POP-UP DROPDOWN (FLAG: SHOW_PROGRAM_MENU) */}
          {SHOW_PROGRAM_MENU && (
            <ProgramMenu user={user} setShowLoginModal={setShowLoginModal} dynamicMonthsData={dynamicMonthsData} setActiveProgramModal={setActiveProgramModal} />
          )}

          {/* Sliding Solid Telkomsel Red Line Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              height: '2.5px',
              background: '#ED0226',
              borderRadius: '2px 2px 0 0',
              opacity: indicatorStyle.opacity,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      {/* Right: User Profile Widget / Login Button */}
      <div className="nav-account-section" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="nav-profile-btn"
              onClick={() => setShowProfileModal(!showProfileModal)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: showProfileModal ? '#F1F5F9' : 'rgba(248, 250, 252, 0.8)',
                padding: '6px 14px 6px 6px',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { if (!showProfileModal) { e.currentTarget.style.background = 'transparent'; } }}
            >
              <div 
                className="nav-avatar-circle"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="nav-profile-text-container" style={{ textAlign: 'left' }}>
                <div className="nav-profile-name" style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                  admin
                </div>
                <div className="nav-profile-role" style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                  admin 1
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showProfileModal ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', marginLeft: '4px', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="nav-login-btn"
            onClick={onLoginClick}
            style={{
              padding: '8px 20px',
              borderRadius: '50px',
              background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(200, 16, 46, 0.3)',
              transition: 'all 0.25s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(200, 16, 46, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(200, 16, 46, 0.3)'; }}
          >
            Masuk / Login
          </button>
        )}
      </div>
    </nav>
  );
}
