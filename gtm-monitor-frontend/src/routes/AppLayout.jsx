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
                  overflowX: 'hidden',
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
                    minWidth: 0,
                    maxWidth: '100%',
                    overflowX: 'hidden',
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
