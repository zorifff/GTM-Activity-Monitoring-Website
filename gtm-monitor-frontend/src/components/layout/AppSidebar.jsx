import { useLocation } from 'react-router';
import CekPairingNavItem from './CekPairingNavItem';
import ProgramMenu from './ProgramMenu';
import { SHOW_PROGRAM_MENU } from '../../constants/programs';

export default function AppSidebar({
  user,
  isAdmin,
  goDashboard,
  goUpload,
  goAdmin,
  onLoginClick,
  setShowLoginModal,
  dynamicMonthsData,
  setActiveProgramModal,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed = false,
  setIsCollapsed,
  handleLogout
}) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isDashboardActive = currentPath === '/' || currentPath === '/dashboard' || currentPath.startsWith('/branch');
  const isActivityActive = currentPath === '/upload';
  const isControlActive = currentPath === '/admin';

  // Lebar 1024px ke bawah: sidebar berupa panel melayang, jadi tombol ini menutup panelnya
  const handleToggleSidebar = () => {
    if (window.matchMedia('(max-width: 1024px)').matches) {
      if (setIsMobileOpen) setIsMobileOpen(false);
      return;
    }
    if (setIsCollapsed) setIsCollapsed(!isCollapsed);
  };
  const toggleLabel = isMobileOpen || !isCollapsed ? 'Tutup sidebar' : 'Buka sidebar';
  const collapsedTitle = (label) => (isCollapsed ? label : undefined);

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        style={{
          background: '#021329',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          bottom: 0,
          height: '100vh',
          minHeight: '100dvh',
          maxHeight: '100dvh',
          zIndex: 999,
          padding: '0 0 20px',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowY: 'auto'
        }}
      >
        <div className="sidebar-brand-row">
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={handleToggleSidebar}
            aria-label={toggleLabel}
            aria-expanded={isMobileOpen || !isCollapsed}
            title={toggleLabel}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              if (goDashboard) goDashboard();
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className="sidebar-brand-btn"
            style={{
              alignItems: 'center',
              gap: '10px',
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
              textAlign: 'left'
            }}
            title="Beranda GTM Activity Monitoring"
          >
            <img
              src="/telkomsel-symbol.png"
              alt=""
              aria-hidden="true"
              style={{
                height: '32px',
                width: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))'
              }}
            />
            <img
              className="sidebar-brand-word"
              src="/telkomsel-logo.png"
              alt="Telkomsel"
              style={{
                height: '24px',
                width: 'auto',
                filter: 'brightness(0) invert(1)'
              }}
            />
          </button>
        </div>

        <div
          style={{
            padding: '0 24px',
            marginBottom: '10px',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.55)',
            userSelect: 'none'
          }}
        >
          MENU
        </div>

        <nav
          aria-label="Menu Utama"
          className="sidebar-nav-menu"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            width: '100%',
            alignItems: 'stretch'
          }}
        >
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => {
              goDashboard();
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className={`sidebar-nav-item ${isDashboardActive ? 'active' : ''}`}
            aria-label="Dashboard"
            title={collapsedTitle('Dashboard')}
          >
            <span className="sidebar-nav-box">
              <svg
                className="nav-icon-outline"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
              <svg
                className="nav-icon-filled"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
              <span className="sidebar-nav-label">Dashboard</span>
            </span>
          </button>

          {/* 2. Activity */}
          <button
            type="button"
            onClick={() => {
              goUpload();
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className={`sidebar-nav-item ${isActivityActive ? 'active' : ''}`}
            aria-label="Activity"
            title={collapsedTitle('Activity')}
          >
            <span className="sidebar-nav-box">
              <svg
                className="nav-icon-outline"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="3" width="16" height="18" rx="2.5" />
                <line x1="8" y1="8" x2="16" y2="8" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="8" y1="16" x2="13" y2="16" />
              </svg>
              <svg
                className="nav-icon-filled"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6.5 2h11A3.5 3.5 0 0 1 21 5.5v13a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 18.5v-13A3.5 3.5 0 0 1 6.5 2zm1.5 5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 0 0 0 2h5a1 1 0 1 0 0-2H8z" />
              </svg>
              <span className="sidebar-nav-label">Activity</span>
            </span>
          </button>

          <hr className="sidebar-divider" />

          {/* 3. Cek Pairing */}
          <CekPairingNavItem
            user={user}
            setShowLoginModal={setShowLoginModal}
            customButton={({ onClick, isOpen, btnRef }) => (
              <button
                ref={btnRef}
                type="button"
                onClick={() => {
                  onClick();
                  if (setIsMobileOpen) setIsMobileOpen(false);
                }}
                className={`sidebar-nav-item ${isOpen ? 'active' : ''}`}
                aria-label="Cek Pairing"
                title={isCollapsed ? 'Cek Pairing' : 'Pencarian Data Telkomsel One Pairing'}
              >
                <span className="sidebar-nav-box">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <svg
                      className="nav-icon-outline"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <svg
                      className="nav-icon-filled"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span className="sidebar-nav-label">Cek Pairing</span>
                  </span>
                  <svg
                    className="sidebar-nav-chevron"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      opacity: 0.5,
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
            )}
          />

          {/* 4. Program */}
          {SHOW_PROGRAM_MENU && (
            <ProgramMenu
              user={user}
              setShowLoginModal={setShowLoginModal}
              dynamicMonthsData={dynamicMonthsData}
              setActiveProgramModal={setActiveProgramModal}
              customButton={({ onClick, isOpen, btnRef }) => (
                <button
                  ref={btnRef}
                  type="button"
                  onClick={() => {
                    onClick();
                    if (setIsMobileOpen) setIsMobileOpen(false);
                  }}
                  className={`sidebar-nav-item ${isOpen ? 'active' : ''}`}
                  aria-label="Program"
                  title={isCollapsed ? 'Program' : 'Daftar Program Marketing & Penjualan'}
                >
                  <span className="sidebar-nav-box">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <svg
                        className="nav-icon-outline"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2.5" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <svg
                        className="nav-icon-filled"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                      </svg>
                      <span className="sidebar-nav-label">Program</span>
                    </span>
                    <svg
                      className="sidebar-nav-chevron"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        opacity: 0.5,
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </button>
              )}
            />
          )}

          {/* 5. Admin Panel */}
          {isAdmin && <hr className="sidebar-divider" />}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                goAdmin();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              className={`sidebar-nav-item ${isControlActive ? 'active' : ''}`}
              aria-label="Admin"
              title={collapsedTitle('Admin')}
            >
              <span className="sidebar-nav-box">
                <svg
                  className="nav-icon-outline"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <svg
                  className="nav-icon-filled"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21c0 .5.4.9.9.9h17.4c.5 0 .9-.4.9-.9v-1.8c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
                <span className="sidebar-nav-label">Admin</span>
              </span>
            </button>
          )}
        </nav>

        {user ? (
          <div
            className="sidebar-bottom-actions"
            style={{
              marginTop: 'auto',
              padding: '16px 14px max(24px, env(safe-area-inset-bottom)) 14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (handleLogout) handleLogout();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              className="sidebar-logout-btn"
              aria-label="Logout"
              title="Keluar dari akun (Logout)"
              style={{
                width: '100%',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
                transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.16)';
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#800000"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
                <polyline points="8 16 4 12 8 8" />
                <line x1="4" y1="12" x2="14" y2="12" />
              </svg>
              <span
                className="sidebar-logout-label"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13.5px',
                  color: '#0F172A',
                  letterSpacing: '-0.1px',
                  whiteSpace: 'nowrap'
                }}
              >
                Logout
              </span>
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 'auto', padding: '16px 20px 0' }}>
            <button
              type="button"
              onClick={onLoginClick}
              className="sidebar-login-btn"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#FFFFFF',
                color: '#021329',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)'
              }}
            >
              Masuk Akun
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
