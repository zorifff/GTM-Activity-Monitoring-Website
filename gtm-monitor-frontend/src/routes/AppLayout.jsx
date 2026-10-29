// Kerangka aplikasi untuk semua halaman: persistent dark sidebar, top header bar, modal global
// & area konten (<Outlet />). Mengadopsi arsitektur modern SaaS (Pagescreen layout).
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import LoginPage from '../components/Auth/LoginPage';
import ProgramViewerModal from '../components/ProgramViewerModal';
import LoadingScreen from '../components/layout/LoadingScreen';
import AppSidebar from '../components/layout/AppSidebar';
import TopHeaderBar from '../components/layout/TopHeaderBar';
import ProfileMenu from '../components/layout/ProfileMenu';
import LogoutConfirmModal from '../components/layout/LogoutConfirmModal';
import SessionExpiredModal from '../components/layout/SessionExpiredModal';
import { useAuth } from '../auth/AuthContext';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { useProgramMonths, useInvalidatePrograms } from '../hooks/usePrograms';
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
  const [activeProgramModal, setActiveProgramModal] = useState(null); // { program, monthLabel }
  const [typeDesignFilter, setTypeDesignFilter] = useState('ALL'); // ALL, Greenfield, Brownfield
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Menu profil & konfirmasi logout selalu tertutup saat akun berganti (login / logout)
  useEffect(() => {
    setShowProfileModal(false);
    setShowLogoutConfirmModal(false);
  }, [user]);

  // Link lama berbasis hash (#dashboard, #upload, #admin, …) dialihkan ke alamat baru
  useEffect(() => {
    const target = LEGACY_HASH_PATHS[location.hash.toLowerCase()];
    if (target) navigate(target, { replace: true });
  }, [location.hash, navigate]);

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
    navigate(PATHS.dashboard);
  }, [user, navigate]);

  const goUpload = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    navigate(PATHS.upload);
  }, [user, navigate]);

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

  // Derive pending verification count
  const pendingCount = useMemo(() => {
    const count = (branches || []).reduce((acc, b) => {
      return acc + (b.projects || []).reduce((pAcc, p) => {
        return pAcc + (p.activities || []).filter(a => a.status === 'need_review' || a.status === 'pending').length;
      }, 0);
    }, 0);
    return count;
  }, [branches]);

  // 1. Loading screen (juga selama status login masih dicek ke server)
  if (!authChecked || isInitialLoading) {
    return <LoadingScreen />;
  }

  // 2. Login Modal Overlay (when triggered by user)
  const renderLoginModal = () => {
    if (!showLoginModal) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#ffffff', overflowY: 'auto' }}>
        <LoginPage
          onLoginSuccess={(loggedInUser, expiresAt) => {
            login(loggedInUser, expiresAt);
            setShowLoginModal(false);
          }}
          onBackToLanding={() => setShowLoginModal(false)}
        />
      </div>
    );
  };

  const isFullPage = view === 'landing' || view === 'login' || view === null;

  return (
    <div className={`saas-app-root ${isFullPage ? 'app-root-fullpage' : 'app-root-saas'}`}>
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
        // Fullpage route (Landing / Login)
        <div className="main-content-full">
          <Outlet context={{ branches, importMeta, typeDesignFilter, setTypeDesignFilter, refreshMonitoring: refresh, invalidatePrograms }} />
        </div>
      ) : (
        // SaaS Multi-Section Shell: Persistent Dark Navy Sidebar + Content Area
        <div
          className="saas-shell"
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            minHeight: '100dvh',
            maxHeight: '100dvh',
            width: '100%',
            background: '#F8FAFC',
            overflow: 'hidden'
          }}
        >
          {/* Top Header Bar Ramping (Full width spanning to far left above sidebar) */}
          <TopHeaderBar
            user={user}
            isAdmin={isAdmin}
            onLoginClick={() => navigate(PATHS.login)}
            handleLogout={handleLogout}
            typeDesignFilter={typeDesignFilter}
            setTypeDesignFilter={setTypeDesignFilter}
            goDashboard={goDashboard}
            goUpload={goUpload}
            goAdmin={goAdmin}
            pendingCount={pendingCount}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          {/* Body Flex Row: Red Sidebar (Left) + Content Area (Right) */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              width: '100%',
              overflow: 'hidden'
            }}
          >
            {/* 1. Sidebar Navigasi Kiri Tetap (Solid Telkomsel Red #C8102E, w-64) */}
            <AppSidebar
              user={user}
              isAdmin={isAdmin}
              goDashboard={goDashboard}
              goUpload={goUpload}
              goAdmin={goAdmin}
              onLoginClick={() => navigate(PATHS.login)}
              setShowLoginModal={setShowLoginModal}
              dynamicMonthsData={dynamicMonthsData}
              setActiveProgramModal={setActiveProgramModal}
              isMobileOpen={isMobileSidebarOpen}
              setIsMobileOpen={setIsMobileSidebarOpen}
            />

            {/* 2. Area Konten Kanan: Latar belakang abu-abu sangat muda/bersih (#f8fafc), scrollable */}
            <div
              className="saas-content-area"
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#F8FAFC',
                overflowY: 'auto'
              }}
            >
              {/* Scrollable Main Body Content */}
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
    </div>
  );
}
