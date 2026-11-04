# Bundle 2: Halaman Utama (Views / Pages)

> Berisi seluruh komponen tampilan utama (Dashboard, Upload/Activity, Branch Detail, Admin Panel, Auth Login, dan Landing Overview).

**Daftar Berkas Terlampir (8 berkas):**

- `gtm-monitor-frontend/src/routes/pages.jsx` (139 baris)
- `gtm-monitor-frontend/src/components/Dashboard.jsx` (179 baris)
- `gtm-monitor-frontend/src/components/UploadView.jsx` (860 baris)
- `gtm-monitor-frontend/src/components/BranchView.jsx` (480 baris)
- `gtm-monitor-frontend/src/components/AdminPanel.jsx` (91 baris)
- `gtm-monitor-frontend/src/components/LandingPage.jsx` (230 baris)
- `gtm-monitor-frontend/src/components/Auth/LoginModal.jsx` (504 baris)
- `gtm-monitor-frontend/src/components/Auth/TurnstileWidget.jsx` (74 baris)

**Total Baris Kode**: 2.542 baris

---

## File: `gtm-monitor-frontend/src/routes/pages.jsx` (139 baris)

```javascript
// Halaman-halaman rute: menghubungkan URL & data (TanStack Query, lewat AppLayout) ke komponen tampilan
import { useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router';
import LandingPage from '../components/LandingPage';
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
  const { login } = useAuth();
  return (
    <LandingPage
      initialLoginOpen={false}
      onLoginSuccess={(loggedInUser, expiresAt) => {
        login(loggedInUser, expiresAt);
      }}
    />
  );
}

export function LoginRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();
  return (
    <LandingPage
      initialLoginOpen={true}
      onLoginSuccess={(loggedInUser, expiresAt) => {
        login(loggedInUser, expiresAt);
      }}
      onCloseLoginRoute={() => navigate(PATHS.landing, { replace: true })}
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
    <section id="dashboard-section" style={{ scrollMarginTop: '80px' }}>
      <Dashboard
        branches={branches}
        goBranch={goBranch}
        kpi={kpi}
        importMeta={importMeta}
        statusChips={statusChips}
        ranking={ranking}
        typeDesignFilter={typeDesignFilter}
        setTypeDesignFilter={setTypeDesignFilter}
        isAdmin={isAdmin}
      />
    </section>
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
    <section id="branch-section" style={{ scrollMarginTop: '80px' }}>
      <BranchView
      branches={branches}
      activeBranch={branchName}
      goDashboard={goDashboard}
      uploadPhoto={uploadPhoto}
      verifyActivity={isAdmin ? verifyActivity : null}
      rejectActivity={isAdmin ? rejectActivity : null}
      deletePhoto={deletePhoto}
      />
    </section>
  );
}

export function UploadRoute() {
  const { user, isAdmin } = useAuth();
  const { branches } = useOutletContext();
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();

  // Akun User (Non-Admin) HANYA menerima data branch tempat ia bertugas
  const uploadBranches = useMemo(() => {
    if (user && user.role === 'USER' && user.branchName) {
      const filtered = branches.filter(b => b.name === user.branchName);
      return filtered.length > 0 ? filtered : branches;
    }
    return branches;
  }, [branches, user]);

  return (
    <section id="activity-section" style={{ scrollMarginTop: '80px' }}>
      <UploadView
        branches={uploadBranches}
        initialBranch={null}
        uploadPhoto={uploadPhoto}
        verifyActivity={isAdmin ? verifyActivity : null}
        rejectActivity={isAdmin ? rejectActivity : null}
        deletePhoto={deletePhoto}
        isAdmin={isAdmin}
      />
    </section>
  );
}

export function AdminRoute() {
  const { branches, refreshMonitoring } = useOutletContext();
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();
  return (
    <section id="admin-section" style={{ scrollMarginTop: '80px' }}>
      <AdminPanel
        branches={branches}
        onUpdate={refreshMonitoring}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        uploadPhoto={uploadPhoto}
        deletePhoto={deletePhoto}
      />
    </section>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/Dashboard.jsx` (179 baris)

```javascript
import { memo, useState } from 'react';
import HeroOccupancyCard from './dashboard/HeroOccupancyCard';
import RegionalMetricsSummaryCard from './dashboard/RegionalMetricsSummaryCard';
import PortDistributionChartCard from './dashboard/PortDistributionChartCard';
import OdpStatusDonutCard from './dashboard/OdpStatusDonutCard';
import BranchProjectsPieCard from './dashboard/BranchProjectsPieCard';
import ExecutiveSummarySection from './dashboard/ExecutiveSummarySection';
import RightWidgetPanel from './dashboard/RightWidgetPanel';
import GtmExecutionInsightCard from './dashboard/GtmExecutionInsightCard';
import { useInView } from '../hooks/useInView';

// ─── HALAMAN MONITORING (DASHBOARD) SAAS TOTAL REDESIGN ───
const Dashboard = memo(function Dashboard({
  branches,
  goBranch,
  kpi,
  statusChips,
  ranking,
  isAdmin
}) {
  // In-view observer triggers for smooth entry animations
  const [refTopRow, inViewTopRow] = useInView({ threshold: 0.1, triggerOnce: true });
  const [refChartsRow, inViewChartsRow] = useInView({ threshold: 0.08, triggerOnce: true });
  const [refBottomGrid, inViewBottomGrid] = useInView({ threshold: 0.08, triggerOnce: true });

  // Search & Scope Filter State
  const [scopeFilter, setScopeFilter] = useState('ALL');

  const safeKpi = kpi || {
    occRate: 0,
    totalUsed: 0,
    totalPort: 0,
    totalAvai: 0,
    odpCount: 0,
    actCompletionPct: 0,
    actVerified: 0,
    actUploaded: 0,
    actPending: 0,
    actBelum: 0,
    gapWoW: null
  };
  const safeStatusChips = statusChips || [];
  const safeRanking = ranking || [];

  // Handle Review Branch priority action
  const handleReviewPriority = () => {
    // Purwokerto is lowest occupancy branch in Jateng & DIY
    if (goBranch) {
      goBranch('Purwokerto');
    }
  };

  return (
    <div
      className="dashboard-saas-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        padding: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* ─── BARIS ATAS (ROW 1): HERO OKUPANSI + SECTION 1 (METRIK UTAMA REGIONAL) ─── */}
      <section
        ref={refTopRow}
        id="top-analytics-row"
        aria-label="Overview Metrik Regional"
        className="dashboard-top-row"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          alignItems: 'stretch',
          width: '100%'
        }}
      >
        {/* A. Hero Card Kiri (Okupansi Regional Jateng & DIY) */}
        <HeroOccupancyCard
          safeKpi={safeKpi}
          onReviewBranch={handleReviewPriority}
          isAdmin={isAdmin}
          isInView={inViewTopRow}
        />

        {/* B. Section 1: Port Tersedia, Total ODP Terpantau, Verifikasi Kegiatan */}
        <RegionalMetricsSummaryCard
          safeKpi={safeKpi}
          safeStatusChips={safeStatusChips}
          isInView={inViewTopRow}
        />
      </section>

      {/* ─── BARIS TENGAH (ROW 2): SECTION 2 (DISTRIBUSI UTILISASI PORT PER BRANCH & WOK) ─── */}
      <section
        id="port-distribution-row"
        aria-label="Distribusi Utilisasi Kapasitas Port per Branch dan WOK"
        style={{ width: '100%' }}
      >
        <PortDistributionChartCard
          ranking={safeRanking}
          branches={branches}
          isInView={inViewTopRow}
          onSelectBranch={(branchName) => {
            if (goBranch) goBranch(branchName);
          }}
        />
      </section>

      {/* ─── BARIS ANALITIK PROPORSI (ROW 3: DONUT STATUS ODP & PIE SEBARAN PROYEK) ─── */}
      <section
        ref={refChartsRow}
        id="distribution-charts-row"
        aria-label="Distribusi Kategori ODP dan Sebaran Proyek per Branch"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          width: '100%'
        }}
      >
        <OdpStatusDonutCard
          statusChips={safeStatusChips}
          totalOdp={safeKpi.odpCount}
          isInView={inViewChartsRow}
        />
        <BranchProjectsPieCard
          ranking={safeRanking}
          branches={branches}
          goBranch={goBranch}
          isInView={inViewChartsRow}
        />
      </section>

      {/* ─── GRID BAWAH TERBAGI DUA KOLOM (ROW 4: MAIN CONTENT VS SIDEBAR WIDGET) ─── */}
      <section
        ref={refBottomGrid}
        id="bottom-content-grid"
        aria-label="Matriks Executive Summary dan Ranking Branch"
        className="dashboard-bottom-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '20px',
          alignItems: 'stretch',
          width: '100%'
        }}
      >
        {/* Kolom Kiri (~68%): Matriks Executive Summary */}
        <div style={{ minWidth: 0, height: '100%' }}>
          <ExecutiveSummarySection
            branches={branches}
            scopeFilter={scopeFilter}
            onScopeChange={setScopeFilter}
            branchList={safeRanking}
            isInView={inViewBottomGrid}
          />
        </div>

        {/* Kolom Kanan (~32%): Ranking Branch + 5 Pilar Aktivitas GTM */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          <RightWidgetPanel
            ranking={safeRanking}
            goBranch={goBranch}
            isInView={inViewBottomGrid}
          />
          <GtmExecutionInsightCard
            branches={branches}
            isInView={inViewBottomGrid}
          />
        </div>
      </section>
    </div>
  );
});

export default Dashboard;
```

---

## File: `gtm-monitor-frontend/src/components/UploadView.jsx` (860 baris)

```javascript
import { useState, useEffect, useMemo, useRef, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch, computeStats, exportProjectsToExcel } from '../utils';

const STATUS_OPTIONS = ['Belum Ada', 'Review', 'Selesai'];

// Helper: Cek apakah sebuah proyek memenuhi kriteria status tertentu
const projectMatchesStatus = (p, statusKey) => {
  const acts = p.activities || [];
  if (statusKey === 'Review') {
    return acts.some(a => 
      a.status === 'upload' || 
      a.status === 'need_review' || 
      a.status === 'pending' ||
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'upload' || ph.status === 'need_review'))
    );
  }
  if (statusKey === 'Selesai') {
    return acts.some(a => 
      a.status === 'verified' || 
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'verified'))
    );
  }
  if (statusKey === 'Belum Ada') {
    const hasReview = acts.some(a => 
      a.status === 'upload' || 
      a.status === 'need_review' || 
      a.status === 'pending' ||
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'upload' || ph.status === 'need_review'))
    );
    const hasVerified = acts.some(a => 
      a.status === 'verified' || 
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'verified'))
    );
    return !hasReview && !hasVerified;
  }
  return false;
};

// UploadView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const UploadView = memo(function UploadView({ branches, initialBranch, verifyActivity, rejectActivity, uploadPhoto, deletePhoto, isAdmin = false }) {
  // Halaman Upload Activity Wajib difilter: OCC < 35%, ODP > 1, DAN Type Design === Greenfield
  const priorityBranches = useMemo(() => {
    return (Array.isArray(branches) ? branches : []).map(b => ({
      ...b,
      projects: (b.projects || []).filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      })
    })).filter(b => b.projects && b.projects.length > 0);
  }, [branches]);

  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (priorityBranches?.length === 1) return priorityBranches[0].name;
    return initialBranch || 'Semua Branch';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(STATUS_OPTIONS);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Jika akun user biasa hanya memiliki akses 1 branch, kunci selectedBranch ke branch tersebut
  useEffect(() => {
    if (priorityBranches?.length === 1 && selectedBranch !== priorityBranches[0].name) {
      setSelectedBranch(priorityBranches[0].name);
    }
  }, [priorityBranches, selectedBranch]);

  // ─── FOCUS PROJECT DARI NOTIFIKASI TOP BAR ───
  useEffect(() => {
    const focusTargetProject = (targetProject, targetBranch) => {
      if (!targetProject) return;
      if (targetBranch && (!initialBranch || priorityBranches?.length > 1)) {
        setSelectedBranch(targetBranch);
      }
      setSearch(targetProject);
      setSelectedStatuses(STATUS_OPTIONS);
      const el = document.getElementById('activity-section');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    };

    const handleFocusEvent = (e) => {
      const { projectName, branchName } = e.detail || {};
      focusTargetProject(projectName, branchName);
    };

    window.addEventListener('gtm-focus-project', handleFocusEvent);

    try {
      const params = new URLSearchParams(window.location.search);
      const qProject = params.get('project');
      if (qProject) {
        focusTargetProject(qProject);
      }
    } catch {
      // ignore
    }

    return () => window.removeEventListener('gtm-focus-project', handleFocusEvent);
  }, [initialBranch, priorityBranches]);

  // 1. Filter Branches based on dropdown
  const totalProjects = useMemo(() => priorityBranches.reduce((s, b) => s + (b.projects?.length || 0), 0), [priorityBranches]);

  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return priorityBranches;
    return priorityBranches.filter(b => b.name === selectedBranch);
  }, [priorityBranches, selectedBranch]);

  // 2. Compute dynamic stats (KPI) for the selected branch filter
  const stats = useMemo(() => computeStats(filteredBranches), [filteredBranches]);
  const totalProjectsInFilter = useMemo(() => {
    return filteredBranches.reduce((s, b) => s + (b.projects?.length || 0), 0);
  }, [filteredBranches]);

  // Hitung jumlah proyek per status pada branch yang sedang terpilih
  const statusCounts = useMemo(() => {
    let belumAda = 0;
    let review = 0;
    let selesai = 0;

    filteredBranches.forEach(b => {
      (b.projects || []).forEach(p => {
        if (projectMatchesStatus(p, 'Belum Ada')) belumAda++;
        if (projectMatchesStatus(p, 'Review')) review++;
        if (projectMatchesStatus(p, 'Selesai')) selesai++;
      });
    });

    return {
      'Belum Ada': belumAda,
      'Review': review,
      'Selesai': selesai
    };
  }, [filteredBranches]);

  const isStatusFiltered = isAdmin && selectedStatuses.length < STATUS_OPTIONS.length;

  // Hitung jumlah proyek yang memenuhi filter status pada branch yang sedang terpilih
  const statusMatchingProjectsCount = useMemo(() => {
    if (!isStatusFiltered) return totalProjectsInFilter;
    if (selectedStatuses.length === 0) return 0;
    return filteredBranches.reduce((count, b) => {
      return count + (b.projects || []).filter(p => selectedStatuses.some(st => projectMatchesStatus(p, st))).length;
    }, 0);
  }, [filteredBranches, isStatusFiltered, selectedStatuses, totalProjectsInFilter]);

  // 3. Filter Projects within those branches based on search text & status checkbox
  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      let projs = b.projects.filter(p => 
        !s || 
        p.name.toLowerCase().includes(s) || 
        (p.wok && p.wok.toLowerCase().includes(s)) ||
        (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
      );

      // Filter khusus Admin berdasarkan checkbox status
      if (isStatusFiltered) {
        projs = projs.filter(p => {
          if (selectedStatuses.length === 0) return false;
          return selectedStatuses.some(st => projectMatchesStatus(p, st));
        });
      }

      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search, isStatusFiltered, selectedStatuses]);

  // 4. Memoize multi-branch flatMap so a new array reference isn't created on every render
  const allProjectsMultiBranch = useMemo(() => {
    return branchesWithFilteredProjects.flatMap(b => b.projects.map(p => ({ ...p, branchName: b.name })));
  }, [branchesWithFilteredProjects]);

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey) {
    const [bName, pName] = modalKey.split('||');
    const b = branches.find(x => x.name === bName);
    const p = b?.projects.find(x => x.name === pName);
    if (p) {
      const totalAvai = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalUsed = p.odps.reduce((s, o) => s + o.used, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);

      modalData = {
        bName, pName, wok: p.wok,
        projectId: p.id,
        odps: p.odps,
        totalAvai, totalUsed, totalPort,
        odpCount: p.odps.length,
        activities: p.activities || []
      };
    }
  }

  const branchDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  // Keyboard Escape and click-outside listener for branch dropdown (R-32)
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Keyboard Escape and click-outside listener for status filter dropdown
  useEffect(() => {
    if (!isStatusDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStatusDropdownOpen]);

  const usedPct = useMemo(() => {
    return stats.totalPort > 0 ? (stats.totalUsed / stats.totalPort) * 100 : 0;
  }, [stats.totalUsed, stats.totalPort]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      

      {/* ─── 2. KPI SUMMARY GRID (3 CARDS MATCHING DASHBOARD METRICS STYLE) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Port Tersedia */}
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
            {stats.totalAvai.toLocaleString('id-ID')}
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
              {stats.totalPort.toLocaleString('id-ID')}
            </span>
            <span style={{ marginLeft: '6px', color: '#64748B' }}>
              ({stats.totalUsed.toLocaleString('id-ID')} terpakai • {usedPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
            </span>
          </div>
        </div>

        {/* Card 2: Cakupan Proyek & ODP */}
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
            Cakupan Proyek & ODP
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
            {totalProjectsInFilter.toLocaleString('id-ID')}
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
            Mencakup{' '}
            <span
              style={{
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                margin: '0 4px'
              }}
            >
              {stats.odpCount.toLocaleString('id-ID')}
            </span>{' '}
            total titik ODP prioritas
          </div>
        </div>

        {/* Card 3: Aktivitas GTM Selesai */}
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
            Aktivitas GTM Selesai
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
            {stats.actCompletionPct.toLocaleString('id-ID')}%
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
                marginLeft: '4px'
              }}
            >
              {stats.actVerified.toLocaleString('id-ID')}
            </span>
            <span style={{ marginLeft: '4px', color: '#64748B' }}>
              dari {stats.totalActivitySlots.toLocaleString('id-ID')} aktivitas
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. CONTROLS BAR (FILTER BRANCH, SEARCH, & EXPORT EXCEL) ─── */}
      <div className="controls-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
        {/* Branch Dropdown */}
        {branches.length === 1 ? (
          <div className="branch-filter-capsule" style={{ height: '42px', minWidth: 'auto', border: '1px solid #CBD5E1', color: '#0F172A', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', background: '#FFFFFF', boxSizing: 'border-box' }}>
            <span className="branch-text-label" style={{ fontSize: '13px' }}>Branch: {formatBranch(branches[0].name)}</span>
          </div>
        ) : (
          <div ref={branchDropdownRef} style={{ position: 'relative' }}>
            <button 
              type="button"
              className="branch-filter-capsule"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              aria-label="Pilih filter branch"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                height: '42px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderRadius: '10px',
                minWidth: '220px',
                gap: '10px',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
            >
              <span className="branch-text-label" style={{ flex: 1, color: '#0F172A', fontSize: '13px' }}>
                {selectedBranch === 'Semua Branch' 
                  ? `Semua Branch (${totalProjects})` 
                  : `${formatBranch(selectedBranch)} (${priorityBranches.find(x => x.name === selectedBranch)?.projects?.length || 0})`}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div role="listbox" aria-label="Daftar pilihan branch" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', width: '240px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
                <button 
                  type="button"
                  role="option"
                  aria-selected={selectedBranch === 'Semua Branch'}
                  className={`dropdown-item ${selectedBranch === 'Semua Branch' ? 'active' : ''}`}
                  onClick={() => { setSelectedBranch('Semua Branch'); setIsDropdownOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === 'Semua Branch' ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', color: '#0F172A', cursor: 'pointer' }}
                >
                  Semua Branch ({totalProjects})
                </button>
                {priorityBranches.map(b => (
                  <button 
                    key={b.name}
                    type="button"
                    role="option"
                    aria-selected={selectedBranch === b.name}
                    className={`dropdown-item ${selectedBranch === b.name ? 'active' : ''}`}
                    onClick={() => { setSelectedBranch(b.name); setIsDropdownOpen(false); }}
                    style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === b.name ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', color: '#0F172A', cursor: 'pointer' }}
                  >
                    {formatBranch(b.name)} ({b.projects?.length || 0})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter Dropdown Status: Belum Ada, Review, Selesai (Khusus Admin) */}
        {isAdmin && (
          <div ref={statusDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="control-btn-mobile"
              aria-haspopup="true"
              aria-expanded={isStatusDropdownOpen}
              aria-label="Filter status proyek"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              style={{
                height: '42px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                borderRadius: '10px',
                fontSize: '13px',
                flexShrink: 0,
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
                border: isStatusFiltered ? '1.5px solid #0F172A' : '1px solid #CBD5E1',
                backgroundColor: isStatusFiltered ? '#F1F5F9' : '#FFFFFF',
                color: '#0F172A',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isStatusFiltered) {
                  e.currentTarget.style.borderColor = '#94A3B8';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (!isStatusFiltered) {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              <span className="status-text-label" style={{ fontSize: '13px' }}>
                Status ({statusMatchingProjectsCount})
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isStatusFiltered ? '#0F172A' : '#64748B'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  flexShrink: 0
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isStatusDropdownOpen && (
              <div
                role="dialog"
                aria-label="Pilihan filter status proyek"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.18)',
                  zIndex: 1000,
                  width: '210px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#334155',
                  textAlign: 'left'
                }}
              >
                {/* Opsi Pilih Semua */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 2px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F1F5F9',
                    marginBottom: '6px',
                    fontSize: '12px',
                    color: '#0F172A'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.length === STATUS_OPTIONS.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatuses(STATUS_OPTIONS);
                      } else {
                        setSelectedStatuses([]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>(Pilih Semua)</span>
                  <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px' }}>
                    ({totalProjectsInFilter})
                  </span>
                </label>

                {/* List Status Checkbox */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {STATUS_OPTIONS.map((st) => {
                    const isChecked = selectedStatuses.includes(st);
                    const count = statusCounts[st] || 0;
                    return (
                      <label
                        key={st}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 4px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          transition: 'background-color 0.1s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStatuses(prev => [...prev, st]);
                            } else {
                              setSelectedStatuses(prev => prev.filter(x => x !== st));
                            }
                          }}
                          style={{ cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '12px', color: '#0F172A',  }}>
                          {st}
                        </span>
                        <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px', }}>
                          ({count})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Input with Icon */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            aria-hidden="true"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="search-input-field"
            placeholder="Cari nama proyek, WOK, atau ODP..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ height: '42px', paddingLeft: '38px', paddingRight: search ? '36px' : '16px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px' }}
            aria-label="Cari proyek, WOK, atau ODP"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus kata kunci pencarian"
              style={{ position: 'absolute', right: '10px', border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        
        {/* Tombol Export Excel */}
        <button
          type="button"
          className="control-btn-mobile"
          onClick={() => exportProjectsToExcel(branches, selectedBranch)}
          aria-label="Ekspor data rekap proyek ke format file Excel (.xlsx)"
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#0F172A',
            fontSize: '13px',
            padding: '0 18px',
            height: '42px',
            borderRadius: '10px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#94A3B8';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          title="Export Data Rekap Excel (.xlsx)"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Export Excel</span>
        </button>
      </div>


      {/* ─── 4. PROJECT TABLES & ACTIVITY CARDS ─── */}
      {selectedBranch === 'Semua Branch' ? (
        branchesWithFilteredProjects.length > 0 && (
          <div>
            <ProjectTable
              projects={allProjectsMultiBranch}
              branchName="Multi Branch" 
              uploadPhoto={uploadPhoto}
              onReview={openModal}
              onResetSearch={() => setSearch('')}
            />
          </div>
        )
      ) : (
        branchesWithFilteredProjects.map(b => (
          <div key={b.name}>
            <ProjectTable 
              projects={b.projects} 
              branchName={b.name} 
              uploadPhoto={uploadPhoto}
              onReview={openModal}
              onResetSearch={() => setSearch('')}
            />
          </div>
        ))
      )}
      
      {branchesWithFilteredProjects.length === 0 && (
        <div style={{
          marginTop: '14px',
          textAlign: 'center',
          padding: '48px 24px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <div style={{ fontSize: '15px', color: '#0F172A', letterSpacing: '-0.1px' }}>
            {isAdmin && isStatusFiltered 
              ? 'Tidak ada proyek dengan status terpilih' 
              : 'Tidak ada proyek yang sesuai kriteria'}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '440px', lineHeight: 1.5 }}>
            {isAdmin && isStatusFiltered
              ? `Tidak ditemukan proyek Greenfield dengan status ${selectedStatuses.join(', ')} pada branch ini.`
              : 'Tidak ditemukan proyek Greenfield dengan kata kunci pencarian atau filter branch yang dipilih.'}
          </p>
        </div>
      )}

      {/* Reusing the Review Modal and passing verifyActivity & rejectActivity */}
      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} rejectActivity={rejectActivity} deletePhoto={deletePhoto} />
    </div>
  );
});

export default UploadView;
```

---

## File: `gtm-monitor-frontend/src/components/BranchView.jsx` (480 baris)

```javascript
import { useState, useMemo, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch, computeStats, exportProjectsToExcel } from '../utils';

// BranchView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const BranchView = memo(function BranchView({
  branches = [],
  activeBranch,
  goDashboard,
  verifyActivity,
  rejectActivity,
  uploadPhoto,
  deletePhoto
}) {
  const [search, setSearch] = useState('');
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Case-insensitive lookup for activeBranch
  const targetName = (activeBranch || '').toString().trim().toUpperCase();
  const branch = useMemo(() => {
    const list = Array.isArray(branches) ? branches : [];
    if (!targetName) return list[0] || null;
    return list.find(b => (b.name || '').toString().trim().toUpperCase() === targetName) || list[0] || null;
  }, [branches, targetName]);

  const priorityProjects = useMemo(() => {
    if (!branch || !branch.projects) return [];
    return branch.projects.filter(p => {
      const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
      const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
      return isPriority && isGreenfield;
    });
  }, [branch]);

  const priorityBranch = useMemo(() => {
    if (!branch) return null;
    return { ...branch, projects: priorityProjects };
  }, [branch, priorityProjects]);

  const stats = useMemo(() => {
    if (!priorityBranch) return { odpCount: 0, totalUsed: 0, totalPort: 0, occRate: 0, totalProjCount: 0, actVerified: 0, actUploaded: 0 };
    return computeStats([priorityBranch]);
  }, [priorityBranch]);

  // Filter projects by search (bisa cari nama proyek, WOK, atau nama ODP)
  const filteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return priorityProjects.filter(p => 
      !s || 
      p.name.toLowerCase().includes(s) || 
      (p.wok && p.wok.toLowerCase().includes(s)) ||
      (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
    );
  }, [priorityProjects, search]);

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey && branch) {
    const [, pName] = modalKey.split('||');
    const p = (branch.projects || []).find(x => x.name === pName);
    if (p) {
      const odps = p.odps || [];
      const totalAvai = odps.reduce((s, o) => s + (o.avai || 0), 0);
      const totalUsed = odps.reduce((s, o) => s + (o.used || 0), 0);
      const totalPort = odps.reduce((s, o) => s + (o.total || 0), 0);

      modalData = {
        bName: branch.name,
        pName: p.name,
        wok: p.wok,
        projectId: p.id,
        odps,
        totalAvai,
        totalUsed,
        totalPort,
        odpCount: odps.length,
        activities: p.activities || []
      };
    }
  }

  if (!branch) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', margin: '24px 0' }}>
        <div style={{ fontSize: '16px', color: '#0F172A', marginBottom: '8px' }}>
          Data Branch "{activeBranch}" Tidak Ditemukan
        </div>
        <button
          type="button"
          onClick={goDashboard}
          style={{ padding: '8px 20px', borderRadius: '8px', background: '#800000', color: '#FFF', border: 'none', cursor: 'pointer', marginTop: '12px', fontSize: '13px' }}
        >
          Kembali ke Monitoring
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Header Title */}
      <div className="page-title-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: '28px', color: '#0F172A', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          Branch {formatBranch(branch.name)}
        </h1>
      </div>

      {/* ─── KPI SUMMARY GRID (3 CARDS MATCHING ACTIVITY VIEW STYLE) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Total Proyek Greenfield */}
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
            Total Proyek Greenfield
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
            {priorityProjects.length.toLocaleString('id-ID')}
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
            OCC &lt; 35% &amp; ODP &gt; 1
          </div>
        </div>

        {/* Card 2: Total ODP & Kapasitas */}
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
            Total ODP &amp; Kapasitas
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
            {stats.odpCount.toLocaleString('id-ID')}
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
            <span
              style={{
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginRight: '4px'
              }}
            >
              {stats.totalUsed.toLocaleString('id-ID')}
            </span>
            / {stats.totalPort.toLocaleString('id-ID')} port ({stats.occRate}%)
          </div>
        </div>

        {/* Card 3: Status Verifikasi Aktivitas */}
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
            Status Verifikasi Aktivitas
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
            {stats.actVerified.toLocaleString('id-ID')}
            <span
              style={{
                fontSize: '20px',
                color: '#64748B',
                letterSpacing: '-0.2px',
                marginLeft: '6px'
              }}
            >
              Terverifikasi
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
            <span
              style={{
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginRight: '4px'
              }}
            >
              {stats.actUploaded.toLocaleString('id-ID')}
            </span>
            Menunggu Verifikasi
          </div>
        </div>
      </div>

      {/* ─── CONTROLS BAR (EXPORT EXCEL & SEARCH INPUT) ─── */}
      <div className="controls-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
        {/* Tombol Export Excel */}
        <button
          type="button"
          className="control-btn-mobile"
          onClick={() => exportProjectsToExcel([branch], branch.name)}
          aria-label={`Ekspor data branch ${formatBranch(branch.name)} ke format file Excel (.xlsx)`}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#0F172A',
            fontSize: '13px',
            padding: '0 18px',
            height: '42px',
            borderRadius: '10px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#94A3B8';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          title="Export Data Branch ke File Excel (.xlsx)"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Export Excel</span>
        </button>

        {/* Search Input with Icon */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            aria-hidden="true"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="search-input-field"
            placeholder={`Cari proyek, WOK, atau ODP di branch ${formatBranch(branch.name)}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: '42px',
              paddingLeft: '38px',
              paddingRight: search ? '36px' : '16px',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              fontSize: '13px',
              width: '100%',
              boxSizing: 'border-box'
            }}
            aria-label={`Cari proyek di branch ${formatBranch(branch.name)}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus kata kunci pencarian"
              style={{
                position: 'absolute',
                right: '10px',
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Project Table */}
      {filteredProjects.length > 0 ? (
        <ProjectTable
          projects={filteredProjects}
          branchName={branch.name}
          onReview={openModal}
          uploadPhoto={uploadPhoto}
          onResetSearch={() => setSearch('')}
        />
      ) : (
        <div style={{
          marginTop: '14px',
          textAlign: 'center',
          padding: '48px 24px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <div style={{ fontSize: '15px', color: '#0F172A', letterSpacing: '-0.1px' }}>
            Tidak ada proyek yang sesuai kriteria
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '440px', lineHeight: 1.5 }}>
            Tidak ditemukan proyek dengan kata kunci pencarian di branch {formatBranch(branch.name)}.
          </p>
        </div>
      )}

      <ReviewModal
        modalData={modalData}
        closeModal={closeModal}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        deletePhoto={deletePhoto}
      />
    </div>
  );
});

export default BranchView;
```

---

## File: `gtm-monitor-frontend/src/components/AdminPanel.jsx` (91 baris)

```javascript
import { useState, memo } from 'react';
import ReviewModal from './ReviewModal';
import AdminKpiGrid from './admin/AdminKpiGrid';
import AdminActionHubCard from './admin/AdminActionHubCard';
import OdpImportModal from './admin/OdpImportModal';
import PairingImportModal from './admin/PairingImportModal';
import ProgramUploadModal from './admin/ProgramUploadModal';
import ProgramDeleteModal from './admin/ProgramDeleteModal';
import DeleteProgramConfirmModal from './admin/DeleteProgramConfirmModal';
import UploadGuideModal from './admin/UploadGuideModal';
import { useAdminMonitoring } from '../hooks/useAdminMonitoring';
import { useProjectReviewModal } from '../hooks/useProjectReviewModal';
import { useOdpImport } from '../hooks/useOdpImport';
import { usePairingImport } from '../hooks/usePairingImport';
import { useProgramUpload } from '../hooks/useProgramUpload';
import { useProgramDelete } from '../hooks/useProgramDelete';

// Control Panel Admin: KPI + Pusat Pembaruan Database 1 Segmen dengan Dialog Pop-up
const AdminPanel = memo(function AdminPanel({ branches = [], onUpdate, verifyActivity, rejectActivity, deletePhoto }) {
  const [activeModal, setActiveModal] = useState(null); // 'odp' | 'pairing' | 'program' | 'delete' | null
  const [activeInfoModal, setActiveInfoModal] = useState(null); // 'program' | 'odp' | 'pairing' | null

  const monitoring = useAdminMonitoring(branches);
  const { modalData, closeModal } = useProjectReviewModal(branches);
  const odpImport = useOdpImport({ onUpdate });
  const pairingImport = usePairingImport();
  const programUpload = useProgramUpload();
  const programDelete = useProgramDelete();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* 4 KPI Summary Cards matching Dashboard & Activity style */}
      <AdminKpiGrid priorityBranches={monitoring.priorityBranches} stats={monitoring.stats} totalProjects={monitoring.totalProjects} />

      {/* 1 Segmen Terpadu Pusat Pembaruan Database & Program */}
      <AdminActionHubCard
        onOpenModal={(type) => setActiveModal(type)}
      />

      {/* Dialog Pop-up Upload & Kelola Data */}
      <OdpImportModal
        isOpen={activeModal === 'odp'}
        onClose={() => setActiveModal(null)}
        {...odpImport}
        setActiveInfoModal={setActiveInfoModal}
      />

      <PairingImportModal
        isOpen={activeModal === 'pairing'}
        onClose={() => setActiveModal(null)}
        {...pairingImport}
        setActiveInfoModal={setActiveInfoModal}
      />

      <ProgramUploadModal
        isOpen={activeModal === 'program'}
        onClose={() => setActiveModal(null)}
        {...programUpload}
        setActiveInfoModal={setActiveInfoModal}
      />

      <ProgramDeleteModal
        isOpen={activeModal === 'delete'}
        onClose={() => setActiveModal(null)}
        {...programDelete}
      />

      {/* Dialog Konfirmasi Hapus Program */}
      {programDelete.showDeleteConfirmModal && (
        <DeleteProgramConfirmModal {...programDelete} />
      )}

      {/* Review Modal Kegiatan */}
      <ReviewModal
        modalData={modalData}
        closeModal={closeModal}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        deletePhoto={deletePhoto}
      />

      {/* Panduan Upload Modal */}
      {activeInfoModal && (
        <UploadGuideModal activeInfoModal={activeInfoModal} setActiveInfoModal={setActiveInfoModal} />
      )}
    </div>
  );
});

export default AdminPanel;
```

---

## File: `gtm-monitor-frontend/src/components/LandingPage.jsx` (230 baris)

```javascript
import { memo, useEffect, useState } from 'react';
import LoginModal from './Auth/LoginModal';

const LandingPage = memo(function LandingPage({
  initialLoginOpen = false,
  onLoginSuccess,
  onCloseLoginRoute
}) {
  const [isLoginOpen, setIsLoginOpen] = useState(Boolean(initialLoginOpen));

  useEffect(() => {
    setIsLoginOpen(Boolean(initialLoginOpen));
  }, [initialLoginOpen]);

  const handleOpenLogin = (e) => {
    if (e) e.preventDefault();
    setIsLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
    if (onCloseLoginRoute) {
      onCloseLoginRoute();
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100dvh',
        height: '100dvh',
        margin: 0,
        padding: '24px',
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, var(--font-body))",
        fontWeight: 400,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Background Layer 1: Bright Daylight Telecommunications BTS Tower Photography */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        <img
          src="/landing-bts-daylight.jpg"
          alt=""
          aria-hidden="true"
          width="1920"
          height="1080"
          fetchpriority="high"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            filter: 'brightness(1.02) contrast(1.02)',
            transform: isLoginOpen ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease'
          }}
        />
      </div>

      {/* Background Layer 2: Clean Airy White Scrim (Maximizing Brightness & Text Legibility) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(90deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.74) 40%, rgba(255, 255, 255, 0.32) 75%, rgba(255, 255, 255, 0.08) 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Top-Left: Telkomsel Brand Logo */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(24px, 4vh, 36px)',
          left: 'clamp(24px, 4vw, 44px)',
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <img
          src="/telkomsel-symbol.png"
          alt=""
          aria-hidden="true"
          style={{
            height: '28px',
            width: 'auto',
            display: 'block',
            filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12))'
          }}
        />
        <img
          src="/telkomsel-logo.png"
          alt="Telkomsel"
          style={{
            height: '22px',
            width: 'auto',
            display: 'block',
            filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.10))'
          }}
        />
      </div>

      {/* Center: Architectural Hero Composition (Smoothly recedes when Login Pop-up opens) */}
      <div
        aria-hidden={isLoginOpen}
        style={{
          maxWidth: '880px',
          width: '100%',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 16px',
          marginBottom: 0,
          opacity: isLoginOpen ? 0 : 1,
          transform: isLoginOpen ? 'scale(0.96) translateY(-8px)' : 'scale(1) translateY(0)',
          pointerEvents: isLoginOpen ? 'none' : 'auto',
          transition: 'opacity 0.24s ease, transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Two-Tone Headline in Gordita Regular harmonized with Bright Telkomsel Corporate Palette */}
        <h1
          style={{
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            fontSize: 'clamp(32px, 4.3vw, 56px)',
            fontWeight: 400,
            lineHeight: 1.22,
            letterSpacing: '-0.3px',
            margin: '0 0 22px 0',
            userSelect: 'none'
          }}
        >
          <span style={{ color: '#0F172A' }}>Monitoring Okupansi ODP</span>
          <br />
          <span style={{ color: '#E0001B' }}>Regional Jateng &amp; DIY</span>
        </h1>

        {/* Concise Supporting Sub-Headline with High Contrast */}
        <p
          style={{
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            fontSize: 'clamp(13.5px, 1.15vw, 15.5px)',
            fontWeight: 400,
            color: '#334155',
            lineHeight: 1.65,
            maxWidth: '580px',
            margin: '0 0 36px 0'
          }}
        >
          Sistem pemantauan utilisasi kapasitas port ODP Greenfield, verifikasi kegiatan lapangan,
          dan evaluasi distribusi Sales Force secara terpadu.
        </p>

        {/* Crisp Telkomsel Red Signature Button */}
        <button
          type="button"
          id="landing-login-btn"
          tabIndex={isLoginOpen ? -1 : 0}
          onClick={handleOpenLogin}
          style={{
            backgroundColor: '#E0001B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 56px',
            fontSize: '16px',
            fontWeight: 400,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(224, 0, 27, 0.28)',
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#C50017';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 22px rgba(224, 0, 27, 0.38)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#E0001B';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(224, 0, 27, 0.28)';
          }}
        >
          Login
        </button>
      </div>

      {/* Dynamic Frosted Crimson Login Pop-up Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={handleCloseLogin}
        onLoginSuccess={(loggedInUser, expiresAt) => {
          setIsLoginOpen(false);
          if (onLoginSuccess) {
            onLoginSuccess(loggedInUser, expiresAt);
          }
        }}
      />
    </div>
  );
});

export default LandingPage;
```

---

## File: `gtm-monitor-frontend/src/components/Auth/LoginModal.jsx` (504 baris)

```javascript
import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';
import TurnstileWidget, { TURNSTILE_SITE_KEY } from './TurnstileWidget';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);

  const usernameInputRef = useRef(null);
  const turnstileRef = useRef(null);

  // Auto-focus username field when modal opens & handle Escape key to close (Antislop R-26 & R-32)
  useEffect(() => {
    if (!isOpen) return undefined;

    const focusTimer = setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 60);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password) {
      setError('Silakan masukkan username dan password Anda.');
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Selesaikan verifikasi keamanan (captcha) terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, turnstileToken })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        if (onLoginSuccess) {
          onLoginSuccess(data.user, data.expiresAt);
        }
      } else {
        const fallbackMsg =
          res.status >= 500
            ? 'Terjadi gangguan pada server backend. Silakan coba beberapa saat lagi.'
            : 'Login gagal. Periksa kembali username dan password Anda.';
        setError(data.message || data.error || fallbackMsg);
        turnstileRef.current?.reset();
      }
    } catch (err) {
      console.error(err);
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="presentation"
      className="landing-login-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading && onClose) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(15, 23, 42, 0.42)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'landingModalBackdropIn 0.22s ease-out forwards',
        boxSizing: 'border-box'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="landing-login-modal"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '410px',
          padding: '36px 32px 32px',
          borderRadius: '22px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow:
            '0 24px 56px rgba(15, 23, 42, 0.18), 0 4px 16px rgba(15, 23, 42, 0.08), inset 0 1px 0 #FFFFFF',
          fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
          fontWeight: 400,
          color: '#0F172A',
          boxSizing: 'border-box',
          animation: 'landingModalCardIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Top-Right Close Button */}
        {onClose && (
          <button
            type="button"
            id="login-modal-close-btn"
            aria-label="Tutup pop up login"
            disabled={loading}
            onClick={onClose}
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: isCloseHovered ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
              backgroundColor: isCloseHovered ? '#F1F5F9' : 'rgba(255, 255, 255, 0.8)',
              color: isCloseHovered ? '#0F172A' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
              padding: 0
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Modal Header with Telkomsel Symbol */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <img
              src="/telkomsel-symbol.png"
              alt=""
              aria-hidden="true"
              style={{
                height: '32px',
                width: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 2px 6px rgba(224, 0, 27, 0.25))'
              }}
            />
          </div>
          <h2
            id="login-modal-title"
            style={{
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              fontSize: '24px',
              fontWeight: 400,
              color: '#0F172A',
              letterSpacing: '-0.3px',
              margin: '0 0 6px 0'
            }}
          >
            Login Petugas
          </h2>
          <p
            style={{
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              fontSize: '13px',
              fontWeight: 400,
              color: '#475569',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            Masuk untuk mengakses monitoring okupansi ODP
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Username Input Box */}
          <div style={{ marginBottom: '18px', textAlign: 'left' }}>
            <label
              htmlFor="login-username"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 400,
                color: '#1E293B',
                marginBottom: '8px',
                letterSpacing: '0.01em'
              }}
            >
              Username
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                ref={usernameInputRef}
                type="text"
                id="login-username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan username"
                style={{
                  width: '100%',
                  height: '46px',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border:
                    focusedField === 'username'
                      ? '1.5px solid #E0001B'
                      : '1px solid #CBD5E1',
                  backgroundColor:
                    focusedField === 'username'
                      ? '#FFFFFF'
                      : 'rgba(248, 250, 252, 0.95)',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '10px 42px 10px 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#0F172A',
                  fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
                  transition: 'all 0.18s ease'
                }}
              />
              {/* Right User Icon */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'username' ? '#E0001B' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  transition: 'color 0.18s ease'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            </div>
          </div>

          {/* Password Input Box */}
          <div
            style={{
              marginBottom: TURNSTILE_SITE_KEY ? '18px' : '24px',
              textAlign: 'left'
            }}
          >
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 400,
                color: '#1E293B',
                marginBottom: '8px',
                letterSpacing: '0.01em'
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan password"
                style={{
                  width: '100%',
                  height: '46px',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border:
                    focusedField === 'password'
                      ? '1.5px solid #E0001B'
                      : '1px solid #CBD5E1',
                  backgroundColor:
                    focusedField === 'password'
                      ? '#FFFFFF'
                      : 'rgba(248, 250, 252, 0.95)',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '10px 44px 10px 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#0F172A',
                  letterSpacing: showPassword || !password ? 'normal' : '2.5px',
                  fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
                  transition: 'all 0.18s ease'
                }}
              />

              {/* Eye Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: '6px',
                  color: focusedField === 'password' ? '#E0001B' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.18s ease'
                }}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Optional Cloudflare Turnstile Captcha */}
          {TURNSTILE_SITE_KEY && (
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 400,
                  color: '#1E293B',
                  marginBottom: '8px'
                }}
              >
                Verifikasi Keamanan
              </label>
              <TurnstileWidget
                ref={turnstileRef}
                action="login"
                onToken={setTurnstileToken}
                onError={() =>
                  setError(
                    'Captcha gagal dimuat. Periksa koneksi internet, lalu muat ulang halaman.'
                  )
                }
              />
            </div>
          )}

          {/* Error Feedback Banner */}
          {error && (
            <div
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '12.5px',
                fontWeight: 400,
                lineHeight: 1.45,
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}

          {/* Dynamic Telkomsel Red Signature Submit Button */}
          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            onMouseEnter={() => setIsSubmitHovered(true)}
            onMouseLeave={() => setIsSubmitHovered(false)}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: isSubmitHovered ? '#C50017' : '#E0001B',
              color: '#FFFFFF',
              fontSize: '15.5px',
              fontWeight: 400,
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSubmitHovered
                ? '0 6px 20px rgba(224, 0, 27, 0.35)'
                : '0 4px 14px rgba(224, 0, 27, 0.25)',
              transform: isSubmitHovered && !loading ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## File: `gtm-monitor-frontend/src/components/Auth/TurnstileWidget.jsx` (74 baris)

```javascript
import { useEffect, useImperativeHandle, useRef } from 'react';

// Site key publik (gtm-monitor-frontend/.env). Kosong = captcha tidak ditampilkan (backend juga tanpa secret key).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

// Script Turnstile dimuat sekali untuk seluruh aplikasi
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Script Turnstile gagal dimuat'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Widget Cloudflare Turnstile. onToken(token) saat lolos, onToken(null) saat kedaluwarsa/gagal.
// ref.reset() meminta token baru — wajib setelah percobaan login gagal karena token hanya berlaku sekali.
export default function TurnstileWidget({ action, onToken, onError, ref }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const callbacksRef = useRef({ onToken, onError });
  callbacksRef.current = { onToken, onError };

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.reset(widgetIdRef.current);
      callbacksRef.current.onToken(null);
    }
  }), []);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: 'light',
          size: 'flexible',
          language: 'id',
          callback: (token) => callbacksRef.current.onToken(token),
          'expired-callback': () => callbacksRef.current.onToken(null),
          'timeout-callback': () => callbacksRef.current.onToken(null),
          'error-callback': () => {
            callbacksRef.current.onToken(null);
            callbacksRef.current.onError?.();
          }
        });
      })
      .catch(() => callbacksRef.current.onError?.());

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [action]);

  // Tinggi widget Turnstile 65px: ruang dipesan agar form tidak bergeser saat widget muncul
  return <div ref={containerRef} className="cf-turnstile" style={{ width: '100%', minHeight: '65px' }} />;
}
```

