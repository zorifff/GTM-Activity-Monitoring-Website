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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '20px',
          width: '100%',
          minWidth: 0
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
