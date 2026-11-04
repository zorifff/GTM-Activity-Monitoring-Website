# Bundle 4: Layout Shell, Komponen Dashboard, Tabel Virtualisasi, & Kartu Admin

> Berisi layout arsitektur (Sidebar, TopHeaderBar, ProfileMenu), tabel data virtualisasi performa tinggi (ProjectTable), komponen status kegiatan, widget visualisasi dashboard, dan kartu operasional admin.

**Daftar Berkas Terlampir (31 berkas):**

- `gtm-monitor-frontend/src/routes/AppLayout.jsx` (271 baris)
- `gtm-monitor-frontend/src/components/layout/TopHeaderBar.jsx` (542 baris)
- `gtm-monitor-frontend/src/components/layout/AppSidebar.jsx` (495 baris)
- `gtm-monitor-frontend/src/components/layout/ProfileMenu.jsx` (68 baris)
- `gtm-monitor-frontend/src/components/layout/ProgramMenu.jsx` (367 baris)
- `gtm-monitor-frontend/src/components/layout/CekPairingNavItem.jsx` (132 baris)
- `gtm-monitor-frontend/src/components/layout/LoadingScreen.jsx` (202 baris)
- `gtm-monitor-frontend/src/components/ProjectTable.jsx` (1010 baris)
- `gtm-monitor-frontend/src/components/ActivityStatus.jsx` (220 baris)
- `gtm-monitor-frontend/src/components/dashboard/HeroOccupancyCard.jsx` (132 baris)
- `gtm-monitor-frontend/src/components/dashboard/RegionalMetricsSummaryCard.jsx` (251 baris)
- `gtm-monitor-frontend/src/components/dashboard/KpiCards.jsx` (245 baris)
- `gtm-monitor-frontend/src/components/dashboard/PortDistributionChartCard.jsx` (502 baris)
- `gtm-monitor-frontend/src/components/dashboard/OdpStatusDonutCard.jsx` (344 baris)
- `gtm-monitor-frontend/src/components/dashboard/BranchRankingCard.jsx` (360 baris)
- `gtm-monitor-frontend/src/components/dashboard/ExecutiveSummarySection.jsx` (514 baris)
- `gtm-monitor-frontend/src/components/dashboard/ExecutiveSummaryCard.jsx` (360 baris)
- `gtm-monitor-frontend/src/components/dashboard/GtmExecutionInsightCard.jsx` (131 baris)
- `gtm-monitor-frontend/src/components/dashboard/BranchProjectsPieCard.jsx` (311 baris)
- `gtm-monitor-frontend/src/components/dashboard/SearchFilterToolbar.jsx` (142 baris)
- `gtm-monitor-frontend/src/components/dashboard/RightWidgetPanel.jsx` (189 baris)
- `gtm-monitor-frontend/src/components/dashboard/DashboardHeader.jsx` (126 baris)
- `gtm-monitor-frontend/src/components/admin/AdminHeader.jsx` (13 baris)
- `gtm-monitor-frontend/src/components/admin/AdminTabs.jsx` (34 baris)
- `gtm-monitor-frontend/src/components/admin/AdminKpiGrid.jsx` (296 baris)
- `gtm-monitor-frontend/src/components/admin/AdminActionHubCard.jsx` (351 baris)
- `gtm-monitor-frontend/src/components/admin/MonitoringTab.jsx` (179 baris)
- `gtm-monitor-frontend/src/components/admin/OdpImportCard.jsx` (224 baris)
- `gtm-monitor-frontend/src/components/admin/PairingImportCard.jsx` (229 baris)
- `gtm-monitor-frontend/src/components/admin/ProgramUploadCard.jsx` (360 baris)
- `gtm-monitor-frontend/src/components/admin/ProgramDeleteCard.jsx` (173 baris)

**Total Baris Kode**: 8.641 baris

---

## File: `gtm-monitor-frontend/src/routes/AppLayout.jsx` (271 baris)

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import LoginModal from '../components/Auth/LoginModal';
import ProgramViewerModal from '../components/ProgramViewerModal';
import LoadingScreen from '../components/layout/LoadingScreen';
import AppSidebar from '../components/layout/AppSidebar';
import TopHeaderBar from '../components/layout/TopHeaderBar';

const SIDEBAR_COLLAPSED_KEY = 'gtm:sidebar-collapsed';
import ProfileMenu from '../components/layout/ProfileMenu';
import LogoutConfirmModal from '../components/layout/LogoutConfirmModal';
import SessionExpiredModal from '../components/layout/SessionExpiredModal';
import { useAuth } from '../auth/AuthContext';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { useProgramMonths, useInvalidatePrograms } from '../hooks/usePrograms';
import { useAppNotifications } from '../hooks/useAppNotifications';
import { PATHS, viewFromPath, LEGACY_HASH_PATHS } from './paths';

export default function AppLayout() {
  const { user, isAdmin, authChecked, login, logout, sessionExpiredNotice, setSessionExpiredNotice, lastLoginTimestamp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const view = viewFromPath(location.pathname);

  const { branches, importMeta, isInitialLoading, refresh } = useMonitoringData();
  const dynamicMonthsData = useProgramMonths();
  const invalidatePrograms = useInvalidatePrograms();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [activeProgramModal, setActiveProgramModal] = useState(null);
  const [typeDesignFilter, setTypeDesignFilter] = useState('ALL');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isSidebarCollapsed ? '1' : '0');
    } catch {
      // Penyimpanan browser diblokir: pilihan hanya berlaku sampai halaman dimuat ulang
    }
  }, [isSidebarCollapsed]);

  const contentAreaRef = useRef(null);
  const activeSection = view === 'upload' ? 'activity' : 'dashboard';

  useEffect(() => {
    setShowProfileModal(false);
    setShowLogoutConfirmModal(false);
  }, [user]);

  useEffect(() => {
    const target = LEGACY_HASH_PATHS[location.hash.toLowerCase()];
    if (target) navigate(`${target}${location.search}`, { replace: true });
  }, [location.hash, location.search, navigate]);

  // Wadah gulir dipakai bersama semua halaman: halaman baru selalu dibuka dari paling atas
  useEffect(() => {
    if (contentAreaRef.current) contentAreaRef.current.scrollTo({ top: 0, behavior: 'instant' });
  }, [view]);

  const handleLogout = (showAlert = true) => {
    if (typeof showAlert !== 'boolean') showAlert = true;
    // Mencegah munculnya pop-up konfirmasi logout akibat retargeting event Enter/fokus otomatis dalam 1 detik setelah login
    if (showAlert && Date.now() - lastLoginTimestamp.current < 1000) {
      return;
    }
    if (showAlert) {
      setShowLogoutConfirmModal(true);
      return;
    }
    logout();
  };

  const goDashboard = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (view === 'dashboard') {
      if (contentAreaRef.current) contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(PATHS.dashboard);
    }
  }, [user, view, navigate]);

  const goUpload = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (view === 'upload') {
      if (contentAreaRef.current) contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(PATHS.upload);
    }
  }, [user, view, navigate]);

  const goAdmin = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!isAdmin) {
      alert('Akses ditolak. Hanya Administrator yang dapat membuka Admin Panel.');
      return;
    }
    navigate(PATHS.admin);
  }, [user, isAdmin, navigate]);

  const { notifications, count: notificationCount } = useAppNotifications(branches, user, isAdmin);

  const handleSelectProjectNotification = useCallback((item) => {
    if (!item?.projectName) return;

    navigate(`${PATHS.upload}?project=${encodeURIComponent(item.projectName)}`);

    // Saat Activity sudah terbuka, UploadView menerima event ini. Saat baru dibuka, ia membaca ?project= dari URL
    window.dispatchEvent(new CustomEvent('gtm-focus-project', {
      detail: {
        projectName: item.projectName,
        branchName: item.branchName
      }
    }));
  }, [view, navigate]);

  const isGlobalLoading = !authChecked || isInitialLoading;

  const renderLoginModal = () => {
    if (!showLoginModal) return null;
    return (
      <LoginModal
        isOpen={showLoginModal}
        onLoginSuccess={(loggedInUser, expiresAt) => {
          login(loggedInUser, expiresAt);
          setShowLoginModal(false);
        }}
        onClose={() => setShowLoginModal(false)}
      />
    );
  };

  const isFullPage = view === 'landing' || view === 'login' || view === null;

  return (
    <div className={`saas-app-root ${isFullPage ? 'app-root-fullpage' : 'app-root-saas'}`}>
      <LoadingScreen isVisible={isGlobalLoading} />
      {authChecked && (
        <>
          {renderLoginModal()}
          {activeProgramModal && (
            <ProgramViewerModal
              program={activeProgramModal.program}
              monthLabel={activeProgramModal.monthLabel}
              onClose={() => setActiveProgramModal(null)}
              isAdmin={!!(user && (user.role === 'ADMIN' || user.username === 'admin'))}
              onDeleteSuccess={() => {
                invalidatePrograms();
                setActiveProgramModal(null);
              }}
            />
          )}

          {isFullPage ? (
            <div className="main-content-full">
              <Outlet context={{ branches, importMeta, typeDesignFilter, setTypeDesignFilter, refreshMonitoring: refresh, invalidatePrograms }} />
            </div>
          ) : (
            <div
              className="saas-shell"
              style={{
                display: 'flex',
                flexDirection: 'row',
                height: '100vh',
                minHeight: '100dvh',
                maxHeight: '100dvh',
                width: '100%',
                background: '#FFFFFF',
                overflow: 'hidden'
              }}
            >
              <AppSidebar
                user={user}
                isAdmin={isAdmin}
                activeSection={activeSection}
                goDashboard={goDashboard}
                goUpload={goUpload}
                goAdmin={goAdmin}
                onLoginClick={() => navigate(PATHS.login)}
                setShowLoginModal={setShowLoginModal}
                dynamicMonthsData={dynamicMonthsData}
                setActiveProgramModal={setActiveProgramModal}
                isMobileOpen={isMobileSidebarOpen}
                setIsMobileOpen={setIsMobileSidebarOpen}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                handleLogout={handleLogout}
              />

              <div
                ref={contentAreaRef}
                className="saas-content-area"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#FFFFFF',
                  overflowY: 'auto',
                  scrollPaddingTop: '80px',
                  scrollBehavior: 'smooth'
                }}
              >
                <TopHeaderBar
                  user={user}
                  isAdmin={isAdmin}
                  activeSection={activeSection}
                  onLoginClick={() => navigate(PATHS.login)}
                  onLogoutClick={() => handleLogout(true)}
                  goDashboard={goDashboard}
                  goUpload={goUpload}
                  pendingCount={notificationCount}
                  notifications={notifications}
                  notificationCount={notificationCount}
                  onSelectNotification={handleSelectProjectNotification}
                  onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                  typeDesignFilter={typeDesignFilter}
                  setTypeDesignFilter={setTypeDesignFilter}
                />

                <main
                  className="saas-main-viewport"
                  style={{
                    flex: 1,
                    padding: '24px 32px 48px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div className="fade-in" key={view}>
                    <Outlet context={{ branches, importMeta, typeDesignFilter, setTypeDesignFilter, refreshMonitoring: refresh, invalidatePrograms }} />
                  </div>
                </main>
              </div>
            </div>
          )}

          {showProfileModal && (
            <ProfileMenu user={user} isAdmin={isAdmin} setShowProfileModal={setShowProfileModal} handleLogout={handleLogout} />
          )}

          {showLogoutConfirmModal && (
            <LogoutConfirmModal setShowLogoutConfirmModal={setShowLogoutConfirmModal} executeLogout={logout} />
          )}

          {sessionExpiredNotice && (
            <SessionExpiredModal sessionExpiredNotice={sessionExpiredNotice} setSessionExpiredNotice={setSessionExpiredNotice} />
          )}
        </>
      )}
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/layout/TopHeaderBar.jsx` (542 baris)

```javascript
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { formatBranch } from '../../utils';

const formatNotificationDate = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const dateStr = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr}, ${hours}:${minutes}`;
};

export default function TopHeaderBar({
  user,
  isAdmin,
  activeSection = 'dashboard',
  onLoginClick,
  _onLogoutClick,
  pendingCount = 0,
  notifications = [],
  notificationCount = 0,
  onSelectNotification,
  onToggleMobileSidebar,
  typeDesignFilter = 'ALL',
  setTypeDesignFilter
}) {
  const displayCount = notificationCount || (notifications && notifications.length) || pendingCount || 0;
  const location = useLocation();
  const isBranchPage = location.pathname.startsWith('/branch');
  const isDashboard = location.pathname === '/' || location.pathname.startsWith('/dashboard');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isActivityPage = location.pathname.startsWith('/upload');
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationDropdown(false);
      }

    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header
      className="top-header-bar"
      style={{
        height: '64px',
        minHeight: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
      }}
    >
      <div
        className="header-left-zone"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '64px',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="mobile-hamburger-btn"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            padding: '8px',
            minWidth: '44px',
            minHeight: '44px',
            cursor: 'pointer',
            color: '#1E293B',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Buka Navigasi Mobile"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Penanda Halaman Admin */}
        {isAdminPage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '18px',
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.3px',
                lineHeight: 1
              }}
            >
              Admin
            </h1>
          </div>
        )}

        {/* Judul Halaman Continuous (Dashboard / Activity) dengan Ikon Persis seperti Opsi Sidebar */}
        {(isDashboard || isBranchPage || isActivityPage) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            {activeSection === 'activity' ? (
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block', flexShrink: 0 }}
                aria-hidden="true"
              >
                <rect x="4" y="3" width="16" height="18" rx="2.5" />
                <line x1="8" y1="8" x2="16" y2="8" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="8" y1="16" x2="13" y2="16" />
              </svg>
            ) : (
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block', flexShrink: 0 }}
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
            )}

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '18px',
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.3px',
                lineHeight: 1
              }}
            >
              {activeSection === 'activity' ? 'Activity' : 'Dashboard'}
            </h1>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
        {/* Filter Segmented Control Tipe Proyek di Top Bar (Dipertahankan di kedua section) */}
        {isDashboard && setTypeDesignFilter && (
          <div
            role="radiogroup"
            aria-label="Filter Tipe Proyek"
            className="header-segmented-filter"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
            }}
          >
            {[
              { id: 'ALL', label: 'Semua Tipe' },
              { id: 'Greenfield', label: 'Greenfield' },
              { id: 'Brownfield', label: 'Brownfield' }
            ].map((f) => {
              const isActive = typeDesignFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setTypeDesignFilter(f.id)}
                  style={{
                    height: '30px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {isDashboard && setTypeDesignFilter && (
          <div
            style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#E2E8F0'
            }}
          />
        )}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            title={displayCount > 0 ? `${displayCount} pemberitahuan baru` : 'Tidak ada pemberitahuan baru'}
            aria-label={displayCount > 0 ? `${displayCount} pemberitahuan baru` : 'Notifikasi aktivitas'}
            aria-expanded={showNotificationDropdown}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '10px',
              background: showNotificationDropdown ? '#F1F5F9' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              if (!showNotificationDropdown) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {displayCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  color: '#0F172A',
                  fontSize: '11px',
                  lineHeight: 1,
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              >
                {displayCount}
              </span>
            )}
          </button>

          {showNotificationDropdown && (
            <div
              className="header-notification-dropdown"
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '390px',
                maxWidth: 'calc(100vw - 24px)',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
                padding: '16px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease-out',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  marginBottom: '12px',
                  borderBottom: '1px solid #F1F5F9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13.5px', color: '#0F172A', letterSpacing: '-0.2px' }}>
                    {isAdmin ? 'Pemberitahuan Upload' : 'Pemberitahuan Disetujui'}
                  </span>
                  {displayCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#475569',
                        backgroundColor: '#F1F5F9',
                        padding: '1px 7px',
                        borderRadius: '6px'
                      }}
                    >
                      {displayCount}
                    </span>
                  )}
                </div>
              </div>

              {notifications && notifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto', paddingRight: '2px' }}>
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        if (onSelectNotification) onSelectNotification(item);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setShowNotificationDropdown(false);
                          if (onSelectNotification) onSelectNotification(item);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        background: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#94A3B8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      {/* Baris 1: Nama Kegiatan & Waktu Unggah */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#0F172A' }}>
                          {item.actLabel}
                        </span>
                        {item.timestamp && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#64748B',
                              fontVariantNumeric: 'tabular-nums',
                              flexShrink: 0
                            }}
                          >
                            {formatNotificationDate(item.timestamp)}
                          </span>
                        )}
                      </div>

                      {/* Baris 2: Informasi Proyek */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>
                          {isAdmin ? 'Aktivitas diunggah di proyek:' : 'Kegiatan disetujui di proyek:'}
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#0F172A', wordBreak: 'break-word', lineHeight: 1.35 }}>
                          {item.projectName}
                        </div>
                      </div>

                      {/* Baris 3: Lokasi Branch & Navigasi */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid #F1F5F9',
                          fontSize: '11.5px'
                        }}
                      >
                        <span style={{ color: '#64748B' }}>
                          Branch {formatBranch(item.branchName)}{item.wok ? ` · ${item.wok}` : ''}
                        </span>
                        <span style={{ color: '#0F172A', }}>
                          Buka di Activity →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 8px', color: '#64748B', fontSize: '12.5px' }}>
                  Tidak ada pemberitahuan baru
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          {user ? (
            <div
              className="header-profile-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minHeight: '44px',
                padding: '6px 10px 6px 6px',
                borderRadius: '12px',
                userSelect: 'none',
                cursor: 'default',
                background: 'transparent',
                border: 'none',
                outline: 'none'
              }}
            >
              <div
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
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div className="header-profile-text" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '12.5px', color: '#0F172A', whiteSpace: 'nowrap' }}>
                  {user.username || 'admin'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569' }}>
                  {user.role === 'ADMIN' ? 'admin 1' : 'user'}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              style={{
                minHeight: '44px',
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#800000',
                color: '#FFFFFF',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#660000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#800000';
              }}
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/layout/AppSidebar.jsx` (495 baris)

```javascript
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
  const toggleLabel = isCollapsed ? 'Buka sidebar' : 'Tutup sidebar';
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
          <div
            className="sidebar-brand-btn"
            aria-hidden="true"
          >
            <img
              src="/telkomsel-symbol.png"
              alt=""
              aria-hidden="true"
              style={{
                height: '32px',
                width: 'auto',
                display: 'block',
                flexShrink: 0,
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
                flexShrink: 0,
                filter: 'brightness(0) invert(1)'
              }}
            />
          </div>
        </div>

        <div className="sidebar-menu-header">
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
              <span className="sidebar-nav-icon-wrap">
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
              </span>
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
              <span className="sidebar-nav-icon-wrap">
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
              </span>
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
                  <span className="sidebar-nav-icon-wrap">
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
                  </span>
                  <span className="sidebar-nav-label">Cek Pairing</span>
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
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s ease'
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
                    <span className="sidebar-nav-icon-wrap">
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
                    </span>
                    <span className="sidebar-nav-label">Program</span>
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
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease'
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
                <span className="sidebar-nav-icon-wrap">
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
                </span>
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
            >
              <span className="sidebar-logout-icon-wrap">
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
              </span>
              <span className="sidebar-logout-label">Logout</span>
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
```

---

## File: `gtm-monitor-frontend/src/components/layout/ProfileMenu.jsx` (68 baris)

```javascript
import { formatBranch } from '../../utils';

// User Profile Flyout Dropdown
export default function ProfileMenu({ user, isAdmin, setShowProfileModal, handleLogout }) {
  return (
    <>
      {/* Transparent Backdrop Overlay to close on outside click */}
      <div 
        onClick={() => setShowProfileModal(false)} 
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
      />

      <div className="profile-dropdown-card">
        {/* Header info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 14px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="profile-avatar-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <div style={{ overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.fullName || user.username}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>
              @{user.username}
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div style={{ padding: '12px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Branch</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {isAdmin ? 'Semua Branch' : formatBranch(user.branchName)}
            </span>
          </div>
        </div>

        {/* Action Items List */}
        <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Log Out Item with Red Door Icon */}
          <button
            type="button"
            onClick={() => {
              setShowProfileModal(false);
              handleLogout(true);
            }}
            className="profile-menu-item logout"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/layout/ProgramMenu.jsx` (367 baris)

```javascript
import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { SESSION_1_MONTHS, SESSION_2_MONTHS, PROGRAM_PLACEHOLDERS } from '../../constants/programs';

// Menu PROGRAM di navigasi: dropdown periode (level 1) + daftar program per bulan (level 2)
export default function ProgramMenu({ user, setShowLoginModal, dynamicMonthsData, setActiveProgramModal, customButton }) {
  const programTabRef = useRef(null);
  const programMenuRef = useRef(null);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [activeHoverMonth, setActiveHoverMonth] = useState('Agustus 2026');
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });

  const updateDropdownCoords = useCallback(() => {
    if (programTabRef.current) {
      const rect = programTabRef.current.getBoundingClientRect();
      if (rect.left < 280) {
        setDropdownCoords({
          top: Math.min(rect.top, window.innerHeight - 380),
          left: rect.right + 115
        });
        return;
      }
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
    <div ref={programMenuRef} style={{ position: 'relative', width: '100%' }}>
      {customButton ? (
        customButton({
          onClick: () => {
            if (!user) {
              setShowLoginModal(true);
              return;
            }
            if (!isProgramDropdownOpen) updateDropdownCoords();
            setIsProgramDropdownOpen(!isProgramDropdownOpen);
          },
          isOpen: isProgramDropdownOpen,
          btnRef: programTabRef
        })
      ) : (
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
          color: isProgramDropdownOpen ? '#0F172A' : '#64748B',
          fontFamily: 'var(--font-heading)',
          fontSize: '12px',
          letterSpacing: '0.8px',
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
      )}

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
            animation: 'programDropdownFadeIn 0.15s ease-out',
            fontFamily: 'var(--font-body)',
            color: '#334155'
          }}
        >
          {(() => {
            const nowMonthIdx = new Date().getMonth();
            const isSession2 = nowMonthIdx >= 6;
            const activeMonths = isSession2 ? SESSION_2_MONTHS : SESSION_1_MONTHS;

            return (
              <>
                <div style={{ padding: '8px 16px 6px 16px', fontFamily: 'var(--font-heading)', fontSize: '11px', color: '#64748B', letterSpacing: '0.4px', borderBottom: '1px solid #F1F5F9' }}>
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
                        fontFamily: 'var(--font-body)',
                        fontSize: '12.5px',
                        letterSpacing: '-0.1px',
                        color: !hasPrograms ? '#94A3B8' : (isHovered ? '#0F172A' : isCurrent ? '#0F172A' : '#334155'),
                        background: isHovered && hasPrograms ? '#F1F5F9' : 'transparent',
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isHovered ? '#0F172A' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isHovered ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10.5px', color: '#CBD5E1', }}>Belum ada</span>
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
                                animation: 'fadeIn 0.2s ease-in-out',
                                fontFamily: 'var(--font-body)'
                              }}
                            >
                              <div style={{ padding: '8px 16px 6px 16px', fontFamily: 'var(--font-heading)', fontSize: '11px', color: '#64748B', letterSpacing: '0.4px', borderBottom: '1px solid #F1F5F9' }}>
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
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '12.5px',
                                    letterSpacing: '-0.1px',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#800000';
                                    e.currentTarget.style.background = 'rgba(128, 0, 0, 0.05)';
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
                                        fontFamily: 'var(--font-body)',
                                        fontSize: '10px',
                                        color: '#475569',
                                        background: '#F1F5F9',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        border: '1px solid #CBD5E1'
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
                                borderLeft: '3px solid #0F172A',
                                boxSizing: 'border-box',
                                fontFamily: 'var(--font-body)'
                              }}
                            >
                              <div style={{ padding: '6px 12px 4px 12px', fontFamily: 'var(--font-heading)', fontSize: '10.5px', color: '#0F172A', letterSpacing: '0.4px' }}>
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
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '12px',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ color: '#0F172A', flexShrink: 0 }}>•</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progItem.name}</span>
                                  </div>
                                  {progItem.data?.images?.length > 1 && (
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        fontFamily: 'var(--font-body)',
                                        fontSize: '9.5px',
                                        color: '#475569',
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
```

---

## File: `gtm-monitor-frontend/src/components/layout/CekPairingNavItem.jsx` (132 baris)

```javascript
import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import CekPairingPopover from '../CekPairingPopover';

// Menu CEK PAIRING di navigasi (TopNav / Sidebar) + popover pencarian
export default function CekPairingNavItem({ user, setShowLoginModal, customButton }) {
  const cekPairingTabRef = useRef(null);
  // Tsel One Pairing Popover States
  const [isPairingDropdownOpen, setIsPairingDropdownOpen] = useState(false);
  const [pairingCoords, setPairingCoords] = useState({ top: 0, left: 0 });

  const updatePairingCoords = useCallback(() => {
    if (cekPairingTabRef.current) {
      const rect = cekPairingTabRef.current.getBoundingClientRect();
      if (rect.left < 280) {
        setPairingCoords({
          top: Math.min(Math.max(rect.top, 16), window.innerHeight - 440),
          left: Math.min(rect.right + 200, window.innerWidth - 200)
        });
        return;
      }
      const popoverWidth = Math.min(380, window.innerWidth - 24);
      let targetLeft = rect.left + rect.width / 2;
      const margin = 12;
      if (targetLeft - popoverWidth / 2 < margin) {
        targetLeft = popoverWidth / 2 + margin;
      } else if (targetLeft + popoverWidth / 2 > window.innerWidth - margin) {
        targetLeft = window.innerWidth - popoverWidth / 2 - margin;
      }
      setPairingCoords({
        top: rect.bottom + 8,
        left: targetLeft
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isPairingDropdownOpen) {
      updatePairingCoords();
      window.addEventListener('resize', updatePairingCoords);
      window.addEventListener('scroll', updatePairingCoords);
      return () => {
        window.removeEventListener('resize', updatePairingCoords);
        window.removeEventListener('scroll', updatePairingCoords);
      };
    }
  }, [isPairingDropdownOpen, updatePairingCoords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        cekPairingTabRef.current && !cekPairingTabRef.current.contains(e.target) &&
        !e.target.closest('.pairing-fixed-dropdown') &&
        !e.target.closest('.pairing-transposed-modal')
      ) {
        setIsPairingDropdownOpen(false);
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
    <div ref={cekPairingTabRef} style={{ position: 'relative', width: '100%' }}>
      {customButton ? (
        customButton({
          onClick: () => {
            if (!user) {
              if (setShowLoginModal) setShowLoginModal(true);
              return;
            }
            if (!isPairingDropdownOpen) updatePairingCoords();
            setIsPairingDropdownOpen(!isPairingDropdownOpen);
          },
          isOpen: isPairingDropdownOpen,
          btnRef: cekPairingTabRef
        })
      ) : (
        <button
          type="button"
          className="nav-tab-btn"
          onClick={() => {
            if (!user) {
              if (setShowLoginModal) setShowLoginModal(true);
              return;
            }
            if (!isPairingDropdownOpen && cekPairingTabRef.current) {
              const rect = cekPairingTabRef.current.getBoundingClientRect();
              setPairingCoords({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2
              });
            }
            setIsPairingDropdownOpen(!isPairingDropdownOpen);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: isPairingDropdownOpen ? '#0F172A' : '#64748B',
            fontSize: '12px',
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
          onMouseEnter={(e) => { if (!isPairingDropdownOpen) e.currentTarget.style.color = '#0F172A'; }}
          onMouseLeave={(e) => { if (!isPairingDropdownOpen) e.currentTarget.style.color = '#64748B'; }}
        >
          <span>CEK PAIRING</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isPairingDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <CekPairingPopover
        isOpen={isPairingDropdownOpen}
        coords={pairingCoords}
        onClose={() => setIsPairingDropdownOpen(false)}
      />
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/layout/LoadingScreen.jsx` (202 baris)

```javascript
import { memo, useEffect, useState } from 'react';

const LoadingScreen = memo(function LoadingScreen({ isVisible = true }) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsFadingOut(false);
    } else {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat sistem monitoring"
      className="transition-loading-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#021329',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
        fontWeight: 400,
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Directional Deep Navy Spotlight Backdrop */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 46%, rgba(14, 57, 115, 0.32) 0%, rgba(3, 20, 44, 0.18) 45%, rgba(2, 19, 41, 0) 75%)',
          pointerEvents: 'none'
        }}
      />

      {/* Decorative Corner Grid Crosshairs (Echoing Networking Precision) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '32px',
          left: '36px',
          color: 'rgba(125, 211, 252, 0.35)',
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase'
        }}
      >
        TELKOMSEL TELEMETRY
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '28px',
          right: '36px',
          color: 'rgba(148, 163, 184, 0.45)',
          fontSize: '11px',
          letterSpacing: '0.12em'
        }}
      >
        REGIONAL JATENG &amp; DIY
      </div>

      {/* Center Composition */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px'
        }}
      >
        {/* Telkomsel 'T' Symbol with Breathing Optical Telemetry Halo */}
        <div
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '26px'
          }}
        >
          {/* Outer Breathing Halo */}
          <div
            className="transition-loading-aura"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-12px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(225, 29, 72, 0.28) 0%, rgba(56, 189, 248, 0.16) 48%, transparent 72%)',
              animation: 'telkomselAuraPulse 2.4s ease-in-out infinite',
              pointerEvents: 'none'
            }}
          />

          {/* Telkomsel 'T' Symbol Image */}
          <img
            src="/telkomsel-symbol.png"
            alt="Telkomsel"
            style={{
              width: '46px',
              height: 'auto',
              display: 'block',
              filter:
                'drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 4px 14px rgba(225, 29, 72, 0.35))',
              position: 'relative',
              zIndex: 2
            }}
          />
        </div>

        {/* Primary Status Title */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: '#FFFFFF',
            letterSpacing: '-0.2px',
            marginBottom: '8px'
          }}
        >
          Sinkronisasi Sistem Monitoring
        </div>

        {/* Secondary Subtitle */}
        <div
          style={{
            fontSize: '12.5px',
            fontWeight: 400,
            color: 'rgba(203, 213, 225, 0.72)',
            lineHeight: 1.5,
            marginBottom: '24px'
          }}
        >
          Menyiapkan telemetri ODP Regional Jateng &amp; DIY...
        </div>

        {/* Telemetry Precision Hairline Scanning Bar */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            width: '210px',
            height: '2.5px',
            borderRadius: '99px',
            backgroundColor: 'rgba(125, 211, 252, 0.15)',
            overflow: 'hidden'
          }}
        >
          <div
            className="transition-loading-beam"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '80px',
              borderRadius: '99px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.8) 40%, #FFFFFF 65%, rgba(225, 29, 72, 0.9) 100%)',
              animation: 'telemetryScanningBeam 1.8s ease-in-out infinite'
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default LoadingScreen;
```

---

## File: `gtm-monitor-frontend/src/components/ProjectTable.jsx` (1010 baris)

```javascript
import { useState, useMemo, memo, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ACT_TYPES, formatBranch } from '../utils';
import ActivityStatus from './ActivityStatus';
import UploadModal from './UploadModal';
import ConfirmSubmitModal from './ConfirmSubmitModal';
import TableScrollSlider from './TableScrollSlider';

// Pilihan "Semua proyek" pada jumlah per halaman: seluruh baris ditampilkan dengan virtual scroll
// (hanya baris yang terlihat di layar yang dirender) agar ribuan proyek tetap ringan.
const PAGE_SIZE_ALL = 'all';
const PAGE_SIZE_OPTIONS = [15, 25, 50, PAGE_SIZE_ALL];
const ESTIMATED_ROW_HEIGHT = 64;

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const SortIcon = ({ sort }) => {
  if (sort === 'asc') {
    return (
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="18 15 12 9 6 15" />
      </svg>
    );
  }
  if (sort === 'desc') {
    return (
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
      <polyline points="8 9 12 5 16 9" />
      <polyline points="16 15 12 19 8 15" />
    </svg>
  );
};

// ─── OPTIMASI 3: ON-DEMAND LOADING & MEMOIZED ODP ROW ───
const OdpRow = memo(({ o, odpGrid }) => {
  const occRate = o.total > 0 ? Math.round((o.used / o.total) * 100) : 0;
  const badgeBg = '#F1F5F9';
  const badgeColor = '#0F172A';

  return (
    <div
      className="table-row"
      style={{ gridTemplateColumns: odpGrid, backgroundColor: '#fafbfc', borderTop: '1px solid #f8fafc', minHeight: '44px', minWidth: 'max-content', width: 'max-content', boxSizing: 'border-box' }}
    >
      <div></div>
      <div style={{ fontSize: '13px', paddingLeft: '14px', textAlign: 'left' }}>{o.odp}</div>

      <div style={{
        fontSize: '11.5px', padding: '3px 9px', borderRadius: '6px',
        display: 'inline-block',
        backgroundColor: badgeBg,
        color: badgeColor,
        textAlign: 'center'
      }}>
        {o.total > 0 ? `${occRate}%` : '-'}
      </div>

      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.used || 0).toLocaleString('id-ID')}</div>
      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.avai || 0).toLocaleString('id-ID')}</div>
      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.total || 0).toLocaleString('id-ID')}</div>
    </div>
  );
});

// ─── OPTIMASI 2: REACT RENDER OPTIMIZATION (MEMOIZED PROJECT ROW) ───
const ProjectRow = memo(({ p, branchName, isExpanded, toggleProject, onReview, onOpenUploadModal, tableGrid, odpGrid, isEven = false }) => {
  const pOdps = p.odps || [];
  const usedTotal = p.usedTotal;
  const avaiTotal = p.avaiTotal;
  const totalPort = p.totalPort;
  const bName = p.branchName || branchName;
  const projectActivities = p.activities || [];

  return (
    <div>
      {/* Project row with activity status & action buttons */}
      <div
        className={`table-row ${isEven ? 'table-row-even' : ''}`}
        style={{ gridTemplateColumns: tableGrid, minWidth: 'max-content', width: 'max-content', boxSizing: 'border-box' }}
      >
        <button
          type="button"
          aria-label={isExpanded ? `Ciutkan detail proyek ${p.name}` : `Perluas detail proyek ${p.name}`}
          aria-expanded={isExpanded}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', background: 'transparent', border: 'none', padding: 0 }}
          onClick={() => toggleProject(p.name)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Toggle detail proyek ${p.name}`}
          style={{
            fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left',
            color: '#0F172A', display: 'block', width: '100%'
          }}
          onClick={() => toggleProject(p.name)}
        >
          {p.name}
        </button>
        <button
          type="button"
          aria-label={`Toggle detail WOK ${p.wok}`}
          style={{
            fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left',
            display: 'block', width: '100%', }}
          onClick={() => toggleProject(p.name)}
        >
          {formatBranch(bName)} · {p.wok}
        </button>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(usedTotal || 0).toLocaleString('id-ID')}</div>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(avaiTotal || 0).toLocaleString('id-ID')}</div>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(totalPort || 0).toLocaleString('id-ID')}</div>

        {/* Activity cells using unified ActivityStatus component */}
        {ACT_TYPES.map(actType => {
          const a = projectActivities.find(x => x.type === actType.key);
          const rawStatus = a?.status || 'belum';
          const photos = a?.photos || [];
          const verifiedPhotos = photos.filter(ph => ph.status === 'verified');
          const pendingPhotos = photos.filter(ph => ph.status === 'upload');
          const rejectedPhotos = photos.filter(ph => ph.status === 'rejected' || ph.status === 'gagal');

          let status = 'belum';
          if (rawStatus === 'verified' || verifiedPhotos.length > 0) {
            status = 'selesai';
          } else if (rawStatus === 'upload' || pendingPhotos.length > 0) {
            status = 'menunggu_verifikasi';
          } else if (rawStatus === 'gagal' || rawStatus === 'rejected' || rejectedPhotos.length > 0) {
            status = 'gagal';
          } else if (rawStatus === 'proses' || rawStatus === 'processing') {
            status = 'proses';
          }

          const verifiedCount = verifiedPhotos.length > 0 ? verifiedPhotos.length : (status === 'selesai' ? 1 : 0);
          const label = status === 'selesai' && verifiedCount > 1 ? `Selesai (${verifiedCount})` : undefined;

          const handleAction = () => {
            if (status === 'menunggu_verifikasi') {
              onReview && onReview(bName, p.name);
            } else {
              onOpenUploadModal && onOpenUploadModal({ branchName: bName, projectName: p.name, actTypeObj: actType });
            }
          };

          return (
            <div
              key={actType.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 4px',
                alignSelf: 'center'
              }}
            >
              <ActivityStatus
                status={status}
                label={label}
                count={verifiedCount}
                onAction={handleAction}
                onClick={handleAction}
                title={actType.label}
              />
            </div>
          );
        })}

        {/* Kolom ringkasan progres per proyek (badge + mini progress bar) */}
        {(() => {
          const completedCount = ACT_TYPES.reduce((count, actType) => {
            const a = projectActivities.find(x => x.type === actType.key);
            const isVerified = a?.status === 'verified' || (a?.photos && a.photos.some(ph => ph.status === 'verified'));
            return count + (isVerified ? 1 : 0);
          }, 0);
          const progressPct = Math.round((completedCount / ACT_TYPES.length) * 100);

          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0 6px',
                alignSelf: 'center'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: completedCount > 0 ? '#0F172A' : '#64748B',
                  whiteSpace: 'nowrap'
                }}
              >
                {completedCount}/{ACT_TYPES.length} Selesai
              </span>
              <div
                style={{
                  width: '64px',
                  height: '5px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '9999px',
                  overflow: 'hidden'
                }}
                title={`Progres kegiatan GTM: ${completedCount} dari ${ACT_TYPES.length} selesai (${progressPct}%)`}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    backgroundColor: completedCount === ACT_TYPES.length ? '#0F172A' : completedCount > 0 ? '#475569' : '#CBD5E1',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* Kolom Detail / Review sejajar dan tidak terpotong di tepi kanan */}
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReview && onReview(bName, p.name); }}
            aria-label={`Buka detail dan review proyek ${p.name}`}
            title={`Lihat detail & review foto proyek ${p.name}`}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              color: '#0F172A',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '32px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            Review
          </button>
        </div>
      </div>

      {/* ODP rows on-demand loading */}
      {isExpanded && pOdps.map((o) => (
        <OdpRow key={o.odp} o={o} odpGrid={odpGrid} />
      ))}
    </div>
  );
});

export default function ProjectTable({ projects, branchName, onReview, uploadPhoto, isLoading = false, onResetSearch }) {
  const [expanded, setExpanded] = useState({});
  const [filterPopup, setFilterPopup] = useState(null);
  const [filters, setFilters] = useState({
    name: { sort: null, search: '', unchecked: [] },
    wok: { sort: null, search: '', unchecked: [] },
    usedTotal: { sort: null, search: '', unchecked: [] },
    avaiTotal: { sort: null, search: '', unchecked: [] },
    totalPort: { sort: null, search: '', unchecked: [] }
  });

  // ─── FILTER POPUP REF & CLICK OUTSIDE LISTENER ───
  const popupRef = useRef(null);

  useEffect(() => {
    if (!filterPopup) return;
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setFilterPopup(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFilterPopup(null);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterPopup]);

  // ─── OPTIMASI 1: PAGINATION STATE ───
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const pageSizeRef = useRef(null);

  // Keyboard Escape and click-outside listener for page size dropdown (R-32)
  useEffect(() => {
    if (!isPageSizeOpen) return;
    const handleClickOutside = (e) => {
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target)) {
        setIsPageSizeOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPageSizeOpen]);

  // ─── UPLOAD MODAL STATE ───
  const [activeUploadData, setActiveUploadData] = useState(null);
  const [confirmSubmitData, setConfirmSubmitData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleProject = useCallback((projectName) => {
    setExpanded(prev => ({ ...prev, [projectName]: !prev[projectName] }));
  }, []);

  // ─── OPTIMASI 2: GUNAKAN NILAI PRE-COMPUTED DARI SERVER ───
  // usedTotal, avaiTotal, totalPort, occRate sudah dihitung di server.js — tidak perlu reduce() di sini.
  const projectsWithTotals = useMemo(() => {
    return (Array.isArray(projects) ? projects : []).map(p => {
      const odps = Array.isArray(p.odps) ? p.odps : [];
      return {
        ...p,
        wok: p.wok || '-',
        usedTotal: p.usedTotal ?? odps.reduce((s, o) => s + (o.used || 0), 0),
        avaiTotal: p.avaiTotal ?? odps.reduce((s, o) => s + (o.avai || 0), 0),
        totalPort: p.totalPort ?? odps.reduce((s, o) => s + (o.total || 0), 0),
      };
    });
  }, [projects]);

  const displayProjects = useMemo(() => {
    let list = [...projectsWithTotals];

    // Apply filtering
    ['wok', 'usedTotal', 'avaiTotal', 'totalPort'].forEach(col => {
      const f = filters[col];
      if (f && f.unchecked && f.unchecked.length > 0) {
        const uncheckedStr = f.unchecked.map(String);
        list = list.filter(p => !uncheckedStr.includes(String(p[col] ?? '-')));
      }
    });

    // Apply sorting
    const sortCol = ['name', 'wok', 'usedTotal', 'avaiTotal', 'totalPort'].find(col => filters[col]?.sort);
    if (sortCol) {
      const sortDir = filters[sortCol].sort;
      if (sortCol === 'name' || sortCol === 'wok') {
        list.sort((a, b) => {
          const valA = String(a[sortCol] || '');
          const valB = String(b[sortCol] || '');
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      } else {
        list.sort((a, b) => {
          const numA = Number(a[sortCol]) || 0;
          const numB = Number(b[sortCol]) || 0;
          return sortDir === 'asc' ? numA - numB : numB - numA;
        });
      }
    }

    return list;
  }, [projectsWithTotals, filters]);

  // Reset page ke 1 jika filter berubah atau daftar proyek berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [displayProjects.length, filters]);

  const isShowAll = pageSize === PAGE_SIZE_ALL;
  const totalPages = isShowAll ? 1 : (Math.ceil(displayProjects.length / pageSize) || 1);
  const paginatedProjects = useMemo(() => {
    if (isShowAll) return displayProjects;
    const start = (currentPage - 1) * pageSize;
    return displayProjects.slice(start, start + pageSize);
  }, [displayProjects, currentPage, pageSize, isShowAll]);
  const rangeStart = displayProjects.length > 0 ? (isShowAll ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const rangeEnd = isShowAll ? displayProjects.length : Math.min(currentPage * pageSize, displayProjects.length);

  // ─── OPTIMASI 4: VIRTUALISASI BARIS (mode "Semua proyek") ───
  // Tinggi tiap baris diukur otomatis (baris yang di-expand menampilkan daftar ODP sehingga lebih tinggi)
  const scrollRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: isShowAll ? displayProjects.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => displayProjects[index]?.name ?? index,
    overscan: 10,
    enabled: isShowAll
  });
  const virtualRows = isShowAll ? rowVirtualizer.getVirtualItems() : [];
  const virtualPaddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const virtualPaddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

  const renderProjectRow = (p, idx) => (
    <ProjectRow
      key={p.name}
      p={p}
      branchName={branchName}
      isExpanded={Boolean(expanded[p.name])}
      toggleProject={toggleProject}
      onReview={onReview}
      onOpenUploadModal={setActiveUploadData}
      tableGrid={tableGrid}
      odpGrid={odpGrid}
      isEven={idx % 2 === 1}
    />
  );

  const updateFilter = (col, key, val) => {
    setFilters(prev => {
      const newState = { ...prev };
      if (key === 'sort' && val !== null) {
        ['name', 'wok', 'usedTotal', 'avaiTotal', 'totalPort'].forEach(c => {
          if (c !== col) newState[c].sort = null;
        });
      }
      newState[col] = { ...newState[col], [key]: val };
      return newState;
    });
  };

  const handleSortCycle = (col) => {
    const current = filters[col]?.sort;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';
    updateFilter(col, 'sort', next);
  };

  const renderSortableHeader = (label, col, align = 'left', hasFilter = false) => {
    const isFiltered = (filters[col]?.unchecked?.length > 0) || Boolean(filters[col]?.search);
    const sort = filters[col]?.sort;

    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: '4px',
          paddingRight: align === 'right' ? '6px' : '0',
          paddingLeft: align === 'left' ? '2px' : '0',
          width: '100%',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap'
        }}
      >
        <button
          type="button"
          onClick={() => handleSortCycle(col)}
          aria-label={`Urutkan kolom ${label} (${sort === 'asc' ? 'naik' : sort === 'desc' ? 'turun' : 'belum diurutkan'})`}
          title={`Klik untuk mengurutkan ${label}`}
          className="table-sort-btn"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            font: 'inherit',
            fontSize: '11px',
            fontWeight: 400,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <span style={{ color: '#FFFFFF' }}>{label}</span>
          <SortIcon sort={sort} />
        </button>

        {hasFilter && (
          <button
            type="button"
            aria-label={`Filter kolom ${label}`}
            onClick={(e) => { e.stopPropagation(); setFilterPopup(filterPopup === col ? null : col); }}
            style={{
              background: isFiltered ? '#FFFFFF' : 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: isFiltered ? '#800000' : '#FFFFFF',
              padding: '2px',
              borderRadius: '4px',
              marginLeft: '2px',
              flexShrink: 0
            }}
            title={`Filter kolom ${label}`}
          >
            <FilterIcon />
          </button>
        )}

        {hasFilter && renderFilterPopup(col)}
      </div>
    );
  };

  const renderFilterPopup = (col) => {
    if (filterPopup !== col) return null;

    const valueCounts = {};
    projectsWithTotals.forEach(p => {
      const v = p[col] ?? '-';
      valueCounts[v] = (valueCounts[v] || 0) + 1;
    });

    const isStringCol = col === 'wok';
    const allValues = isStringCol
      ? Object.keys(valueCounts).sort((a, b) => a.localeCompare(b))
      : Object.keys(valueCounts).map(Number).sort((a, b) => a - b);

    const searchLower = (filters[col].search || '').toLowerCase();
    const visibleValues = allValues.filter(v => v.toString().toLowerCase().includes(searchLower));
    const currentUncheckedStr = (filters[col].unchecked || []).map(String);

    return (
      <div
        ref={popupRef}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '6px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.22)',
          zIndex: 99999,
          width: '210px',
          padding: '12px',
          fontSize: '12px',
          color: '#334155',
          textAlign: 'left',
          textTransform: 'none',
          letterSpacing: 'normal'
        }}
      >
        <button
          type="button"
          onClick={() => { updateFilter(col, 'sort', filters[col].sort === 'asc' ? null : 'asc'); setFilterPopup(null); }}
          style={{ width: '100%', border: 'none', padding: '6px 10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: filters[col].sort === 'asc' ? '#F1F5F9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', color: filters[col].sort === 'asc' ? '#800000' : '#334155', textAlign: 'left' }}
        >
          <span style={{ fontSize: '14px' }}>↓</span> {isStringCol ? 'Sort A to Z' : 'Sort Kecil ke Besar'}
        </button>
        <button
          type="button"
          onClick={() => { updateFilter(col, 'sort', filters[col].sort === 'desc' ? null : 'desc'); setFilterPopup(null); }}
          style={{ width: '100%', border: 'none', padding: '6px 10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: filters[col].sort === 'desc' ? '#F1F5F9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', color: filters[col].sort === 'desc' ? '#800000' : '#334155', textAlign: 'left' }}
        >
          <span style={{ fontSize: '14px' }}>↑</span> {isStringCol ? 'Sort Z to A' : 'Sort Besar ke Kecil'}
        </button>

        <div style={{ height: '1px', background: '#E2E8F0', margin: '8px 0' }} />

        <input
          type="text"
          placeholder={`Cari ${col === 'wok' ? 'WOK' : 'nilai'}...`}
          aria-label={`Cari filter ${col}`}
          value={filters[col].search}
          onChange={e => updateFilter(col, 'search', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', marginBottom: '8px', fontSize: '11.5px' }}
        />

        <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '2px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
            <input
              type="checkbox"
              checked={currentUncheckedStr.length === 0}
              onChange={(e) => {
                if (e.target.checked) updateFilter(col, 'unchecked', []);
                else updateFilter(col, 'unchecked', allValues.map(String));
              }}
            />
            (Pilih Semua)
          </label>
          {visibleValues.map(v => {
            const strVal = String(v);
            const isChecked = !currentUncheckedStr.includes(strVal);
            return (
              <label key={strVal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ flexShrink: 0 }}
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilter(col, 'unchecked', currentUncheckedStr.filter(x => x !== strVal));
                    } else {
                      updateFilter(col, 'unchecked', [...currentUncheckedStr, strVal]);
                    }
                  }}
                />
                <span style={{ lineHeight: '1.3', fontSize: '11.5px', color: '#0F172A' }}>
                  {strVal} <span style={{ color: '#64748B', fontSize: '10.5px', }}>({valueCounts[v]})</span>
                </span>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={() => {
              updateFilter(col, 'unchecked', []);
              updateFilter(col, 'search', '');
              updateFilter(col, 'sort', null);
            }}
            style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: '11px', }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setFilterPopup(null)}
            style={{ padding: '4px 12px', border: 'none', borderRadius: '6px', background: '#0F172A', color: '#FFFFFF', cursor: 'pointer', fontSize: '11px', }}
          >
            Terapkan
          </button>
        </div>
      </div>
    );
  };

  const tableGrid = '34px 220px 165px 95px 125px 95px 135px 145px 135px 135px 135px 115px 85px';
  const odpGrid = '34px 220px 165px 95px 125px 95px';

  return (
    <>
    <TableScrollSlider scrollRef={scrollRef} />
    <div className="card project-table-card" style={{ position: 'relative', overflow: filterPopup ? 'visible' : 'hidden' }}>
      <div ref={scrollRef} className="project-table-scroll" style={{ overflowX: 'auto', overflowY: filterPopup ? 'visible' : 'auto', borderRadius: 'inherit' }}>
        <div style={{ minWidth: 'max-content', paddingBottom: filterPopup ? '400px' : '0' }}>
          {/* Header */}
          <div
            className="table-header"
            style={{
              gridTemplateColumns: tableGrid,
              position: 'sticky',
              top: 0,
              zIndex: 20,
              backgroundColor: '#800000',
              color: '#FFFFFF',
              borderBottom: '1px solid #660000',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              minWidth: 'max-content',
              width: 'max-content',
              boxSizing: 'border-box'
            }}
          >
            <div></div>
            {renderSortableHeader('Nama Proyek', 'name', 'left', false)}
            {renderSortableHeader('Branch / WOK', 'wok', 'left', true)}
            {renderSortableHeader('Used', 'usedTotal', 'right', true)}
            {renderSortableHeader('Available', 'avaiTotal', 'right', true)}
            {renderSortableHeader('Total', 'totalPort', 'right', true)}
            {ACT_TYPES.map(t => (
              <div key={t.key} className="activity-col-header">{t.label}</div>
            ))}
            <div style={{ textAlign: 'center', padding: '0 4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF' }}>Progres</div>
            <div style={{ textAlign: 'center', padding: '0 4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF' }}>Detail</div>
          </div>

          {/* Rows / Skeleton / Empty State */}
          {isLoading ? (
            <div style={{ padding: '4px 0' }}>
              {[1, 2, 3, 4, 5].map(idx => (
                <div
                  key={idx}
                  className="table-row"
                  style={{ gridTemplateColumns: tableGrid, minHeight: '52px', minWidth: 'max-content', width: 'max-content', boxSizing: 'border-box' }}
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '150px', height: '14px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '90px', height: '12px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  {[1, 2, 3, 4, 5].map(actIdx => (
                    <div key={actIdx} style={{ width: '68px', height: '24px', borderRadius: '6px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                  ))}
                  <div style={{ width: '64px', height: '14px', borderRadius: '4px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '56px', height: '28px', borderRadius: '8px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          ) : isShowAll ? (
            <>
              <div style={{ height: `${virtualPaddingTop}px` }} />
              {virtualRows.map(virtualRow => (
                <div key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement}>
                  {renderProjectRow(displayProjects[virtualRow.index], virtualRow.index)}
                </div>
              ))}
              <div style={{ height: `${virtualPaddingBottom}px` }} />
            </>
          ) : (
            paginatedProjects.map((p, idx) => renderProjectRow(p, idx))
          )}

          {paginatedProjects.length === 0 && !isLoading && (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <div style={{ fontSize: '15px', color: '#0F172A' }}>
                Tidak ada proyek yang sesuai dengan filter
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '420px', lineHeight: 1.5 }}>
                Hasil tidak ditemukan untuk filter atau kata kunci saat ini. Silakan atur ulang filter kolom untuk melihat seluruh data.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    name: { sort: null, search: '', unchecked: [] },
                    wok: { sort: null, search: '', unchecked: [] },
                    usedTotal: { sort: null, search: '', unchecked: [] },
                    avaiTotal: { sort: null, search: '', unchecked: [] },
                    totalPort: { sort: null, search: '', unchecked: [] }
                  });
                  if (onResetSearch) onResetSearch();
                }}
                aria-label="Reset semua filter tabel"
                style={{
                  marginTop: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset Filter</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {activeUploadData && (
        <UploadModal
          data={activeUploadData}
          onClose={() => setActiveUploadData(null)}
          onSubmit={(payload) => {
            setConfirmSubmitData({
              ...activeUploadData,
              actLabel: activeUploadData.actTypeObj.label,
              payload
            });
          }}
        />
      )}

      {/* Confirm Submit Modal */}
      {confirmSubmitData && (
        <ConfirmSubmitModal
          data={confirmSubmitData}
          isSubmitting={isSubmitting}
          onCancel={() => setConfirmSubmitData(null)}
          onConfirm={async () => {
            setIsSubmitting(true);
            try {
              let result = null;
              if (uploadPhoto) {
                result = await uploadPhoto(
                  confirmSubmitData.branchName,
                  confirmSubmitData.projectName,
                  confirmSubmitData.actTypeObj.key,
                  confirmSubmitData.payload
                );
              }
              setConfirmSubmitData(null);
              // Jika gagal, form upload tetap terbuka agar data yang sudah diisi tidak hilang
              if (!result || result.success !== false) {
                setActiveUploadData(null);
              }
            } catch (err) {
              console.error('Submit error:', err);
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      )}

      {/* Pagination Footer */}
      <div className="table-pagination-footer">
        <div className="tabular-nums" style={{ fontSize: '13px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          Menampilkan <span style={{ color: '#0f172a', }}>{rangeStart}</span> - <span style={{ color: '#0f172a', }}>{rangeEnd}</span> dari <span style={{ color: '#0f172a', }}>{displayProjects.length}</span> proyek
        </div>

        <div className="table-pagination-controls">
          {/* Custom Capsule Dropup for Page Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', }}>
            <span>Per halaman:</span>
            <div ref={pageSizeRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                aria-haspopup="listbox"
                aria-expanded={isPageSizeOpen}
                aria-label="Pilih jumlah data per halaman"
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: '#0f172a'
                }}
              >
                <span>{isShowAll ? 'Semua' : pageSize} proyek</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isPageSizeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isPageSizeOpen && (
                <div 
                  role="listbox"
                  aria-label="Daftar pilihan baris per halaman"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: '6px',
                    width: '120px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    overflow: 'hidden'
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={pageSize === size}
                      className={`dropdown-item ${pageSize === size ? 'active' : ''}`}
                      onClick={() => { setPageSize(size); setCurrentPage(1); setIsPageSizeOpen(false); }}
                      style={{
                        width: '100%',
                        border: 'none',
                        textAlign: 'left',
                        padding: '8px 14px',
                        fontSize: '13px',
                        color: pageSize === size ? '#800000' : '#334155',
                        background: pageSize === size ? '#FEF2F2' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {size === PAGE_SIZE_ALL ? 'Semua' : size} proyek
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Capsule Arrow Buttons for Prev / Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              aria-label="Halaman Sebelumnya"
              title="Halaman Sebelumnya"
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f1f5f9' : '#fff',
                color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>

            <span className="tabular-nums" style={{ padding: '0 6px', fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              aria-label="Halaman Selanjutnya"
              title="Halaman Selanjutnya"
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: currentPage === totalPages ? '#f1f5f9' : '#fff',
                color: currentPage === totalPages ? '#94a3b8' : '#0f172a',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/ActivityStatus.jsx` (220 baris)

```javascript
import { memo } from 'react';

/**
 * ActivityStatus Component
 * Komponen tunggal representasi status aktivitas GTM dengan tipografi Gordita Regular 400
 * dan palet netral Slate monokrom tanpa teks berwarna-warni.
 */
const ActivityStatus = memo(function ActivityStatus({
  status = 'belum',
  label,
  count,
  onClick,
  onAction,
  title
}) {
  const handleAction = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onAction) onAction(e);
    else if (onClick) onClick(e);
  };

  // 1. Selesai (Verified) — Ikon centang, chip netral elegan, tanpa tombol
  if (status === 'selesai' || status === 'verified') {
    const displayLabel = label || (count > 1 ? `Selesai (${count})` : 'Selesai');
    return (
      <div
        role="status"
        aria-label={title ? `${title}: Selesai dan terverifikasi` : 'Aktivitas selesai dan terverifikasi'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#F1F5F9',
          color: '#1E293B',
          border: '1px solid #CBD5E1',
          fontSize: '11px',
          whiteSpace: 'nowrap'
        }}
        title={title ? `${title}: Selesai & Terverifikasi` : 'Aktivitas telah selesai dan terverifikasi'}
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{displayLabel}</span>
      </div>
    );
  }

  // 2. Menunggu Verifikasi — Tombol "Cek Status" Netral
  if (status === 'menunggu_verifikasi' || status === 'upload') {
    return (
      <button
        type="button"
        onClick={handleAction}
        aria-label={title ? `Cek status verifikasi ${title}` : 'Cek status verifikasi'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #CBD5E1',
          color: '#334155',
          fontSize: '10.5px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          minHeight: '26px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
        title={title ? `${title}: Menunggu verifikasi admin. Klik untuk cek status.` : 'Menunggu verifikasi admin. Klik untuk cek status.'}
      >
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>Cek Status</span>
      </button>
    );
  }

  // 3. Proses — Ikon spinner + indikator proses Netral
  if (status === 'proses' || status === 'processing') {
    return (
      <div
        role="status"
        aria-label={title ? `${title}: Sedang diproses` : 'Sedang diproses'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#F1F5F9',
          color: '#334155',
          border: '1px solid #CBD5E1',
          fontSize: '11px',
          whiteSpace: 'nowrap'
        }}
        title={title ? `${title}: Sedang diproses` : 'Sedang diproses'}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        <span>{label || 'Proses'}</span>
      </div>
    );
  }

  // 4. Gagal / Ditolak — Chip Netral + Tombol "Perbaiki" Slate Gelap
  if (status === 'gagal' || status === 'rejected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <span
          role="status"
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#F1F5F9',
            color: '#475569',
            border: '1px solid #CBD5E1',
            whiteSpace: 'nowrap'
          }}
        >
          {label || 'Ditolak'}
        </span>
        <button
          type="button"
          onClick={handleAction}
          aria-label={title ? `Perbaiki data kegiatan ${title}` : 'Perbaiki data kegiatan'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#0F172A',
            border: '1px solid #0F172A',
            color: '#FFFFFF',
            fontSize: '10.5px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '26px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0F172A'; }}
          title={title ? `${title}: Kegiatan ditolak. Klik untuk perbaiki.` : 'Kegiatan ditolak. Klik untuk perbaiki.'}
        >
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span>Perbaiki</span>
        </button>
      </div>
    );
  }

  // 5. Belum (Default) — Tombol Upload Netral Slate
  return (
    <button
      type="button"
      onClick={handleAction}
      aria-label={title ? `Unggah kegiatan ${title}` : 'Unggah kegiatan GTM'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        padding: '5px 10px',
        borderRadius: '6px',
        border: '1px solid #CBD5E1',
        backgroundColor: '#F8FAFC',
        color: '#475569',
        fontSize: '11px',
        cursor: 'pointer',
        minHeight: '28px',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F1F5F9';
        e.currentTarget.style.color = '#0F172A';
        e.currentTarget.style.borderColor = '#94A3B8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
        e.currentTarget.style.color = '#475569';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      title={title ? `Upload kegiatan ${title}` : 'Klik untuk mengunggah kegiatan GTM'}
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span>Upload</span>
    </button>
  );
});

export default ActivityStatus;
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/HeroOccupancyCard.jsx` (132 baris)

```javascript
import { useCountUp } from '../../hooks/useCountUp';

// ─── HERO CARD (TELKOMSEL MAROON - CLEAN ARCHITECTURE) ───
export default function HeroOccupancyCard({ safeKpi, onReviewBranch, isAdmin, isInView = true }) {
  const isOccDecimal = Number(safeKpi.occRate) % 1 !== 0;
  const countOccRate = useCountUp(safeKpi.occRate, { enabled: isInView, decimals: isOccDecimal ? 1 : 0, duration: 800 });
  const countTotalUsed = useCountUp(safeKpi.totalUsed, { enabled: isInView, duration: 750 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 750 });

  return (
    <div
      className="hero-red-card saas-card"
      style={{
        width: '100%',
        maxWidth: '360px',
        backgroundColor: '#800000',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: 'none',
        boxSizing: 'border-box',
        minHeight: '190px'
      }}
    >
      {/* Baris 1: Header (Judul & WoW Badge) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', height: '24px' }}>
        <span
          style={{
            fontSize: '15px',
            color: '#FFFFFF',
            letterSpacing: '-0.1px',
            whiteSpace: 'nowrap'
          }}
        >
          Okupansi Regional Jateng & DIY
        </span>

        {safeKpi.gapWoW != null && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {safeKpi.gapWoW > 0 ? `+${safeKpi.gapWoW}%` : `${safeKpi.gapWoW}%`} WoW
          </span>
        )}
      </div>

      {/* Baris 2: Primary Giant Metric (Sejajar sempurna dengan 3 metrik kanan) */}
      <div
        style={{
          fontSize: '48px',
          lineHeight: 1,
          letterSpacing: '-1.5px',
          margin: '18px 0 16px 0',
          fontVariantNumeric: 'tabular-nums',
          color: '#FFFFFF'
        }}
      >
        {countOccRate}%
      </div>

      {/* Baris 3: Metadata Ringkas + Tombol Aksi Kompak */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          height: '24px'
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.9)',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ color: '#FFFFFF' }}>{countTotalUsed}</span> dari{' '}
          <span style={{ color: '#FFFFFF' }}>{countTotalPort}</span> port
        </div>

        {isAdmin && onReviewBranch && (
          <button
            type="button"
            onClick={onReviewBranch}
            className="hero-review-btn"
            title="Review Branch Prioritas (Purwokerto)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '11.5px',
              padding: '3px 9px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <span>Review Prioritas</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/RegionalMetricsSummaryCard.jsx` (251 baris)

```javascript
import { useCountUp } from '../../hooks/useCountUp';

// ─── SECTION 1: METRIK UTAMA REGIONAL (PORT TERSEDIA, TOTAL ODP, VERIFIKASI KEGIATAN) ───
export default function RegionalMetricsSummaryCard({
  safeKpi,
  safeStatusChips = [],
  isInView = true
}) {
  // Animated numbers
  const countTotalAvai = useCountUp(safeKpi.totalAvai, { enabled: isInView, duration: 800 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 800 });
  const countOdpCount = useCountUp(safeKpi.odpCount, { enabled: isInView, duration: 800 });
  const countActVerified = useCountUp(safeKpi.actVerified, { enabled: isInView, duration: 750 });
  const pendingCount = safeKpi.actPending || 0;
  const countActPending = useCountUp(pendingCount, { enabled: isInView, duration: 750 });
  const countActBelum = useCountUp(safeKpi.actBelum || 0, { enabled: isInView, duration: 850 });
  const isActDecimal = Number(safeKpi.actCompletionPct) % 1 !== 0;
  const countActCompletionPct = useCountUp(safeKpi.actCompletionPct, { enabled: isInView, decimals: isActDecimal ? 1 : 0, duration: 850 });

  return (
    <div
      className="saas-card regional-metrics-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px 28px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        minHeight: '190px'
      }}
    >
      {/* Grid 3 Metrik Utama: Port Tersedia, Total ODP Terpantau, Verifikasi Kegiatan */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px',
          alignItems: 'flex-start',
          width: '100%'
        }}
      >
        {/* Metrik 1: Port Tersedia */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Port Tersedia
          </div>
          <div
            style={{
              fontSize: '48px',
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countTotalAvai}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Kapasitas:{' '}
            <span
              style={{
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginLeft: '4px'
              }}
            >
              {countTotalPort}
            </span>
          </div>
        </div>

        {/* Metrik 2: Total ODP Terpantau */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Total ODP Terpantau
          </div>
          <div
            style={{
              fontSize: '48px',
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countOdpCount}
          </div>
          {/* 5-Color Status Breakdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              height: '24px'
            }}
          >
            {safeStatusChips.map((s) => (
              <span
                key={s.label}
                title={`${s.label}: ${s.count}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#475569',
                  fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum"',
                  whiteSpace: 'nowrap'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: s.color,
                    boxSizing: 'border-box',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
                <span>
                  {s.label[0]}:{s.count.toLocaleString('id-ID')}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Metrik 3: Verifikasi Kegiatan */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Verifikasi Kegiatan
          </div>
          <div
            style={{
              fontSize: '48px',
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countActCompletionPct}%
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span
              style={{
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActVerified}
            </span>
            <span>verif</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span
              style={{
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActPending}
            </span>
            <span>review</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span
              style={{
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActBelum}
            </span>
            <span>belum</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/KpiCards.jsx` (245 baris)

```javascript
import { useState, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── SECTION 1: 4 KPI CARDS (RESPONSIVE 1-ROW GRID, COMPACT & PURPOSEFUL) ───
export default function KpiCards({ safeKpi, safeStatusChips, isInView = true }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const mountTimer = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(mountTimer);
  }, []);

  // Animated numbers using useCountUp, only starting when isInView is true
  const isOccDecimal = Number(safeKpi.occRate) % 1 !== 0;
  const countOccRate = useCountUp(safeKpi.occRate, { enabled: isInView, decimals: isOccDecimal ? 1 : 0, duration: 800 });
  const countTotalUsed = useCountUp(safeKpi.totalUsed, { enabled: isInView, duration: 750 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 750 });
  const countTotalAvai = useCountUp(safeKpi.totalAvai, { enabled: isInView, duration: 850 });
  const countOdpCount = useCountUp(safeKpi.odpCount, { enabled: isInView, duration: 800 });
  const countActCompletionPct = useCountUp(safeKpi.actCompletionPct, { enabled: isInView, decimals: Number(safeKpi.actCompletionPct) % 1 !== 0 ? 1 : 0, duration: 850 });
  const countActVerified = useCountUp(safeKpi.actVerified, { enabled: isInView, duration: 750 });
  const countActUploaded = useCountUp(safeKpi.actUploaded, { enabled: isInView, duration: 750 });
  const pendingCount = safeKpi.actPending || safeKpi.actBelum || 0;
  const countActPending = useCountUp(pendingCount, { enabled: isInView, duration: 750 });

  return (
    <div className="kpi-grid-4">
      {/* ─── CARD 1: TOTAL OCCUPANCY RATE ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-1">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Total Occupancy Rate
          </span>
          {safeKpi.gapWoW != null && (
            <span className={safeKpi.gapWoW > 0 ? 'gap-badge-pos' : safeKpi.gapWoW < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
              {safeKpi.gapWoW > 0 ? `+${safeKpi.gapWoW}%` : `${safeKpi.gapWoW}%`} WoW
            </span>
          )}
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countOccRate}%
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView ? `${Math.min(safeKpi.occRate, 100)}%` : '0%', 
                background: '#0F172A', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          {countTotalUsed} dari {countTotalPort} port terpakai
        </div>
      </div>

      {/* ─── CARD 2: PORT TERSEDIA ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Port Tersedia
          </span>
          <span style={{ 
            fontSize: '11px', 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Kapasitas
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countTotalAvai}
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView && safeKpi.totalPort > 0 ? `${Math.min((safeKpi.totalAvai / safeKpi.totalPort) * 100, 100)}%` : '0%', 
                background: '#64748B', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          Total kapasitas {countTotalPort} port di {countOdpCount} ODP
        </div>
      </div>

      {/* ─── CARD 3: TOTAL ODP TERPANTAU ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Total ODP Terpantau
          </span>
          <span style={{ 
            fontSize: '11px', 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Cakupan
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countOdpCount}
          </div>

          {/* Multi-color stacked bar horizontal (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
            {safeKpi.odpCount > 0 ? (
              safeStatusChips.map(s => {
                const sharePct = (s.count / safeKpi.odpCount) * 100;
                if (sharePct <= 0) return null;
                return (
                  <div 
                    key={s.label}
                    title={`${s.label}: ${s.count}`}
                    className="progress-bar-fill"
                    style={{
                      height: '100%',
                      width: isMounted && isInView ? `${sharePct}%` : '0%',
                      background: s.color
                    }}
                  />
                );
              })
            ) : (
              <div style={{ height: '100%', width: '0%', background: '#64748B' }} />
            )}
          </div>
        </div>

        {/* Legenda titik warna inline (G, Y, O, R, B) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          {safeStatusChips.map(s => (
            <span 
              key={s.label} 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '3.5px', 
                fontSize: '11px', 
                color: '#475569', 
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, border: s.color?.toUpperCase() === '#FFFF00' ? '1px solid #CBD5E1' : 'none', boxSizing: 'border-box', display: 'inline-block' }} />
              <span>{s.label[0]}: {s.count.toLocaleString('id-ID')}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── CARD 4: AKTIVITAS GTM SELESAI ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Aktivitas GTM Selesai
          </span>
          <span style={{ 
            fontSize: '11px', 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Verifikasi
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countActCompletionPct}%
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView ? `${Math.min(safeKpi.actCompletionPct, 100)}%` : '0%', 
                background: '#0F172A', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          {countActVerified} terverifikasi · {countActUploaded} diunggah · {countActPending} belum
        </div>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/PortDistributionChartCard.jsx` (502 baris)

```javascript
import { useState, useEffect, useMemo, useRef } from 'react';

// Formatter nama WOK agar muat proporsional dan jelas pada x-axis histogram
function formatWokLabel(name) {
  if (!name) return '';
  const upper = name.trim().toUpperCase();
  if (upper.includes('WONOSOBO')) return 'WONOSOBO';
  if (upper.includes('CILACAP')) return 'CILACAP';
  if (upper.includes('PEMALANG')) return 'PEMALANG';
  if (upper.includes('TEGAL')) return 'TEGAL';
  if (upper.includes('MAGELANG')) return 'MAGELANG';
  if (upper.includes('JEPARA') || upper.includes('KUDUS') || upper.includes('PATI')) return 'KUDUS-PATI';
  if (upper === 'SEMARANG 1' || upper.includes('SEMARANG 1')) return 'SMG 1';
  if (upper === 'SEMARANG 2' || upper.includes('SEMARANG 2')) return 'SMG 2';
  if (upper === 'YOGYAKARTA 1' || upper.includes('YOGYA 1')) return 'YOGYA 1';
  if (upper === 'YOGYAKARTA 2' || upper.includes('YOGYA 2')) return 'YOGYA 2';
  if (upper.includes('BOYOLALI')) return 'BOYOLALI';
  if (upper.includes('SRAGEN')) return 'SRAGEN';
  if (upper.includes('SURAKARTA') || upper.includes('SOLO')) return 'SURAKARTA';
  if (upper.includes('BATANG')) return 'BATANG';
  if (upper.includes('KEBUMEN')) return 'KEBUMEN';
  if (upper.includes('DEMAK')) return 'DEMAK';

  const firstWord = upper.split(/[\s-]+/)[0];
  return firstWord.length <= 9 ? firstWord : upper.slice(0, 8);
}

// ─── SECTION 2: DISTRIBUSI UTILISASI PORT PER BRANCH & WOK ───
export default function PortDistributionChartCard({
  ranking = [],
  branches = [],
  isInView = true,
  onSelectBranch
}) {
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  // Bangun daftar WOK dengan urutan kolom sumbu X yang stabil dari master branches,
  // lalu pasangkan dengan nilai metrik hasil filter aktif (ranking) agar bar bergerak naik-turun secara mulus
  const targetBars = useMemo(() => {
    const bars = [];
    const masterBranches = Array.isArray(branches) && branches.length > 0 ? branches : ranking;

    masterBranches.forEach((rawBranch) => {
      const bName = rawBranch.name || '';
      const bUpper = bName.toUpperCase();
      const rankedBranch = (ranking || []).find(
        (r) => (r.name || '').toUpperCase() === bUpper
      ) || rawBranch;

      const allWokNames = Array.from(
        new Set(
          (rawBranch.projects || [])
            .map((p) => (p.wok || '').toString().trim())
            .filter((w) => w && w !== '-' && w !== 'NONE')
        )
      ).sort();

      if (allWokNames.length > 0) {
        allWokNames.forEach((wokName) => {
          const cleanW = wokName.toUpperCase().replace(/[\s-]/g, '');
          const matchedWok = (rankedBranch.woks || []).find((w) => {
            const wClean = (w.name || '').toUpperCase().replace(/[\s-]/g, '');
            return wClean === cleanW || wClean.includes(cleanW) || cleanW.includes(wClean);
          });

          const portUsed = matchedWok ? (matchedWok.totalUsed || 0) : 0;
          const portTotal = matchedWok ? (matchedWok.totalPort || 0) : 0;
          const occRate = matchedWok && matchedWok.occRate !== undefined && matchedWok.occRate !== null
            ? matchedWok.occRate
            : (portTotal > 0 ? Math.round((portUsed / portTotal) * 1000) / 10 : 0);

          bars.push({
            id: `${bName}-${wokName}`,
            branchName: bName,
            displayName: wokName,
            shortWokLabel: formatWokLabel(wokName),
            occRate,
            portUsed,
            portTotal,
            portAvai: Math.max(portTotal - portUsed, 0),
            delta: matchedWok ? (matchedWok.delta ?? 0) : 0,
            branchCode: bName.slice(0, 3).toUpperCase()
          });
        });
      } else if (rankedBranch.woks && rankedBranch.woks.length > 0) {
        rankedBranch.woks.forEach((w) => {
          const portUsed = w.totalUsed || 0;
          const portTotal = w.totalPort || 0;
          const occRate = w.occRate ?? (portTotal > 0 ? Math.round((portUsed / portTotal) * 1000) / 10 : 0);

          bars.push({
            id: `${bName}-${w.name}`,
            branchName: bName,
            displayName: w.name,
            shortWokLabel: formatWokLabel(w.name),
            occRate,
            portUsed,
            portTotal,
            portAvai: Math.max(portTotal - portUsed, 0),
            delta: w.delta ?? 0,
            branchCode: bName.slice(0, 3).toUpperCase()
          });
        });
      } else {
        const portUsed = rankedBranch.totalUsed || 0;
        const portTotal = rankedBranch.totalPort || 0;
        const occRate = rankedBranch.occRate ?? (portTotal > 0 ? Math.round((portUsed / portTotal) * 1000) / 10 : 0);

        bars.push({
          id: bName,
          branchName: bName,
          displayName: bName,
          shortWokLabel: formatWokLabel(bName),
          occRate,
          portUsed,
          portTotal,
          portAvai: Math.max(portTotal - portUsed, 0),
          delta: rankedBranch.delta ?? 0,
          branchCode: bName.slice(0, 3).toUpperCase()
        });
      }
    });

    return bars;
  }, [branches, ranking]);

  // Interpolasi frame-by-frame (requestAnimationFrame) untuk pergerakan naik-turun bar yang mulus
  const currentAnimRef = useRef({});
  const [animMap, setAnimMap] = useState({});

  useEffect(() => {
    if (!isInView || targetBars.length === 0) return;

    const startValues = {};
    targetBars.forEach((bar) => {
      const prev = currentAnimRef.current[bar.id];
      startValues[bar.id] = {
        occRate: prev ? prev.occRate : 0,
        portUsed: prev ? prev.portUsed : 0,
        portTotal: prev ? prev.portTotal : 0
      };
    });

    const duration = 650;
    const startTime = performance.now();
    let frameId = null;

    const tick = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Cubic ease-out yang halus
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      const nextMap = {};
      targetBars.forEach((bar) => {
        const s = startValues[bar.id] || { occRate: 0, portUsed: 0, portTotal: 0 };
        nextMap[bar.id] = {
          occRate: s.occRate + (bar.occRate - s.occRate) * ease,
          portUsed: s.portUsed + (bar.portUsed - s.portUsed) * ease,
          portTotal: s.portTotal + (bar.portTotal - s.portTotal) * ease
        };
      });

      currentAnimRef.current = nextMap;
      setAnimMap(nextMap);

      if (rawProgress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [targetBars, isInView]);

  const activeBar = hoveredBarIndex !== null ? targetBars[hoveredBarIndex] : null;
  const activeAnim = activeBar ? (animMap[activeBar.id] || activeBar) : null;
  const PERCENTAGE_TICKS = [100, 80, 60, 40, 20, 0];

  return (
    <div
      className="saas-card port-distribution-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* Header Baris Chart dengan Judul dan Legend / Inspector Slot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          minHeight: '30px',
          height: '30px',
          gap: '12px'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            color: '#475569',
            letterSpacing: '-0.1px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          Distribusi Utilisasi Kapasitas Port per Branch & WOK
        </div>

        {/* Active Inspector Info / Legend Slot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: '26px',
            minWidth: 0,
            flexShrink: 1
          }}
        >
          {activeBar && activeAnim ? (
            <div
              style={{
                fontSize: '11.5px',
                color: '#0F172A',
                background: '#F8FAFC',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontVariantNumeric: 'tabular-nums',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                whiteSpace: 'nowrap',
                lineHeight: '18px',
                height: '26px',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <span style={{ color: '#0F172A' }}>{activeBar.branchName}</span>&nbsp;({activeBar.displayName}):&nbsp;{Math.round(activeAnim.occRate * 10) / 10}% ({Math.round(activeAnim.portUsed).toLocaleString('id-ID')} / {Math.round(activeAnim.portTotal).toLocaleString('id-ID')} port)
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '11px',
                color: '#64748B',
                height: '26px',
                lineHeight: '18px',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#800000' }} />
                Utilisasi Port Terpakai
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kontainer Diagram Batang dengan Sumbu X, Sumbu Y Solid & Garis Kisi Solid */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '6px' }}>
        <div style={{ minWidth: '660px', width: '100%' }}>
          {targetBars.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', width: '100%' }}>
              Belum ada data distribusi port untuk ditampilkan.
            </div>
          ) : (
            <>
              {/* ─── AREA PLOTTING (SUMBU Y DI KIRI + GRID SOLID & BOX PROGRESS DI KANAN) ─── */}
              <div
                style={{
                  display: 'flex',
                  height: '210px',
                  width: '100%',
                  position: 'relative',
                  paddingTop: '18px',
                  boxSizing: 'border-box'
                }}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {/* 1. Sumbu Y (Garis Vertikal di Kiri + Nilai Persentase, Tanpa Strip) */}
                <div
                  style={{
                    width: '46px',
                    height: '100%',
                    position: 'relative',
                    flexShrink: 0,
                    borderRight: '1.5px solid #94A3B8'
                  }}
                  aria-label="Garis Sumbu Y Kuantitas Persentase"
                >
                  {PERCENTAGE_TICKS.map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: 'absolute',
                        bottom: `${pct}%`,
                        right: 0,
                        transform: 'translateY(50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '8px',
                        zIndex: 2
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748B',
                          fontVariantNumeric: 'tabular-nums',
                          userSelect: 'none',
                          lineHeight: 1
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* 2. Area Plotting Canvas (Sumbu X Solid di Bawah + Garis Panduan Grid Solid + Box Progress) */}
                <div
                  style={{
                    flex: 1,
                    height: '100%',
                    position: 'relative',
                    borderBottom: '1.5px solid #94A3B8'
                  }}
                  aria-label="Area Diagram Batang dan Sumbu X"
                >
                  {/* Garis-Garis Solid Sumbu Y Penanda Persentase (Tidak Putus-Putus) */}
                  {PERCENTAGE_TICKS.filter(p => p > 0).map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: `${pct}%`,
                        borderTop: '1px solid #E2E8F0',
                        pointerEvents: 'none',
                        zIndex: 0
                      }}
                    />
                  ))}

                  {/* Kontainer Kolom Batang (Hanya Box Progress Saja) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '8px',
                      padding: '0 8px'
                    }}
                  >
                    {targetBars.map((bar, idx) => {
                      const isHovered = hoveredBarIndex === idx;
                      const anim = animMap[bar.id];
                      const currentOcc = anim ? anim.occRate : 0;
                      const safeOcc = Math.min(Math.max(currentOcc, 0), 100);

                      return (
                        <div
                          key={bar.id}
                          onMouseEnter={() => setHoveredBarIndex(idx)}
                          onClick={() => {
                            if (onSelectBranch) onSelectBranch(bar.branchName);
                          }}
                          style={{
                            flex: 1,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            minWidth: 0
                          }}
                        >
                          {/* Box Progress Batang Port Terpakai Saja */}
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '26px',
                              height: `${safeOcc}%`,
                              minHeight: safeOcc > 0.15 ? '3px' : '0px',
                              backgroundColor: isHovered ? '#660000' : '#800000',
                              borderRadius: '4px 4px 0 0',
                              zIndex: 1,
                              transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                              transform: isHovered ? 'translateY(-2px)' : 'none',
                              boxShadow: isHovered ? '0 4px 12px rgba(128, 0, 0, 0.25)' : 'none'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ─── LABEL SUMBU X (GARIS HORIZONTAL SOLID, NAMA WOK & BRANCH TANPA STRIP) ─── */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  marginTop: '0px'
                }}
              >
                {/* Spacer Menyesuaikan Lebar Sumbu Y */}
                <div style={{ width: '46px', flexShrink: 0 }} />

                {/* Kontainer Label WOK & Branch per Kolom Sumbu X */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    gap: '8px',
                    padding: '0 8px'
                  }}
                >
                  {targetBars.map((bar, idx) => {
                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <div
                        key={bar.id}
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onClick={() => {
                          if (onSelectBranch) onSelectBranch(bar.branchName);
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          minWidth: 0,
                          paddingTop: '6px'
                        }}
                      >
                        {/* Label Singkat WOK */}
                        <span
                          title={`${bar.displayName} (${bar.branchName})`}
                          style={{
                            fontSize: '10px',
                            color: isHovered ? '#0F172A' : '#475569',
                            width: '100%',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            letterSpacing: '-0.1px',
                            lineHeight: '13px',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          {bar.shortWokLabel}
                        </span>

                        {/* Kode Branch */}
                        <span
                          style={{
                            fontSize: '8.5px',
                            color: isHovered ? '#0F172A' : '#94A3B8',
                            lineHeight: '11px',
                            letterSpacing: '0.2px',
                            marginTop: '2px'
                          }}
                        >
                          {bar.branchCode}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/OdpStatusDonutCard.jsx` (344 baris)

```javascript
import { useState, useMemo, useEffect, useRef } from 'react';

// ─── STATUS DESCRIPTIONS & COLOR PALETTE ───
const STATUS_DESCRIPTIONS = {
  Green: 'Okupansi < 25% (Siap Jual)',
  Yellow: 'Okupansi 25% - 50% (Moderat)',
  Orange: 'Okupansi 50% - 75% (Tinggi)',
  Red: 'Okupansi > 75% (Kritis)',
  Black: '0 Port Terpakai (Idle / Kosong)'
};

export default function OdpStatusDonutCard({ statusChips = [], totalOdp = 0, isInView = true }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Total ODP aktual berdasarkan filter aktif
  const rawTotal = useMemo(() => {
    if (totalOdp > 0) return totalOdp;
    return statusChips.reduce((sum, s) => sum + (s.count || 0), 0);
  }, [totalOdp, statusChips]);

  const safeDivisor = rawTotal > 0 ? rawTotal : 1;

  // Target proporsi & kuantitas tiap status untuk diinterpolasi
  const targetChips = useMemo(() => {
    return statusChips.map((chip) => {
      const count = chip.count || 0;
      const share = rawTotal > 0 ? count / safeDivisor : 0;
      return {
        ...chip,
        color: chip.color || '#334155',
        targetCount: count,
        targetShare: share,
        description: STATUS_DESCRIPTIONS[chip.label] || chip.label
      };
    });
  }, [statusChips, rawTotal, safeDivisor]);

  // Interpolasi circular mulus (requestAnimationFrame) saat mount maupun saat ganti filter
  const currentAnimRef = useRef({ total: 0, chips: {} });
  const [animState, setAnimState] = useState({ total: 0, chips: {} });

  useEffect(() => {
    if (!isInView) return;

    const startTotal = currentAnimRef.current.total || 0;
    const startChips = {};
    targetChips.forEach((c) => {
      const prev = currentAnimRef.current.chips[c.label];
      startChips[c.label] = {
        count: prev ? prev.count : 0,
        share: prev ? prev.share : 0
      };
    });

    const duration = 700;
    const startTime = performance.now();
    let frameId = null;

    const tick = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Cubic ease-out untuk pergerakan rotasi busur donat yang halus
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      const nextChips = {};
      targetChips.forEach((c) => {
        const s = startChips[c.label] || { count: 0, share: 0 };
        nextChips[c.label] = {
          count: s.count + (c.targetCount - s.count) * ease,
          share: s.share + (c.targetShare - s.share) * ease
        };
      });

      const nextState = {
        total: startTotal + (rawTotal - startTotal) * ease,
        chips: nextChips
      };

      currentAnimRef.current = nextState;
      setAnimState(nextState);

      if (rawProgress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [targetChips, rawTotal, isInView]);

  // Donut geometry: Center at (100, 100), Radius 66, Stroke 28
  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.69

  // Hitung panjang busur (strokeLength) dan posisi rotasi (offset) di setiap frame
  const slices = useMemo(() => {
    let accumulatedOffset = 0;
    return targetChips.map((chip) => {
      const anim = animState.chips[chip.label] || { count: 0, share: 0 };
      const strokeLength = Math.max(anim.share * circumference, 0);
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...chip,
        count: Math.round(anim.count),
        pct: Math.round(anim.share * 1000) / 10,
        strokeLength,
        offset
      };
    });
  }, [targetChips, animState, circumference]);

  const activeChip = hoveredIndex !== null ? slices[hoveredIndex] : null;
  const displayTotalOdp = Math.round(animState.total).toLocaleString('id-ID');

  return (
    <div
      className="saas-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '22px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '320px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── HEADER KARTU ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
        <div style={{ fontSize: '15px', color: '#475569', letterSpacing: '-0.1px' }}>
          Profil Status Utilisasi ODP
        </div>

        <span
          style={{
            fontSize: '12px',
            color: '#475569',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {displayTotalOdp} ODP
        </span>
      </div>

      {/* ─── KONTEN: DONUT SVG (KIRI) + INTERACTIVE LEGEND (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Donut Chart (~50% diperbesar dari 170px ke 255px) */}
        <div style={{ position: 'relative', width: '255px', height: '255px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="255"
            height="255"
            viewBox="0 0 200 200"
            style={{
              overflow: 'visible',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center'
            }}
          >
            {/* Background Track Circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="28"
            />

            {/* Slices */}
            {slices.map((slice, idx) => {
              const isHovered = hoveredIndex === idx;
              const visibleLength = slice.strokeLength;
              const gapAdjustedLength = visibleLength > 2 ? visibleLength - 1.5 : Math.max(visibleLength, 0);

              return (
                <circle
                  key={slice.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 34 : 28}
                  strokeDasharray={`${gapAdjustedLength} ${Math.max(circumference - gapAdjustedLength, 0)}`}
                  strokeDashoffset={-slice.offset}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.18s ease, filter 0.18s ease',
                    filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Donut Hub (Telemetry Center) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center'
            }}
          >
            {activeChip ? (
              <>
                <div
                  style={{
                    fontSize: '26px',
                    color: '#0F172A',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {activeChip.count.toLocaleString('id-ID')}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '3px'
                  }}
                >
                  {activeChip.label} ({activeChip.pct}%)
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '28px',
                    color: '#0F172A',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {displayTotalOdp}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748B',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    marginTop: '3px'
                  }}
                >
                  TOTAL ODP
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend Interaktif Sisi Kanan */}
        <div style={{ flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={slice.label}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      color: isHovered ? '#0F172A' : '#334155',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {slice.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count.toLocaleString('id-ID')}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748B',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '38px',
                      textAlign: 'right'
                    }}
                  >
                    {slice.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/BranchRankingCard.jsx` (360 baris)

```javascript
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
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {countProj} proyek
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#64748B', 
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
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countProj} proyek
        </div>

        {/* GTM Done % */}
        <div style={{ 
          fontSize: '12.5px', 
          color: '#64748B', 
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
              cursor: 'pointer',
              padding: '4px 6px',
              fontFamily: 'inherit',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#800000';
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
        <h2 style={{ 
          fontSize: '15px', 
          color: '#475569', 
          margin: 0,
          letterSpacing: '-0.1px'
        }}>
          Ranking Branch Berdasarkan Occupancy
        </h2>
      </div>

      <div className="table-responsive-wrapper custom-table-scrollbar" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '920px' }}>
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
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap'
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
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/ExecutiveSummarySection.jsx` (514 baris)

```javascript
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
            <tr style={{ background: '#800000', color: '#FFFFFF', }}>
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
            <tr style={{ background: '#800000', color: '#FFFFFF', fontSize: '10px', }}>
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
                        <span style={{ fontSize: '11px', color: '#334155', minWidth: '32px', textAlign: 'right' }}>
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
              <tr style={{ background: '#800000', color: '#FFFFFF', borderTop: '2px solid #550000' }}>
                <td colSpan={2} style={{ padding: '11px 12px', textAlign: 'left', borderRight: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '11.5px', letterSpacing: '0.03em' }}>
                  GRAND TOTAL
                </td>
                <td style={{ padding: '11px 8px', textAlign: 'right', borderRight: '1px solid rgba(255, 255, 255, 0.2)', fontVariantNumeric: 'tabular-nums', }}>
                  <AnimatedNumber value={executiveSummary.grandTotals?.lop ?? executiveSummary.grandTotalLop} enabled={isInView} />
                </td>
                {ACT_TYPES_ORDER.map((item) => (
                  <td key={`grand-done-${item.key}`} style={{ padding: '11px 4px', borderRight: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
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
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'center'
                    }}
                  >
                    <AnimatedNumber value={(executiveSummary.grandTotals?.notYet?.[item.key]) ?? executiveSummary.grandTotalNotYet?.[item.key] ?? 0} enabled={isInView} />
                  </td>
                ))}
                <td style={{ padding: '11px 8px', textAlign: 'center', color: '#FFFFFF', }}>
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
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/ExecutiveSummaryCard.jsx` (360 baris)

```javascript
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
            fontSize: '15px', 
            color: '#475569', 
            margin: 0,
            letterSpacing: '-0.1px'
          }}>
            Executive Summary
          </h2>
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
            fontSize: '12px',
            padding: '7px 14px',
            borderRadius: '8px',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
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
            <tr style={{ background: '#0F172A', color: '#FFFFFF', }}>
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
            <tr style={{ background: '#0F172A', color: '#CBD5E1', fontSize: '11px', }}>
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
            <tr style={{ background: '#0F172A', color: '#FFFFFF', borderTop: '2px solid #0F172A' }}>
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
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/GtmExecutionInsightCard.jsx` (131 baris)

```javascript
import { memo, useMemo } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── 5 PILAR AKTIVITAS GTM CARD (SEJAJAR VERTIKAL DENGAN EXECUTIVE SUMMARY) ───
const GtmExecutionInsightCard = memo(function GtmExecutionInsightCard({
  branches = [],
  isInView = true
}) {
  // Hitung progres real 5 pilar aktivitas GTM
  const pillarStats = useMemo(() => {
    const counts = {
      tsel_menyapa: { verified: 0, pending: 0, belum: 0, total: 0 },
      branding_outlet: { verified: 0, pending: 0, belum: 0, total: 0 },
      bumdes: { verified: 0, pending: 0, belum: 0, total: 0 },
      rekrutmen_sf: { verified: 0, pending: 0, belum: 0, total: 0 },
      open_table: { verified: 0, pending: 0, belum: 0, total: 0 }
    };

    (branches || []).forEach((b) => {
      (b.projects || []).forEach((p) => {
        const acts = p.activities || [];
        const keys = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];
        keys.forEach((key) => {
          counts[key].total++;
          const act = acts.find((a) => a.type === key);
          if (act?.status === 'verified') {
            counts[key].verified++;
          } else if (act?.status === 'upload' || act?.status === 'menunggu_verifikasi') {
            counts[key].pending++;
          } else {
            counts[key].belum++;
          }
        });
      });
    });

    return [
      { key: 'tsel_menyapa', label: 'Telkomsel Menyapa', desc: 'Edukasi & penetrasi warga cluster', ...counts.tsel_menyapa },
      { key: 'branding_outlet', label: 'Branding Outlet', desc: 'Visibilitas & promosi outlet mitra', ...counts.branding_outlet },
      { key: 'bumdes', label: 'Kerjasama BUMDes', desc: 'Kemitraan badan usaha desa', ...counts.bumdes },
      { key: 'rekrutmen_sf', label: 'Rekrutmen Sales Force', desc: 'Akuisisi armada sales lapangan', ...counts.rekrutmen_sf },
      { key: 'open_table', label: 'Open Table', desc: 'Penjualan langsung on-the-spot', ...counts.open_table }
    ];
  }, [branches]);

  const totalSlots = pillarStats.reduce((acc, p) => acc + p.total, 0);
  const animTotalSlots = useCountUp(totalSlots, { enabled: isInView, duration: 800 });

  return (
    <div
      className="saas-card gtm-insight-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      {/* Header 5 Pilar Aktivitas GTM */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '8px' }}>
        <span style={{ fontSize: '15px', color: '#0F172A', letterSpacing: '-0.2px' }}>
          5 Pilar Aktivitas GTM
        </span>
        <span
          style={{
            fontSize: '12px',
            color: '#64748B',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          Total {animTotalSlots} Slot
        </span>
      </div>

      {/* 5 Pilar List terdistribusi rapi secara vertikal */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around', gap: '14px', padding: '6px 0' }}>
        {pillarStats.map((pillar) => {
          const pct = pillar.total > 0 ? Math.round((pillar.verified / pillar.total) * 100) : 0;
          return (
            <div key={pillar.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#0F172A', }}>
                  {pillar.label}
                </span>
                <span style={{ color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                  <span>
                    {pillar.verified}
                  </span>
                  /{pillar.total}{' '}
                  <span style={{ fontSize: '11px', color: '#94A3B8', }}>
                    ({pct}%)
                  </span>
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '7px',
                  borderRadius: '9999px',
                  backgroundColor: '#F1F5F9',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: '100%',
                    backgroundColor: pct >= 80 ? '#16A34A' : pct > 0 ? '#F59E0B' : '#CBD5E1',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GtmExecutionInsightCard;
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/BranchProjectsPieCard.jsx` (311 baris)

```javascript
import { useState, useMemo, useEffect, useRef } from 'react';
import { BRANCH_COLORS } from '../../utils';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.08) return '';
  // Clamp angle so it doesn't wrap around 360 awkwardly
  const safeEndAngle = sweep >= 359.99 ? startAngle + 359.99 : endAngle;
  const start = polarToCartesian(x, y, radius, safeEndAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = safeEndAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

export default function BranchProjectsPieCard({ ranking = [], branches = [], goBranch, isInView = true }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Urutan branch stabil dari master branches (urut volume terbesar keseluruhan)
  // lalu pasangkan dengan projCount dari filter aktif (ranking) agar transisi sudut pie berputar mulus
  const branchData = useMemo(() => {
    const masterList = Array.isArray(branches) && branches.length > 0 ? branches : ranking;

    const baseList = [...masterList].sort((a, b) => {
      const countA = a.projects?.length ?? a.projCount ?? 0;
      const countB = b.projects?.length ?? b.projCount ?? 0;
      return countB - countA;
    });

    return baseList.map((b) => {
      const bUpper = (b.name || '').toString().trim().toUpperCase();
      const rankedMatch = (ranking || []).find(
        (r) => (r.name || '').toString().trim().toUpperCase() === bUpper
      );
      const count = rankedMatch
        ? (rankedMatch.projCount ?? 0)
        : (b.projCount ?? (b.projects?.length || 0));
      const color = rankedMatch?.color || b.color || BRANCH_COLORS[bUpper] || '#64748B';

      return {
        name: b.name,
        count,
        color
      };
    });
  }, [ranking, branches]);

  const rawTotalProjects = useMemo(() => {
    return branchData.reduce((acc, b) => acc + (b.count || 0), 0);
  }, [branchData]);

  const safeDivisor = rawTotalProjects > 0 ? rawTotalProjects : 1;

  // Target nilai per branch untuk diinterpolasi
  const targetBranches = useMemo(() => {
    return branchData.map((b) => ({
      ...b,
      targetCount: b.count || 0,
      targetShare: rawTotalProjects > 0 ? (b.count || 0) / safeDivisor : 0
    }));
  }, [branchData, rawTotalProjects, safeDivisor]);

  // Interpolasi sudut circular (requestAnimationFrame) saat mount maupun saat ganti filter
  const currentAnimRef = useRef({});
  const [animMap, setAnimMap] = useState({});

  useEffect(() => {
    if (!isInView || targetBranches.length === 0) return;

    const startValues = {};
    targetBranches.forEach((b) => {
      const prev = currentAnimRef.current[b.name];
      startValues[b.name] = {
        count: prev ? prev.count : 0,
        share: prev ? prev.share : 0
      };
    });

    const duration = 700;
    const startTime = performance.now();
    let frameId = null;

    const tick = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Cubic ease-out untuk rotasi juring lingkaran yang halus
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      const nextMap = {};
      targetBranches.forEach((b) => {
        const s = startValues[b.name] || { count: 0, share: 0 };
        nextMap[b.name] = {
          count: s.count + (b.targetCount - s.count) * ease,
          share: s.share + (b.targetShare - s.share) * ease
        };
      });

      currentAnimRef.current = nextMap;
      setAnimMap(nextMap);

      if (rawProgress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [targetBranches, isInView]);

  // Hitung sudut startAngle, endAngle, dan path SVG pada setiap frame animasi
  const slices = useMemo(() => {
    let currentAngle = 0;
    return targetBranches.map((b) => {
      const anim = animMap[b.name] || { count: 0, share: 0 };
      const share = Math.max(anim.share, 0);
      const angle = share * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      const midAngle = (startAngle + endAngle) / 2;
      const rad = ((midAngle - 90) * Math.PI) / 180;
      const offsetX = Math.cos(rad) * 5;
      const offsetY = Math.sin(rad) * 5;

      return {
        ...b,
        count: Math.round(anim.count),
        angle,
        startAngle,
        endAngle,
        midAngle,
        offsetX,
        offsetY,
        pct: Math.round(share * 1000) / 10,
        path: describeArc(100, 100, 80, startAngle, endAngle)
      };
    });
  }, [targetBranches, animMap]);

  return (
    <div
      className="saas-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '22px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '320px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── HEADER KARTU ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
        <div style={{ fontSize: '15px', color: '#475569', letterSpacing: '-0.1px' }}>
          Sebaran Volume Proyek per Branch
        </div>

        <span
          style={{
            fontSize: '12px',
            color: '#475569'
          }}
        >
          {slices.length} Branch
        </span>
      </div>

      {/* ─── KONTEN: PIE CHART SVG (KIRI) + LEGEND PER BRANCH (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Pie Chart (~50% diperbesar dari 170px ke 255px) */}
        <div style={{ position: 'relative', width: '255px', height: '255px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="255"
            height="255"
            viewBox="0 0 200 200"
            style={{
              overflow: 'visible'
            }}
          >
            {/* Lingkaran dasar abu-abu lembut saat transisi awal atau jika total 0 */}
            <circle cx="100" cy="100" r="80" fill="#F1F5F9" />

            {slices.map((slice, idx) => {
              if (!slice.path) return null;
              const isHovered = hoveredIndex === idx;
              const isFullCircle = slice.angle >= 359.5;

              return (
                <path
                  key={slice.name}
                  d={slice.path}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth={isFullCircle ? '0' : '2'}
                  strokeLinejoin="round"
                  style={{
                    cursor: 'pointer',
                    transform: isHovered ? `translate(${slice.offsetX}px, ${slice.offsetY}px) scale(1.03)` : 'translate(0px, 0px) scale(1)',
                    transformOrigin: '100px 100px',
                    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.18s ease',
                    filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.22))' : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => {
                    if (goBranch) goBranch(slice.name);
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend Sisi Kanan (Ranking Volume Proyek) */}
        <div style={{ flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={slice.name}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  if (goBranch) goBranch(slice.name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                title={`Klik untuk melihat detail branch ${slice.name}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      color: isHovered ? '#0F172A' : '#334155',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {slice.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count} <span style={{ fontSize: '10.5px', color: '#64748B' }}>proj</span>
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748B',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '38px',
                      textAlign: 'right'
                    }}
                  >
                    {slice.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/SearchFilterToolbar.jsx` (142 baris)

```javascript
import { useState } from 'react';

// ─── TOOLBAR PENCARIAN & FILTER (HARMONIOUS PALETTE, NO ACCENT CLASH) ───
export default function SearchFilterToolbar({
  searchQuery,
  onSearchChange,
  scopeFilter,
  onScopeChange,
  branchList = []
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className="search-filter-toolbar"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${isFocused ? '#94A3B8' : '#E2E8F0'}`,
        boxShadow: 'none',
        padding: '5px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.15s ease',
        boxSizing: 'border-box'
      }}
    >
      {/* Dropdown Pemilih Cakupan Terintegrasi di Kiri */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          value={scopeFilter}
          onChange={(e) => onScopeChange(e.target.value)}
          aria-label="Pilih cakupan branch"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '7px 26px 7px 10px',
            fontSize: '12.5px',
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

      <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />

      {/* Input Teks Pencarian */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label="Cari Branch, WOK, atau Nama Proyek"
          placeholder="Cari Branch, WOK, atau Nama Proyek..."
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: '13px',
            color: '#0F172A',
            padding: '7px 0',
            }}
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Hapus kata kunci pencarian"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              marginRight: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Ikon Kaca Pembesar di Kanan (Harmonious neutral with subtle red active state) */}
      <div
        aria-hidden="true"
        style={{
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isFocused ? '#800000' : '#64748B',
          transition: 'color 0.15s ease'
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/RightWidgetPanel.jsx` (189 baris)

```javascript
import { memo } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

function MiniProgressItem({ b, index, isLast, goBranch, isInView }) {
  const isDecimal = Number(b.occRate) % 1 !== 0;
  const animDuration = 800;
  const animDelay = index * 40;
  const countOcc = useCountUp(b.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: animDuration, delay: animDelay });

  const isPositive = b.delta > 0;
  const isNegative = b.delta < 0;
  const deltaColor = isPositive ? '#16A34A' : isNegative ? '#800000' : '#64748B';
  const deltaFormatted = isPositive ? `+${b.delta}%` : `${b.delta}%`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (goBranch) goBranch(b.name);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (goBranch) goBranch(b.name);
        }
      }}
      aria-label={`Buka detail branch ${b.name}`}
      className="ranking-mini-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        padding: '12px 6px',
        borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        borderRadius: '6px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Baris 1: Rank, Nama Branch & Persentase + Trend Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', flexShrink: 0 }}>
            #{index + 1}
          </span>
          <span style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '13.5px', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
            {countOcc}%
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11.5px',
              color: deltaColor,
              fontVariantNumeric: 'tabular-nums',
              background: 'none',
              border: 'none',
              padding: 0
            }}
          >
            {isPositive ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            ) : isNegative ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#800000"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <span>{deltaFormatted}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── RIGHT WIDGET PANEL (CLEAN RANKING BRANCH) ───
export default memo(function RightWidgetPanel({
  ranking = [],
  goBranch,
  isInView = true
}) {
  const sortedBranches = Array.isArray(ranking) && ranking.length > 0
    ? [...ranking].sort((a, b) => a.occRate - b.occRate)
    : [];

  return (
    <div
      className="saas-card right-widget-panel"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Ranking Branch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', color: '#0F172A', letterSpacing: '-0.2px' }}>
          Ranking Branch
        </span>
        <span style={{ fontSize: '11px', color: '#64748B', }}>
          OCC Terendah
        </span>
      </div>

      {/* List 6 Branch Terurut OCC Terendah */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sortedBranches.length > 0 ? (
          sortedBranches.slice(0, 6).map((b, idx, arr) => (
            <MiniProgressItem
              key={b.name}
              b={b}
              index={idx}
              isLast={idx === arr.length - 1}
              goBranch={goBranch}
              isInView={isInView}
            />
          ))
        ) : (
          <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC', borderRadius: '10px' }}>
            Belum ada data peringkat branch.
          </div>
        )}
      </div>
    </div>
  );
});
```

---

## File: `gtm-monitor-frontend/src/components/dashboard/DashboardHeader.jsx` (126 baris)

```javascript
export default function DashboardHeader({
  lastUpdateFormatted,
  typeDesignFilter = 'ALL',
  setTypeDesignFilter
}) {
  const options = [
    { id: 'ALL', label: 'Semua Tipe' },
    { id: 'Greenfield', label: 'Greenfield' },
    { id: 'Brownfield', label: 'Brownfield' }
  ];

  return (
    <div
      className="page-title-header dashboard-page-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '28px',
            color: '#0F172A',
            margin: 0,
            letterSpacing: '-0.5px',
            lineHeight: 1.2
          }}
        >
          Dashboard
        </h1>
        {lastUpdateFormatted && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#64748B',
              marginTop: '6px'
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Pembaruan: {lastUpdateFormatted}</span>
          </div>
        )}
      </div>

      {setTypeDesignFilter && (
        <div
          role="radiogroup"
          aria-label="Filter Tipe Proyek"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
          }}
        >
          {options.map((f) => {
            const isActive = typeDesignFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setTypeDesignFilter(f.id)}
                style={{
                  minHeight: '38px',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#475569',
                  boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#0F172A';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/AdminHeader.jsx` (13 baris)

```javascript
// ─── 1. HEADER TITLE (MATCHING MONITORING & ACTIVITY PAGE STYLE) ───
export default function AdminHeader() {
  return (
    <div className="page-title-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '24px', color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          Administrator Control Panel
        </h1>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/AdminTabs.jsx` (34 baris)

```javascript
// ─── 3. NAVIGATION TABS (SEGMENTED PILL) ───
export default function AdminTabs() {
  return (
    <div className="admin-tabs-container" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#F1F5F9',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}
      >
        <span
          style={{
            height: '32px',
            padding: '0 16px',
            borderRadius: '6px',
            fontSize: '13px',
            background: '#FFFFFF',
            color: '#0F172A',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          Update Data Mingguan
        </span>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/AdminKpiGrid.jsx` (296 baris)

```javascript
// ─── KPI SUMMARY GRID (4 CARDS MATCHING DASHBOARD & ACTIVITY STYLE) ───
export default function AdminKpiGrid({ priorityBranches = [], stats = {}, totalProjects = 0 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
      {/* Card 1: Total Proyek Prioritas */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Total Proyek Prioritas
        </div>
        <div
          style={{
            fontSize: '48px',
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {totalProjects.toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            Proyek
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Tersebar di{' '}
          <span
            style={{
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {priorityBranches.length}
          </span>{' '}
          Branch Jateng DIY
        </div>
      </div>

      {/* Card 2: Total ODP Terpantau */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Total ODP Terpantau
        </div>
        <div
          style={{
            fontSize: '48px',
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {(stats.odpCount || 0).toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            ODP
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Kapasitas:{' '}
          <span
            style={{
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {(stats.totalPort || 0).toLocaleString('id-ID')}
          </span>
          <span style={{ color: '#64748B' }}>
            ({(stats.totalUsed || 0).toLocaleString('id-ID')} port • {stats.occRate || 0}%)
          </span>
        </div>
      </div>

      {/* Card 3: Menunggu Verifikasi */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Menunggu Verifikasi
        </div>
        <div
          style={{
            fontSize: '48px',
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {(stats.actUploaded || 0).toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            Kegiatan
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {stats.actUploaded > 0 ? 'Butuh tindakan review admin' : 'Semua kegiatan telah ditinjau'}
        </div>
      </div>

      {/* Card 4: Progress Verifikasi GTM */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Progress Verifikasi GTM
        </div>
        <div
          style={{
            fontSize: '48px',
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {(stats.actCompletionPct || 0).toLocaleString('id-ID')}%
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Terverifikasi:{' '}
          <span
            style={{
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {(stats.actVerified || 0).toLocaleString('id-ID')}
          </span>{' '}
          dari {(stats.totalActivitySlots || 0).toLocaleString('id-ID')} aktivitas
        </div>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/AdminActionHubCard.jsx` (351 baris)

```javascript
import { useState, useEffect } from 'react';

// ─── PUSAT PEMBARUAN DATABASE & PROGRAM (ACTION HUB 1 SEGMEN DENGAN TANDA HINT PANDUAN & KETENTUAN) ───
export default function AdminActionHubCard({
  onOpenModal
}) {
  const [activeHintId, setActiveHintId] = useState(null);
  const [isPinned, setIsPinned] = useState(false);

  const actions = [
    {
      id: 'odp',
      title: 'Data ODP & Kapasitas Port Mingguan',
      buttonLabel: 'Upload Data ODP',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload ODP',
        rules: [
          'Format berkas: Excel (.xlsx, .xls, .csv, maks. 25MB)',
          'Header kolom wajib: Branch, Project, WOK, ODP, Avai, Used, Total',
          'Nilai kolom port (Avai, Used, Total) berupa bilangan bulat valid (≥ 0)',
          'Dilarang menggunakan merged cells (sel gabungan) pada baris data',
          'File tidak boleh diproteksi password'
        ]
      }
    },
    {
      id: 'pairing',
      title: 'Data Tsel One Pairing Pelanggan',
      buttonLabel: 'Upload Pairing',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload Pairing',
        rules: [
          'Format berkas: Excel (.xlsx, .xls, .csv, maks. 25MB)',
          'Nama sheet baku: Unstacked_Pairing_Data (atau sheet pertama)',
          'Kolom utama wajib: bb_id, msisdn_parent, order_id, city, sto',
          'Dilarang merusak atau mengubah struktur nama kolom baku',
          'Dilarang menggunakan merged cells pada data pairing'
        ]
      }
    },
    {
      id: 'program',
      title: 'Tracking Program Bulanan (Flyer & OCR)',
      buttonLabel: 'Upload Program',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload Program',
        rules: [
          'Format berkas: Gambar (.jpg, .jpeg, .png, .webp, maks. 10MB)',
          'Pilih periode bulan & tentukan nama program yang relevan',
          'Pastikan teks pada flyer terbaca jelas agar tautan bit.ly/s.id terpindai otomatis via OCR',
          'Tautan manual dapat diisi opsional bila link tidak tertera pada flyer',
          'Dilarang mengunggah berkas non-gambar (seperti .pdf atau .xlsx)'
        ]
      }
    },
    {
      id: 'delete',
      title: 'Kelola & Hapus Program Terdaftar',
      buttonLabel: 'Kelola Program',
      isDanger: true,
      hint: {
        title: 'Ketentuan Kelola & Hapus Program',
        rules: [
          'Cakupan: Manajemen basis data materi promosi',
          'Pilih periode bulan untuk melihat daftar program aktif',
          'Opsi hapus: 1 nama program spesifik atau seluruh program pada periode terpilih',
          'Tindakan penghapusan bersifat permanen dari database & Cloudinary',
          'Konfirmasi keamanan akan muncul sebelum eksekusi dilakukan'
        ]
      }
    }
  ];

  // Penanganan klik di luar atau tombol Escape untuk menutup hint popover
  useEffect(() => {
    if (!activeHintId) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveHintId(null);
        setIsPinned(false);
      }
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-hint-wrapper]')) {
        setActiveHintId(null);
        setIsPinned(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHintId]);

  const handleToggleHint = (id) => {
    if (activeHintId === id && isPinned) {
      setActiveHintId(null);
      setIsPinned(false);
    } else {
      setActiveHintId(id);
      setIsPinned(true);
    }
  };

  const handleMouseEnter = (id) => {
    if (!isPinned) {
      setActiveHintId(id);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setActiveHintId(null);
    }
  };

  return (
    <div
      className="saas-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Segmen */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>
            Pusat Pembaruan Database &amp; Program
          </h2>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
            Pilih pembaruan data mingguan atau kelola materi program melalui jendela pop-up dialog
          </div>
        </div>
      </div>

      {/* Daftar Baris Aksi Terpadu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {actions.map((act) => (
          <div
            key={act.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '14px 20px',
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            {/* Sisi Kiri: Judul + Tanda Hint + Badge (Tanpa Icon Besar, Tanpa Subtext) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                flex: 1
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13.5px', color: '#0F172A', letterSpacing: '-0.1px' }}>
                {act.title}
              </span>

              {/* Wrapper Interaktif Tanda Hint (Hover & Click) */}
              <div
                data-hint-wrapper
                style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                onMouseEnter={() => handleMouseEnter(act.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleHint(act.id);
                  }}
                  aria-label={`Lihat panduan dan ketentuan untuk ${act.title}`}
                  title="Arahkan kursor atau klik untuk melihat panduan & ketentuan upload"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: activeHintId === act.id ? '#F1F5F9' : '#FFFFFF',
                    color: activeHintId === act.id ? '#0F172A' : '#64748B',
                    border: activeHintId === act.id ? '1px solid #0F172A' : '1px solid #CBD5E1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>

                {/* Popover Tanda Hint (Font identik dengan halaman lain, tanpa box format terpisah, tanpa link lihat panduan lengkap) */}
                {activeHintId === act.id && (
                  <div
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '0',
                      zIndex: 60,
                      width: '350px',
                      maxWidth: 'calc(100vw - 40px)',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
                      padding: '14px 16px',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-body)',
                      color: '#334155'
                    }}
                  >
                    {/* Header Hint Popover */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', color: '#0F172A', letterSpacing: '-0.2px' }}>
                        {act.hint.title}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHintId(null);
                          setIsPinned(false);
                        }}
                        aria-label="Tutup panduan"
                        style={{
                          border: 'none',
                          background: '#F1F5F9',
                          color: '#64748B',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#E2E8F0';
                          e.currentTarget.style.color = '#0F172A';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F1F5F9';
                          e.currentTarget.style.color = '#64748B';
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Ketentuan Upload Bersatu (Termasuk Format Berkas) */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#475569', lineHeight: 1.55 }}>
                      <div style={{ color: '#0F172A', marginBottom: '6px', fontSize: '12px' }}>
                        Ketentuan Upload:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {act.hint.rules.map((rule, idx) => (
                          <li key={idx} style={{ letterSpacing: '-0.1px' }}>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sisi Kanan: Tombol Sejajar Presisi (170px) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '170px' }}>
              <button
                type="button"
                onClick={() => onOpenModal(act.id)}
                style={{
                  width: '170px',
                  height: '38px',
                  borderRadius: '8px',
                  border: act.isDanger ? '1px solid #CBD5E1' : 'none',
                  background: act.isDanger ? '#FFFFFF' : '#800000',
                  color: act.isDanger ? '#0F172A' : '#FFFFFF',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: act.isDanger ? 'none' : '0 1px 2px rgba(128, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (act.isDanger) {
                    e.currentTarget.style.background = '#FEF2F2';
                    e.currentTarget.style.borderColor = '#800000';
                  } else {
                    e.currentTarget.style.background = '#660000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (act.isDanger) {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                  } else {
                    e.currentTarget.style.background = '#800000';
                  }
                }}
              >
                {act.buttonLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/MonitoringTab.jsx` (179 baris)

```javascript
import ProjectTable from '../ProjectTable';
import { formatBranch } from '../../utils';

// ─── TAB 1: MONITORING & VERIFIKASI PROYEK ───
export default function MonitoringTab({ priorityBranches, totalProjects, selectedBranch, setSelectedBranch, search, setSearch, statusFilter, setStatusFilter, isBranchDropdownOpen, setIsBranchDropdownOpen, isStatusDropdownOpen, setIsStatusDropdownOpen, statusCounts, branchesWithFilteredProjects, allProjectsMultiBranch, openModal, uploadPhoto }) {
  return (
    <div className="fade-in">
      {/* Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', position: 'relative', zIndex: 80, boxShadow: 'none' }}>
        {/* Branch Filter Capsule Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => {
              setIsBranchDropdownOpen(!isBranchDropdownOpen);
              setIsStatusDropdownOpen(false);
            }}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '50px', 
              border: '1px solid #E2E8F0', 
              fontSize: '13px', 
              background: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              minWidth: '210px', 
              userSelect: 'none' 
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748B' }}>Branch:</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', color: '#0F172A' }}>
              {selectedBranch === 'Semua Branch' 
                ? `Semua Branch (${totalProjects})` 
                : `${formatBranch(selectedBranch)} (${priorityBranches.find(x => x.name === selectedBranch)?.projects?.length || 0})`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isBranchDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '240px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
              <div 
                className={`dropdown-item ${selectedBranch === 'Semua Branch' ? 'active' : ''}`}
                onClick={() => { setSelectedBranch('Semua Branch'); setIsBranchDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', color: selectedBranch === 'Semua Branch' ? '#0F172A' : '#334155', cursor: 'pointer' }}
              >
                Semua Branch ({totalProjects})
              </div>
              {priorityBranches.map(b => (
                <div 
                  key={b.name}
                  className={`dropdown-item ${selectedBranch === b.name ? 'active' : ''}`}
                  onClick={() => { setSelectedBranch(b.name); setIsBranchDropdownOpen(false); }}
                  style={{ padding: '12px 18px', fontSize: '13px', color: selectedBranch === b.name ? '#0F172A' : '#334155', cursor: 'pointer' }}
                >
                  {formatBranch(b.name)} ({b.projects?.length || 0})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Capsule Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => {
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
              setIsBranchDropdownOpen(false);
            }}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '50px', 
              border: '1px solid #E2E8F0', 
              fontSize: '13px', 
              background: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              minWidth: '220px', 
              userSelect: 'none' 
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748B' }}>Status:</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', color: '#0F172A' }}>
              {statusFilter === 'all' 
                ? `Semua Status (${statusCounts.all})` 
                : statusFilter === 'need_review' 
                ? `Menunggu Verifikasi (${statusCounts.need_review})` 
                : statusFilter === 'verified' 
                ? `Sudah Terverifikasi (${statusCounts.verified})` 
                : `Belum Dikerjakan (${statusCounts.pending})`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isStatusDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '250px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
              <div 
                className={`dropdown-item ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('all'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', color: statusFilter === 'all' ? '#0F172A' : '#334155', cursor: 'pointer' }}
              >
                Semua Status ({statusCounts.all})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'need_review' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('need_review'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', color: statusFilter === 'need_review' ? '#0F172A' : '#334155', cursor: 'pointer' }}
              >
                Menunggu Verifikasi ({statusCounts.need_review})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'verified' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('verified'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', color: statusFilter === 'verified' ? '#0F172A' : '#334155', cursor: 'pointer' }}
              >
                Sudah Terverifikasi ({statusCounts.verified})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('pending'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', color: statusFilter === 'pending' ? '#0F172A' : '#334155', cursor: 'pointer' }}
              >
                Belum Dikerjakan ({statusCounts.pending})
              </div>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="search-container-mobile" style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Cari nama proyek, WOK, atau ODP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 20px', borderRadius: '50px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FFFFFF', outline: 'none' }}
          />
        </div>
      </div>

      {/* Project Table */}
      {branchesWithFilteredProjects.length > 0 ? (
        selectedBranch === 'Semua Branch' ? (
          <div style={{ marginBottom: '32px' }}>
            <ProjectTable 
              projects={allProjectsMultiBranch} 
              branchName="Multi Branch" 
              uploadPhoto={uploadPhoto}
              onReview={openModal}
            />
          </div>
        ) : (
          branchesWithFilteredProjects.map(b => (
            <div key={b.name} style={{ marginBottom: '32px' }}>
              <ProjectTable 
                projects={b.projects} 
                branchName={b.name} 
                uploadPhoto={uploadPhoto}
                onReview={openModal}
              />
            </div>
          ))
        )
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', color: '#64748B' }}>
          <div style={{ fontSize: '16px', color: '#0F172A' }}>Tidak ada proyek yang sesuai filter</div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Coba ganti filter branch, status verifikasi, atau kata kunci pencarian Anda.</p>
        </div>
      )}
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/OdpImportCard.jsx` (224 baris)

```javascript
// Kartu: Upload File Excel Data ODP
export default function OdpImportCard({
  file,
  setFile,
  loading,
  importProgress,
  message,
  setMessage,
  error,
  setError,
  handleFileChange,
  handleUpload,
  setActiveInfoModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload File Excel Data ODP
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('odp');
              }}
              title="Panduan & Aturan Upload Data ODP"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#800000';
                e.currentTarget.style.color = '#800000';
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Target Update:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                }}
            >
              Data ODP &amp; Port Mingguan
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: file ? '#ECFDF5' : '#F8FAFC',
                border: file ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="excel-upload-input"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Pilih File ODP</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: file ? '#0F172A' : '#94A3B8',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
              </span>

              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (setMessage) setMessage(null);
                    if (setError) setError(null);
                  }}
                  title="Hapus file"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0F172A',
                    fontSize: '15px',
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}

              <input
                id="excel-upload-input"
                type="file"
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: loading || !file ? '#E2E8F0' : '#800000',
              color: loading || !file ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? `Sedang Membaca & Memperbarui Database...${importProgress ? ` (${importProgress})` : ''}` : 'Mulai Update ODP'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/PairingImportCard.jsx` (229 baris)

```javascript
// Kartu: Upload File Excel Data Tsel One Pairing
export default function PairingImportCard({
  pairingFile,
  setPairingFile,
  pairingLoading,
  pairingProgress,
  pairingMessage,
  setPairingMessage,
  pairingError,
  setPairingError,
  handlePairingUpload,
  setActiveInfoModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload File Excel Data Tsel One Pairing
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('pairing');
              }}
              title="Panduan & Aturan Upload Pairing"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#800000';
                e.currentTarget.style.color = '#800000';
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Target Update:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                }}
            >
              Data Tsel One Pairing
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handlePairingUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: pairingFile ? '#ECFDF5' : '#F8FAFC',
                border: pairingFile ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="pairing-file-input"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Pilih File Pairing</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: pairingFile ? '#0F172A' : '#94A3B8',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {pairingFile ? `${pairingFile.name} (${(pairingFile.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
              </span>

              {pairingFile && (
                <button
                  type="button"
                  onClick={() => {
                    setPairingFile(null);
                    if (setPairingMessage) setPairingMessage(null);
                    if (setPairingError) setPairingError(null);
                  }}
                  title="Hapus file"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0F172A',
                    fontSize: '15px',
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}

              <input
                id="pairing-file-input"
                type="file"
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPairingFile(e.target.files[0]);
                    if (setPairingMessage) setPairingMessage(null);
                    if (setPairingError) setPairingError(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {pairingMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {pairingMessage}
            </div>
          )}

          {pairingError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {pairingError}
            </div>
          )}

          <button
            type="submit"
            disabled={pairingLoading || !pairingFile}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: pairingLoading || !pairingFile ? '#E2E8F0' : '#800000',
              color: pairingLoading || !pairingFile ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              cursor: pairingLoading || !pairingFile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {pairingLoading ? `Sedang Memproses Data Pairing...${pairingProgress ? ` (${pairingProgress})` : ''}` : 'Mulai Update Pairing'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/ProgramUploadCard.jsx` (360 baris)

```javascript
// Kartu: Upload Gambar Tracking Program Bulanan
export default function ProgramUploadCard({
  programFile,
  setProgramFile,
  programMonthLabel,
  setProgramMonthLabel,
  programName,
  setProgramName,
  programDetailUrl,
  setProgramDetailUrl,
  programLoading,
  programMessage,
  setProgramMessage,
  programError,
  setProgramError,
  programResultUpload,
  uploadAvailablePrograms = [],
  handleProgramUpload,
  setActiveInfoModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload Gambar Tracking Program Bulanan
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('program');
              }}
              title="Panduan & Aturan Upload Program"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.color = '#1D4ED8';
                e.currentTarget.style.background = '#EFF6FF';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              i
            </button>
          </div>

          {/* Month Selector & Program Option Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#475569', minWidth: '90px' }}>Pilih Periode:</span>
              <select
                value={programMonthLabel}
                onChange={(e) => setProgramMonthLabel(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  outline: 'none',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                <option value="Maret 2026">Maret 2026</option>
                <option value="April 2026">April 2026</option>
                <option value="Mei 2026">Mei 2026</option>
                <option value="Juni 2026">Juni 2026</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Agustus 2026">Agustus 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="Oktober 2026">Oktober 2026</option>
                <option value="November 2026">November 2026</option>
                <option value="Desember 2026">Desember 2026</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#475569', minWidth: '90px' }}>Nama Program:</span>
                <input
                  type="text"
                  placeholder="Ketikkan atau pilih nama program..."
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  list="existing-upload-programs-list"
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '12px',
                    flex: 1,
                    outline: 'none'
                  }}
                />
                <datalist id="existing-upload-programs-list">
                  {uploadAvailablePrograms.map((p, idx) => (
                    <option key={idx} value={p.sheetName || p.name} />
                  ))}
                </datalist>
              </div>

              {/* Live Indicator if Program with same name already exists in this period */}
              {(() => {
                const trimmedInput = programName.trim().replace(/\s+/g, ' ').toLowerCase();
                if (!trimmedInput) return null;
                const match = uploadAvailablePrograms.find(p => {
                  const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
                  return pName === trimmedInput;
                });
                if (!match) return null;
                const count = Array.isArray(match.images) && match.images.length > 0 ? match.images.length : (match.imageUrl ? 1 : 0);
                return (
                  <div
                    style={{
                      marginLeft: '98px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      fontSize: '11.5px',
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <span>ℹ️</span>
                    <span>
                      Program <strong>"{match.sheetName || match.name}"</strong> sudah ada ({count} slide gambar). Gambar ini akan ditambahkan sebagai <strong>Slide ke-{count + 1}</strong>.
                    </span>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', minWidth: '90px' }}>Link Manual:</span>
              <input
                type="url"
                placeholder="http://... (Opsional - biarkan kosong untuk OCR otomatis)"
                value={programDetailUrl}
                onChange={(e) => setProgramDetailUrl(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '12px',
                  flex: 1,
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handleProgramUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: programFile ? '#ECFDF5' : '#F8FAFC',
                border: programFile ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="program-image-input"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Pilih Gambar</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: programFile ? '#0F172A' : '#94A3B8',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {programFile ? `${programFile.name} (${(programFile.size / 1024).toFixed(1)} KB)` : 'Format: .jpg, .png'}
              </span>

              {programFile && (
                <button
                  type="button"
                  onClick={() => {
                    setProgramFile(null);
                    if (setProgramMessage) setProgramMessage(null);
                    if (setProgramError) setProgramError(null);
                  }}
                  title="Hapus gambar"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0F172A',
                    fontSize: '15px',
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}

              <input
                id="program-image-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onClick={(e) => { e.currentTarget.value = ''; }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setProgramFile(e.target.files[0]);
                    if (setProgramError) setProgramError(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {programMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {programMessage}
            </div>
          )}

          {programError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {programError}
            </div>
          )}

          {programResultUpload && (
            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Hasil Upload &amp; OCR Link Scan:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Status Cloudinary:</strong> <span style={{ color: '#0F172A', }}>Tersimpan</span></div>
                {programResultUpload.totalSlides > 1 && (
                  <div>
                    <strong>Status Slide:</strong>{' '}
                    <span style={{ color: '#0F172A', }}>
                      Tersimpan sebagai Slide ke-{programResultUpload.totalSlides} (Total: {programResultUpload.totalSlides} slide gambar)
                    </span>
                  </div>
                )}
                <div><strong>Hasil Scan OCR:</strong> <span style={{ color: programResultUpload.scannedLink ? '#0F172A' : '#64748B', }}>{programResultUpload.scannedLink || 'Tidak terdeteksi (Dapat diisi link manual)'}</span></div>
                {programResultUpload.detailUrl && (
                  <div style={{ marginTop: '4px' }}>
                    <a href={programResultUpload.detailUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0F172A', fontSize: '12px' }}>
                      🔗 Buka Link Detail Resmi Slide Ini →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={programLoading || !programFile}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: programLoading || !programFile ? '#E2E8F0' : '#800000',
              color: programLoading || !programFile ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              cursor: programLoading || !programFile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {programLoading ? 'Sedang Mengunggah & Memindai OCR...' : 'Mulai Upload Gambar Program'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/admin/ProgramDeleteCard.jsx` (173 baris)

```javascript
// Kartu: Kelola & Hapus Program Terdaftar
export default function ProgramDeleteCard({
  deleteProgramMonth,
  setDeleteProgramMonth,
  deleteProgramTarget,
  setDeleteProgramTarget,
  deleteAvailablePrograms = [],
  deleteLoading,
  deleteMessage,
  setDeleteMessage,
  deleteError,
  setDeleteError,
  setShowDeleteConfirmModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', letterSpacing: '-0.2px', color: '#0F172A', margin: '0' }}>
              Hapus Program Terdaftar
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Status Periode:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                background: deleteAvailablePrograms.length > 0 ? '#ECFDF5' : '#F1F5F9',
                border: deleteAvailablePrograms.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                color: deleteAvailablePrograms.length > 0 ? '#0F172A' : '#64748B',
                fontSize: '12.5px',
                }}
            >
              {deleteAvailablePrograms.length > 0 ? `${deleteAvailablePrograms.length} Program Ditemukan` : 'Tidak Ada Program'}
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {/* Select Month */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#334155' }}>1. Pilih Periode Bulan:</label>
              <select
                value={deleteProgramMonth}
                onChange={(e) => {
                  setDeleteProgramMonth(e.target.value);
                  setDeleteProgramTarget('ALL');
                  if (setDeleteMessage) setDeleteMessage(null);
                  if (setDeleteError) setDeleteError(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Maret 2026">Maret 2026</option>
                <option value="April 2026">April 2026</option>
                <option value="Mei 2026">Mei 2026</option>
                <option value="Juni 2026">Juni 2026</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Agustus 2026">Agustus 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="Oktober 2026">Oktober 2026</option>
                <option value="November 2026">November 2026</option>
                <option value="Desember 2026">Desember 2026</option>
              </select>
            </div>

            {/* Select Program Option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#334155' }}>2. Pilih Opsi Program yang Ingin Dihapus:</label>
              <select
                value={deleteProgramTarget}
                onChange={(e) => {
                  setDeleteProgramTarget(e.target.value);
                  if (setDeleteMessage) setDeleteMessage(null);
                  if (setDeleteError) setDeleteError(null);
                }}
                disabled={deleteAvailablePrograms.length === 0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: deleteAvailablePrograms.length === 0 ? '#F1F5F9' : '#FFFFFF',
                  color: deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#0F172A',
                  fontSize: '12.5px',
                  outline: 'none',
                  cursor: deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="ALL">Seluruh Program di Periode Ini ({deleteAvailablePrograms.length} Program)</option>
                {deleteAvailablePrograms.map((p, idx) => (
                  <option key={idx} value={p.sheetName || p.name}>
                    Hanya: {p.sheetName || p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {deleteMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {deleteMessage}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {deleteError}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            disabled={deleteLoading || deleteAvailablePrograms.length === 0}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: deleteLoading || deleteAvailablePrograms.length === 0 ? '#E2E8F0' : '#DC2626',
              color: deleteLoading || deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              cursor: deleteLoading || deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>{deleteLoading ? 'Memproses Hapus...' : 'Hapus Program'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

