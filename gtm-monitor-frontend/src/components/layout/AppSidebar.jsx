import { useLocation } from 'react-router';

// ─── PERSISTENT TELKOMSEL RED SIDEBAR (#C8102E) ───
export default function AppSidebar({
  user,
  isAdmin,
  goDashboard,
  goUpload,
  goAdmin,
  onLoginClick,
  isMobileOpen,
  setIsMobileOpen
}) {
  const location = useLocation();
  const currentPath = location.pathname;

  // Active check helper
  const isDashboardActive = currentPath === '/' || currentPath === '/dashboard' || currentPath.startsWith('/branch');
  const isActivityActive = currentPath === '/upload';
  const isControlActive = currentPath === '/admin';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(200, 16, 46, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: '256px',
          background: '#C8102E', // Solid Telkomsel Red (Pantone 186 C)
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: user ? 'flex-start' : 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          bottom: 0,
          height: '100%',
          minHeight: '100%',
          maxHeight: '100%',
          zIndex: 999,
          padding: '20px 16px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        {/* Navigation Menu Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* 1. Dashboard / Monitoring */}
            <button
              type="button"
              onClick={() => {
                goDashboard();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              className={`sidebar-nav-item ${isDashboardActive ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <span className="sidebar-nav-label">Dashboard / Monitoring</span>
            </button>

            {/* 2. Activity (Pelaporan Lapangan) */}
            <button
              type="button"
              onClick={() => {
                goUpload();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              className={`sidebar-nav-item ${isActivityActive ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="sidebar-nav-label">Activity</span>
            </button>

            {/* 3. Control (Admin Panel) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  goAdmin();
                  if (setIsMobileOpen) setIsMobileOpen(false);
                }}
                className={`sidebar-nav-item ${isControlActive ? 'active' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="sidebar-nav-label">Control (Admin)</span>
              </button>
            )}
          </nav>

        {/* Bottom Sidebar: Clean Action if not logged in */}
        {!user && (
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onLoginClick}
              className="sidebar-login-btn"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#FFFFFF',
                color: '#C8102E',
                fontSize: '13px',
                fontWeight: 700,
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
