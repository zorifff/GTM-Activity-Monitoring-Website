import { useState, useEffect, useCallback, useRef } from 'react';
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

  const contentAreaRef = useRef(null);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    setShowProfileModal(false);
    setShowLogoutConfirmModal(false);
  }, [user]);

  useEffect(() => {
    const target = LEGACY_HASH_PATHS[location.hash.toLowerCase()];
    if (target) navigate(target, { replace: true });
  }, [location.hash, navigate]);

  // Scroll spy untuk menentukan section mana yang sedang aktif saat halaman continuous di-scroll
  useEffect(() => {
    if (view !== 'dashboard') return;

    const container = contentAreaRef.current;
    if (!container) return;

    const handleScroll = () => {
      const activityEl = document.getElementById('activity-section');
      if (!activityEl) return;

      const rect = activityEl.getBoundingClientRect();
      // Bila batas atas section Activity berada di posisi 200px dari atas viewport (di bawah header 64px)
      if (rect.top <= 200) {
        setActiveSection('activity');
      } else {
        setActiveSection('dashboard');
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [view]);

  // Auto-scroll saat pertama kali membuka tautan ber-hash #activity
  useEffect(() => {
    if (view === 'dashboard' && location.hash === '#activity') {
      const timer = setTimeout(() => {
        const el = document.getElementById('activity-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection('activity');
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [view, location.hash]);

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
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById('dashboard-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (window.location.hash) {
        window.history.replaceState(null, '', '/dashboard');
      }
      setActiveSection('dashboard');
    } else {
      navigate(PATHS.dashboard);
    }
  }, [user, view, navigate]);

  const goUpload = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (view === 'dashboard') {
      const el = document.getElementById('activity-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', '/dashboard#activity');
        setActiveSection('activity');
      }
    } else {
      navigate('/dashboard#activity');
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

    if (view === 'dashboard') {
      const el = document.getElementById('activity-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `/dashboard?project=${encodeURIComponent(item.projectName)}#activity`);
        setActiveSection('activity');
      }
    } else {
      navigate(`/dashboard?project=${encodeURIComponent(item.projectName)}#activity`);
    }

    // Trigger custom event untuk UploadView
    window.dispatchEvent(new CustomEvent('gtm-focus-project', {
      detail: {
        projectName: item.projectName,
        branchName: item.branchName
      }
    }));
  }, [view, navigate]);

  if (!authChecked || isInitialLoading) {
    return <LoadingScreen />;
  }

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
    </div>
  );
}
