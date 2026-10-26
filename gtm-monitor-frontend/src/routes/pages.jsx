// Halaman-halaman rute: menghubungkan URL & data (TanStack Query, lewat AppLayout) ke komponen tampilan
import { useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router';
import LandingPage from '../components/LandingPage';
import LoginPage from '../components/Auth/LoginPage';
import Dashboard from '../components/Dashboard';
import BranchView from '../components/BranchView';
import UploadView from '../components/UploadView';
import AdminPanel from '../components/AdminPanel';
import { useAuth } from '../auth/AuthContext';
import { useOdpSummary } from '../hooks/useOdpSummary';
import { useGtmMonitoring } from '../hooks/useGtmMonitoring';
import { useActivityActions } from '../hooks/useActivityActions';
import { PATHS } from './paths';

export function LandingRoute() {
  const navigate = useNavigate();
  return (
    <LandingPage
      onLoginClick={() => navigate(PATHS.login)}
      onExplore={() => navigate(PATHS.login)}
    />
  );
}

export function LoginRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();
  return (
    <LoginPage
      onLoginSuccess={(loggedInUser, expiresAt) => {
        login(loggedInUser, expiresAt);
      }}
      onBackToLanding={() => navigate(PATHS.landing)}
    />
  );
}

export function DashboardRoute() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { branches, importMeta, typeDesignFilter, setTypeDesignFilter } = useOutletContext();
  const { kpi, statusChips } = useOdpSummary(branches, importMeta, typeDesignFilter);
  const ranking = useGtmMonitoring(branches, typeDesignFilter);

  // Detail branch hanya untuk Admin (akun branch tetap di Dashboard)
  const goBranch = useCallback((name) => {
    if (!isAdmin) return;
    navigate(PATHS.branch(name));
  }, [isAdmin, navigate]);

  return (
    <Dashboard
      branches={branches}
      goBranch={goBranch}
      kpi={kpi}
      importMeta={importMeta}
      statusChips={statusChips}
      ranking={ranking}
      typeDesignFilter={typeDesignFilter}
      setTypeDesignFilter={setTypeDesignFilter}
    />
  );
}

export function BranchRoute() {
  const navigate = useNavigate();
  const { branchName } = useParams();
  const { isAdmin } = useAuth();
  const { branches } = useOutletContext();
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();
  const goDashboard = useCallback(() => navigate(PATHS.dashboard), [navigate]);

  return (
    <BranchView
      branches={branches}
      activeBranch={branchName}
      goDashboard={goDashboard}
      uploadPhoto={uploadPhoto}
      verifyActivity={isAdmin ? verifyActivity : null}
      rejectActivity={isAdmin ? rejectActivity : null}
      deletePhoto={deletePhoto}
    />
  );
}

export function UploadRoute() {
  const { user, isAdmin } = useAuth();
  const { branches } = useOutletContext();
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();

  // Untuk halaman Upload Activity: Akun User (Non-Admin) HANYA menerima data branch tempat ia bertugas
  const uploadBranches = useMemo(() => {
    if (user && user.role === 'USER' && user.branchName) {
      const filtered = branches.filter(b => b.name === user.branchName);
      return filtered.length > 0 ? filtered : branches;
    }
    return branches;
  }, [branches, user]);

  return (
    <UploadView
      branches={uploadBranches}
      initialBranch={null}
      uploadPhoto={uploadPhoto}
      verifyActivity={isAdmin ? verifyActivity : null}
      rejectActivity={isAdmin ? rejectActivity : null}
      deletePhoto={deletePhoto}
    />
  );
}

export function AdminRoute() {
  const { branches, refreshMonitoring } = useOutletContext();
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();
  return (
    <AdminPanel
      branches={branches}
      onUpdate={refreshMonitoring}
      verifyActivity={verifyActivity}
      rejectActivity={rejectActivity}
      uploadPhoto={uploadPhoto}
      deletePhoto={deletePhoto}
    />
  );
}
