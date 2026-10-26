import { memo } from 'react';
import DashboardHeader from './dashboard/DashboardHeader';
import KpiCards from './dashboard/KpiCards';
import BranchRankingCard from './dashboard/BranchRankingCard';
import ExecutiveSummaryCard from './dashboard/ExecutiveSummaryCard';
import { useLastUpdateLabel } from '../hooks/useLastUpdateLabel';

// Halaman Monitoring (Dashboard): header & filter tipe, KPI, ranking branch/WOK, executive summary
const Dashboard = memo(function Dashboard({ branches, goBranch, kpi, importMeta, statusChips, ranking, typeDesignFilter = 'ALL', setTypeDesignFilter }) {
  const lastUpdateFormatted = useLastUpdateLabel(importMeta, branches);

  const safeKpi = kpi || { occRate: 0, totalUsed: 0, totalPort: 0, totalAvai: 0, odpCount: 0, actCompletionPct: 0, actVerified: 0, actUploaded: 0, actPending: 0, actBelum: 0 };
  const safeStatusChips = statusChips || [];
  const safeRanking = ranking || [];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A' }}>
      <DashboardHeader
        lastUpdateFormatted={lastUpdateFormatted}
        typeDesignFilter={typeDesignFilter}
        setTypeDesignFilter={setTypeDesignFilter}
      />
      <KpiCards safeKpi={safeKpi} safeStatusChips={safeStatusChips} />
      <BranchRankingCard safeRanking={safeRanking} goBranch={goBranch} />
      <ExecutiveSummaryCard branches={branches} />
    </div>
  );
});

export default Dashboard;
