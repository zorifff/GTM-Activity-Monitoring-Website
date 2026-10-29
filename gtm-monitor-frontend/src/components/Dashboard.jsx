import { memo, useState } from 'react';
import HeroOccupancyCard from './dashboard/HeroOccupancyCard';
import AnalyticsBarChartCard from './dashboard/AnalyticsBarChartCard';
import OdpStatusDonutCard from './dashboard/OdpStatusDonutCard';
import BranchProjectsPieCard from './dashboard/BranchProjectsPieCard';
import SearchFilterToolbar from './dashboard/SearchFilterToolbar';
import ExecutiveSummarySection from './dashboard/ExecutiveSummarySection';
import RightWidgetPanel from './dashboard/RightWidgetPanel';
import DashboardHeader from './dashboard/DashboardHeader';
import { useLastUpdateLabel } from '../hooks/useLastUpdateLabel';
import { useInView } from '../hooks/useInView';

// ─── HALAMAN MONITORING (DASHBOARD) SAAS TOTAL REDESIGN ───
const Dashboard = memo(function Dashboard({
  branches,
  goBranch,
  kpi,
  importMeta,
  statusChips,
  ranking,
  typeDesignFilter = 'ALL',
  setTypeDesignFilter
}) {
  const lastUpdateFormatted = useLastUpdateLabel(importMeta, branches);

  // In-view observer triggers for smooth entry animations
  const [refTopRow, inViewTopRow] = useInView({ threshold: 0.1, triggerOnce: true });
  const [refChartsRow, inViewChartsRow] = useInView({ threshold: 0.08, triggerOnce: true });
  const [refBottomGrid, inViewBottomGrid] = useInView({ threshold: 0.08, triggerOnce: true });

  // Search & Scope Filter State
  const [searchQuery, setSearchQuery] = useState('');
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
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '4px 0 48px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── 0. HEADER HALAMAN & FILTER SWITCH TYPE (DESAIN RAPI & TERSTRUKTUR) ─── */}
      <DashboardHeader
        lastUpdateFormatted={lastUpdateFormatted}
        typeDesignFilter={typeDesignFilter}
        setTypeDesignFilter={setTypeDesignFilter}
      />

      {/* ─── BARIS ATAS: HERO ACCENT CARD + ANALYTICS BAR CHART ─── */}
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
        {/* A. Hero Card Kiri (Telkomsel Red SaaS Hero) */}
        <HeroOccupancyCard
          safeKpi={safeKpi}
          onReviewBranch={handleReviewPriority}
          isInView={inViewTopRow}
        />

        {/* B. Kartu Analitik Kanan (Capacity & Histogram Bar Chart) */}
        <AnalyticsBarChartCard
          safeKpi={safeKpi}
          safeStatusChips={safeStatusChips}
          ranking={safeRanking}
          branches={branches}
          lastUpdateFormatted={lastUpdateFormatted}
          isInView={inViewTopRow}
          onSelectBranch={(branchName) => {
            if (goBranch) goBranch(branchName);
          }}
        />
      </section>

      {/* ─── BARIS ANALITIK PROPORSI (DONUT STATUS ODP & PIE SEBARAN PROYEK) ─── */}
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

      {/* ─── TOOLBAR PENCARIAN & FILTER TENGAH ─── */}
      <section aria-label="Pencarian dan Filter">
        <SearchFilterToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          scopeFilter={scopeFilter}
          onScopeChange={setScopeFilter}
          branchList={safeRanking}
        />
      </section>

      {/* ─── GRID BAWAH TERBAGI DUA KOLOM (MAIN CONTENT VS SIDEBAR WIDGET) ─── */}
      <section
        ref={refBottomGrid}
        id="bottom-content-grid"
        aria-label="Matriks Executive Summary dan Ranking Branch"
        className="dashboard-bottom-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '20px',
          alignItems: 'start',
          width: '100%'
        }}
      >
        {/* Kolom Kiri (~68%): Matriks Executive Summary */}
        <div style={{ minWidth: 0 }}>
          <ExecutiveSummarySection
            branches={branches}
            searchQuery={searchQuery}
            scopeFilter={scopeFilter}
            isInView={inViewBottomGrid}
          />
        </div>

        {/* Kolom Kanan (~32%): Right Widget Panel (Ranking Branch & Live Feed) */}
        <div style={{ minWidth: 0 }}>
          <RightWidgetPanel
            ranking={safeRanking}
            goBranch={goBranch}
            safeKpi={safeKpi}
            isInView={inViewBottomGrid}
          />
        </div>
      </section>
    </div>
  );
});

export default Dashboard;
