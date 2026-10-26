// Kerangka aplikasi untuk semua halaman: navigasi atas, modal global (program, profil, logout, sesi berakhir)
// & area konten (<Outlet />). Halaman ditentukan React Router (lihat App.jsx).
import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import LoginPage from '../components/Auth/LoginPage';
import ProgramViewerModal from '../components/ProgramViewerModal';
import LoadingScreen from '../components/layout/LoadingScreen';
import TopNav from '../components/layout/TopNav';
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
    <div className={`app-root-container ${isFullPage ? 'app-root-no-nav' : ''}`}>
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

      {!isFullPage && (
        <TopNav
          view={view}
          user={user}
          isAdmin={isAdmin}
          layoutVersion={branches}
          goDashboard={goDashboard}
          goUpload={goUpload}
          goAdmin={goAdmin}
          onLoginClick={() => navigate(PATHS.login)}
          setShowLoginModal={setShowLoginModal}
          showProfileModal={showProfileModal}
          setShowProfileModal={setShowProfileModal}
          dynamicMonthsData={dynamicMonthsData}
          setActiveProgramModal={setActiveProgramModal}
        />
      )}

      {/* Main Content View Switcher */}
      <div className={isFullPage ? 'main-content-full' : 'main-content'}>
        <div className="fade-in" key={view}>
          <Outlet context={{ branches, importMeta, typeDesignFilter, setTypeDesignFilter, refreshMonitoring: refresh, invalidatePrograms }} />
        </div>
      </div>

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
