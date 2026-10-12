import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import html2canvas from 'html2canvas';

const BRANCH_WOK_MATRIX = [
  {
    branch: 'MAGELANG',
    woks: ['KEBUMEN', 'MAGELANG TEMANGGUNG']
  },
  {
    branch: 'PEKALONGAN',
    woks: ['BATANG', 'PEMALANG PURBALINGGA', 'TEGAL BREBES']
  },
  {
    branch: 'PURWOKERTO',
    woks: ['CILACAP BANYUMAS', 'WONOSOBO BANJARNEGARA']
  },
  {
    branch: 'SEMARANG',
    woks: ['DEMAK', 'JEPARA KUDUS - PATI', 'SEMARANG 1', 'SEMARANG 2']
  },
  {
    branch: 'SURAKARTA',
    woks: ['BOYOLALI', 'SRAGEN', 'SURAKARTA']
  },
  {
    branch: 'YOGYAKARTA',
    woks: ['YOGYA 1', 'YOGYA 2']
  }
];

const ACT_TYPES_ORDER = [
  { key: 'tsel_menyapa', shortLabel: 'Tsel Menyapa' },
  { key: 'branding_outlet', shortLabel: 'Branding Outlet' },
  { key: 'bumdes', shortLabel: 'BUMDES' },
  { key: 'rekrutmen_sf', shortLabel: 'Rekrut SF' },
  { key: 'open_table', shortLabel: 'Open Table' }
];

const Dashboard = memo(function Dashboard({ branches, goBranch, kpi, importMeta, statusChips, ranking, typeDesignFilter = 'ALL', setTypeDesignFilter }) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState({});

  const toggleBranchExpand = useCallback((branchName, e) => {
    if (e) e.stopPropagation();
    setExpandedBranches(prev => ({ ...prev, [branchName]: !prev[branchName] }));
  }, []);

  const handleDownloadPNG = useCallback(async () => {
    const tableWrapper = document.getElementById('executive-summary-wrapper');
    if (!tableWrapper || isExportingPng) return;

    try {
      setIsExportingPng(true);

      const canvas = await html2canvas(tableWrapper, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedWrapper = clonedDoc.getElementById('executive-summary-wrapper');
          if (clonedWrapper) {
            const clonedTable = clonedWrapper.querySelector('table');
            const totalScrollWidth = Math.max(clonedTable?.scrollWidth || 0, clonedWrapper.scrollWidth || 0, 1250) + 60;

            clonedWrapper.style.maxHeight = 'none';
            clonedWrapper.style.overflowY = 'visible';
            clonedWrapper.style.overflowX = 'visible';
            clonedWrapper.style.width = `${totalScrollWidth}px`;
            clonedWrapper.style.maxWidth = 'none';

            if (clonedTable) {
              clonedTable.style.width = `${totalScrollWidth}px`;
              clonedTable.style.minWidth = `${totalScrollWidth}px`;
            }

            const stickyEls = clonedWrapper.querySelectorAll('[style*="sticky"]');
            stickyEls.forEach(el => {
              el.style.position = 'static';
            });
          }
        }
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Executive_Summary_GTM_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      setIsExportingPng(false);
    }
  }, [isExportingPng]);

  const lastUpdateFormatted = useMemo(() => {
    let rawDate = importMeta?.updatedAt || importMeta?.lastUpdate;

    if (!rawDate && branches && branches.length > 0) {
      let latestTime = 0;
      branches.forEach(b => {
        (b.projects || []).forEach(p => {
          (p.activities || []).forEach(a => {
            if (a.updatedAt) {
              const t = new Date(a.updatedAt).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
            if (a.actualDate) {
              const t = new Date(a.actualDate).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
          });
        });
      });
      if (latestTime > 0) {
        rawDate = new Date(latestTime);
      }
    }

    if (!rawDate) {
      rawDate = new Date();
    }

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;

    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return `${d.getDate()} ${monthsIndo[d.getMonth()]} ${d.getFullYear()}`;
  }, [importMeta, branches]);

  useEffect(() => {
    const handleClickOutside = () => setIsStatusDropdownOpen(false);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const safeKpi = kpi || { occRate: 0, totalUsed: 0, totalPort: 0, totalAvai: 0, odpCount: 0, actCompletionPct: 0, actVerified: 0, actUploaded: 0, actPending: 0, actBelum: 0 };
  const safeStatusChips = statusChips || [];
  const safeRanking = ranking || [];

  // Executive Summary Computation per Branch & WOK
  const executiveSummary = useMemo(() => {
    let grandTotalLop = 0;
    const grandTotalDone = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
    const grandTotalNotYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

    const rows = [];

    BRANCH_WOK_MATRIX.forEach(group => {
      const bData = (branches || []).find(b => (b.name || '').toString().trim().toUpperCase() === group.branch);
      const allProjects = bData?.projects || [];

      // Filter Greenfield Priority Projects
      const priorityProjects = allProjects.filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      });

      group.woks.forEach((wokName, wIdx) => {
        const wokProjects = priorityProjects.filter(p => {
          const pWok = (p.wok || '').toString().trim().toUpperCase();
          const cleanP = pWok.replace(/[\s-]/g, '');
          const cleanW = wokName.replace(/[\s-]/g, '');
          return pWok === wokName || cleanP === cleanW || cleanP.includes(cleanW) || cleanW.includes(cleanP);
        });

        const lopCount = wokProjects.length;
        grandTotalLop += lopCount;

        const done = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
        const notYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

        ACT_TYPES_ORDER.forEach(item => {
          const k = item.key;
          const verifiedCount = wokProjects.filter(p => p.activities?.some(a => a.type === k && a.status === 'verified')).length;
          done[k] = verifiedCount;
          notYet[k] = lopCount - verifiedCount;

          grandTotalDone[k] += verifiedCount;
          grandTotalNotYet[k] += lopCount - verifiedCount;
        });

        const totalDoneWok = ACT_TYPES_ORDER.reduce((s, item) => s + done[item.key], 0);
        const totalSlotsWok = lopCount * 5;
        const progressPct = totalSlotsWok > 0 ? Math.round((totalDoneWok / totalSlotsWok) * 1000) / 10 : 0;

        rows.push({
          branch: group.branch,
          wok: wokName,
          isFirstInBranch: wIdx === 0,
          isLastInBranch: wIdx === group.woks.length - 1,
          branchRowSpan: group.woks.length,
          lopCount,
          done,
          notYet,
          progressPct
        });
      });
    });

    const grandTotalDoneAll = ACT_TYPES_ORDER.reduce((s, item) => s + grandTotalDone[item.key], 0);
    const grandTotalSlotsAll = grandTotalLop * 5;
    const grandProgressPct = grandTotalSlotsAll > 0 ? Math.round((grandTotalDoneAll / grandTotalSlotsAll) * 1000) / 10 : 0;

    return {
      rows,
      grandTotalLop,
      grandTotalDone,
      grandTotalNotYet,
      grandProgressPct
    };
  }, [branches]);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A' }}>
      {/* ─── 1. TOP HEADER & FILTER BAR (CLEAN CORPORATE HEADER) ─── */}
      <div 
        className="page-title-header" 
        style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between', 
          marginBottom: '18px', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}
      >
        <div>
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            color: '#0F172A', 
            margin: 0, 
            letterSpacing: '-0.2px',
            lineHeight: 1.25
          }}>
            Overview Kinerja Regional & Occupancy
          </h1>
          {lastUpdateFormatted && (
            <div style={{ 
              fontSize: '11.5px', 
              color: '#64748B', 
              fontWeight: 500, 
              marginTop: '3px' 
            }}>
              Pembaruan data: {lastUpdateFormatted}
            </div>
          )}
        </div>

        {/* Refined Segmented Control Filter */}
        {setTypeDesignFilter && (
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              background: '#F1F5F9', 
              padding: '3px', 
              borderRadius: '7px', 
              border: '1px solid #E2E8F0'
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
                  onClick={() => setTypeDesignFilter(f.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '5px',
                    border: isActive ? '1px solid #E2E8F0' : '1px solid transparent',
                    fontSize: '11.5px',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#0F172A';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#64748B';
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 2. KPI CARDS ROW (CLEAN, PROPORTIONAL, COMPACT) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginBottom: '18px'
      }}>
        {/* KPI 1: Total Occupancy Rate */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Total Occupancy Rate
            </span>
          </div>
          
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            color: '#0F172A', 
            marginTop: '4px', 
            letterSpacing: '-0.3px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.15
          }}>
            {safeKpi.occRate}%
          </div>

          <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${Math.min(safeKpi.occRate, 100)}%`, 
                background: '#0F172A', 
                borderRadius: '2px'
              }} 
            />
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {safeKpi.totalUsed.toLocaleString('id-ID')} dari {safeKpi.totalPort.toLocaleString('id-ID')} port terpakai
          </div>
        </div>

        {/* KPI 2: Port Tersedia */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Port Tersedia
            </span>
          </div>

          <div style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            color: '#0F172A', 
            marginTop: '4px', 
            letterSpacing: '-0.3px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.15
          }}>
            {safeKpi.totalAvai.toLocaleString('id-ID')}
          </div>

          <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${safeKpi.totalPort > 0 ? Math.min((safeKpi.totalAvai / safeKpi.totalPort) * 100, 100) : 0}%`, 
                background: '#64748B', 
                borderRadius: '2px'
              }} 
            />
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Total kapasitas {safeKpi.totalPort.toLocaleString('id-ID')} port di {safeKpi.odpCount.toLocaleString('id-ID')} ODP
          </div>
        </div>

        {/* KPI 3: Status ODP */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Total ODP Terpantau
            </span>

            {/* Rincian Status Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStatusDropdownOpen(!isStatusDropdownOpen);
              }}
              style={{
                padding: '2px 7px',
                borderRadius: '4px',
                border: '1px solid #E2E8F0',
                fontSize: '10.5px',
                fontWeight: 600,
                background: isStatusDropdownOpen ? '#F1F5F9' : '#FFFFFF',
                color: '#475569',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                lineHeight: 1.2
              }}
            >
              Rincian
            </button>
          </div>

          <div style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            color: '#0F172A', 
            marginTop: '4px', 
            letterSpacing: '-0.3px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.15
          }}>
            {safeKpi.odpCount.toLocaleString('id-ID')}
          </div>

          <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
            {safeKpi.odpCount > 0 ? (
              safeStatusChips.map(s => {
                const sharePct = (s.count / safeKpi.odpCount) * 100;
                if (sharePct <= 0) return null;
                return (
                  <div 
                    key={s.label}
                    title={`${s.label}: ${s.count}`}
                    style={{
                      height: '100%',
                      width: `${sharePct}%`,
                      background: s.color
                    }}
                  />
                );
              })
            ) : (
              <div style={{ height: '100%', width: '0%', background: '#64748B' }} />
            )}
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Cakupan wilayah operasional regional Jateng DIY
          </div>

          {/* Clean Status Popover */}
          {isStatusDropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '210px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)',
                zIndex: 1000,
                padding: '6px 0'
              }}
            >
              <div style={{ 
                padding: '6px 12px 8px 12px', 
                fontSize: '10px', 
                fontWeight: 700, 
                color: '#64748B', 
                borderBottom: '1px solid #F1F5F9', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                Rincian Kategori ODP
              </div>
              {safeStatusChips.map(s => {
                const sharePct = safeKpi.odpCount > 0 
                  ? Math.round((s.count / safeKpi.odpCount) * 1000) / 10 
                  : 0;
                return (
                  <div
                    key={s.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      borderBottom: '1px solid #FAFAFC'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#334155' }}>{s.label}</span>
                    <span style={{ color: '#0F172A', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {s.count.toLocaleString('id-ID')} <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '10.5px' }}>({sharePct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KPI 4: Aktivitas GTM Terverifikasi */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Aktivitas GTM Terverifikasi
            </span>
          </div>

          <div style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            color: '#0F172A', 
            marginTop: '4px', 
            letterSpacing: '-0.3px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.15
          }}>
            {safeKpi.actCompletionPct}%
          </div>

          <div style={{ marginTop: '8px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${Math.min(safeKpi.actCompletionPct, 100)}%`, 
                background: '#0F172A', 
                borderRadius: '2px'
              }} 
            />
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {safeKpi.actVerified} terverifikasi · {safeKpi.actUploaded} diunggah · {safeKpi.actPending || safeKpi.actBelum || 0} belum
          </div>
        </div>
      </div>

      {/* ─── 3. RANKING BRANCH & WOK SECTION (CLEAN ENTERPRISE TABLE) ─── */}
      <div className="dashboard-card" style={{ marginBottom: '20px', padding: '18px 20px', borderRadius: '12px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '14px', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          <div>
            <h2 style={{ 
              fontSize: '15px', 
              fontWeight: 700, 
              color: '#0F172A', 
              margin: '0 0 2px 0'
            }}>
              Ranking Branch Berdasarkan Occupancy
            </h2>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
              Diurutkan dari occupancy terendah
            </div>
          </div>
        </div>

        <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '780px' }}>
            {/* Table Column Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(170px, 1.2fr) minmax(75px, 0.6fr) minmax(75px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 14px',
              background: '#F8FAFC',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              marginBottom: '6px'
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
                fontSize: '12.5px',
                background: '#FAFAFC',
                borderRadius: '6px',
                border: '1px dashed #E2E8F0',
                marginTop: '6px'
              }}>
                Belum ada data branch untuk filter yang dipilih.
              </div>
            )}

            {/* Branch Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {safeRanking.map(b => {
                const isExpanded = !!expandedBranches[b.name];
                const hasWoks = b.woks && b.woks.length > 0;

                return (
                  <div key={b.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {/* Main Branch Row */}
                    <div
                      onClick={(e) => {
                        if (hasWoks) toggleBranchExpand(b.name, e);
                        else if (goBranch) goBranch(b.name);
                      }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(170px, 1.2fr) minmax(75px, 0.6fr) minmax(75px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        background: isExpanded ? '#F8FAFC' : '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      {/* Branch Name with Expansion Caret */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontWeight: 700, 
                        fontSize: '13px', 
                        color: '#0F172A',
                        minWidth: 0, 
                        overflow: 'hidden' 
                      }}>
                        {hasWoks && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#64748B', 
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.15s ease',
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

                      {/* Clean Progress Bar (No 35% line, no clutter) */}
                      <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${Math.min(b.occRate, 100)}%`, 
                            background: '#0F172A', 
                            borderRadius: '3px'
                          }} 
                        />
                      </div>

                      {/* Occupancy % (Clean text, no background badge) */}
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: 700, 
                        color: '#0F172A', 
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {b.occRate}%
                      </div>

                      {/* Gap WoW (Clean plain text, no colored badge) */}
                      <div style={{ 
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: b.delta > 0 ? '#16A34A' : b.delta < 0 ? '#DC2626' : '#64748B'
                      }}>
                        {b.delta > 0 ? `+${b.delta}%` : `${b.delta}%`}
                      </div>

                      {/* Project Count */}
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#64748B', 
                        fontWeight: 500, 
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {b.projCount} proyek
                      </div>

                      {/* GTM Done % */}
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#64748B', 
                        fontWeight: 500, 
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {b.actPct}%
                      </div>

                      {/* Action */}
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
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 4px',
                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ED0226';
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
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2px', 
                        paddingLeft: '16px',
                        borderLeft: '2px solid #E2E8F0',
                        marginLeft: '8px'
                      }}>
                        {b.woks.map((w) => (
                          <div
                            key={w.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (goBranch) goBranch(b.name);
                            }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(180px, 1.4fr) minmax(170px, 1.2fr) minmax(75px, 0.6fr) minmax(75px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              background: '#F8FAFC',
                              border: '1px solid #F1F5F9',
                              cursor: 'pointer',
                              transition: 'background 0.1s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#F1F5F9';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F8FAFC';
                            }}
                          >
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              fontWeight: 500, 
                              fontSize: '12px', 
                              color: '#334155', 
                              minWidth: 0, 
                              overflow: 'hidden' 
                            }}>
                              <span style={{ color: '#94A3B8' }}>└</span>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {w.name}
                              </span>
                            </div>

                            <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  height: '100%', 
                                  width: `${Math.min(w.occRate, 100)}%`, 
                                  background: '#475569', 
                                  borderRadius: '2px'
                                }} 
                              />
                            </div>

                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              color: '#334155', 
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              {w.occRate}%
                            </div>

                            <div style={{ 
                              textAlign: 'center',
                              fontSize: '11px',
                              fontWeight: 600,
                              fontVariantNumeric: 'tabular-nums',
                              color: w.delta > 0 ? '#16A34A' : w.delta < 0 ? '#DC2626' : '#64748B'
                            }}>
                              {w.delta > 0 ? `+${w.delta}%` : `${w.delta}%`}
                            </div>

                            <div style={{ 
                              fontSize: '11px', 
                              color: '#64748B', 
                              fontWeight: 500, 
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              {w.projCount} proyek
                            </div>

                            <div style={{ 
                              fontSize: '11px', 
                              color: '#64748B', 
                              fontWeight: 500, 
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              {w.actPct}%
                            </div>

                            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
                              →
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. EXECUTIVE SUMMARY CARD (REKAP AKTIVITAS PER WOK & BRANCH) ─── */}
      <div className="dashboard-card">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '16px', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          <div>
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: '#0F172A', 
              margin: '0 0 2px 0'
            }}>
              Executive Summary Program Aktivitas GTM
            </h2>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
              Rekapitulasi 5 aktivitas prioritas per Branch dan WOK
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={isExportingPng}
            style={{
              cursor: isExportingPng ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              fontWeight: 600,
              fontSize: '12px',
              padding: '6px 14px',
              borderRadius: '6px',
              transition: 'background 0.15s ease',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              opacity: isExportingPng ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isExportingPng) e.currentTarget.style.background = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              if (!isExportingPng) e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <span>{isExportingPng ? 'Mengekspor...' : 'Ekspor PNG'}</span>
          </button>
        </div>

        {/* Corporate Data Table Container */}
        <div 
          id="executive-summary-wrapper" 
          className="table-responsive-wrapper custom-table-scrollbar" 
          style={{ 
            overflowX: 'auto', 
            overflowY: 'auto', 
            maxHeight: '70vh', 
            borderRadius: '8px', 
            border: '1px solid #E2E8F0', 
            position: 'relative', 
            background: '#FFFFFF' 
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center', minWidth: '1100px' }}>
            <thead>
              {/* Primary Header Row */}
              <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 700 }}>
                <th style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 30, 
                  background: '#0F172A', 
                  color: '#FFFFFF', 
                  padding: '10px 8px', 
                  width: '130px', 
                  verticalAlign: 'middle', 
                  borderRight: '1px solid #1E293B' 
                }} rowSpan={2}>
                  Branch
                </th>
                <th style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 30, 
                  background: '#0F172A', 
                  color: '#FFFFFF', 
                  padding: '10px 8px', 
                  width: '160px', 
                  verticalAlign: 'middle', 
                  borderRight: '1px solid #1E293B' 
                }} rowSpan={2}>
                  WOK
                </th>
                <th style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 30, 
                  background: '#0F172A', 
                  color: '#FFFFFF', 
                  padding: '10px 8px', 
                  width: '80px', 
                  verticalAlign: 'middle', 
                  borderRight: '1px solid #1E293B' 
                }} rowSpan={2}>
                  Jumlah LOP
                </th>

                {/* Done Activities Header (No green dot, cohesive slate) */}
                <th style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 25, 
                  background: '#1E293B', 
                  color: '#FFFFFF', 
                  padding: '8px 10px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.4px', 
                  borderRight: '1px solid #334155',
                  borderBottom: '1px solid #334155' 
                }} colSpan={5}>
                  Done Activity (Terverifikasi)
                </th>

                {/* Not Yet Activities Header (No red dot, cohesive slate) */}
                <th style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 25, 
                  background: '#334155', 
                  color: '#FFFFFF', 
                  padding: '8px 10px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.4px', 
                  borderRight: '1px solid #1E293B',
                  borderBottom: '1px solid #1E293B' 
                }} colSpan={5}>
                  Not Yet Activity (Belum)
                </th>

                <th style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 30, 
                  background: '#0F172A', 
                  color: '#FFFFFF', 
                  padding: '10px 8px', 
                  width: '90px', 
                  verticalAlign: 'middle' 
                }} rowSpan={2}>
                  Progress
                </th>
              </tr>

              {/* Subheader Column Names */}
              <tr style={{ background: '#0F172A', color: '#CBD5E1', fontSize: '11px', fontWeight: 600 }}>
                {/* Subheaders Done Activity */}
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Tsel Menyapa</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Branding Outlet</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>BUMDES</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Rekrut SF</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#1E293B', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #334155' }}>Open Table</th>

                {/* Subheaders Not Yet Activity */}
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Tsel Menyapa</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Branding Outlet</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>BUMDES</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Rekrut SF</th>
                <th style={{ position: 'sticky', top: '31px', zIndex: 20, background: '#334155', color: '#E2E8F0', padding: '6px 4px', borderRight: '1px solid #475569' }}>Open Table</th>
              </tr>
            </thead>

            <tbody>
              {executiveSummary.rows.map((row, rIdx) => (
                <tr 
                  key={`${row.branch}-${row.wok}`} 
                  style={{ 
                    background: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                  }}
                >
                  {/* Grouped Branch Column */}
                  {row.isFirstInBranch && (
                    <td 
                      rowSpan={row.branchRowSpan} 
                      style={{ 
                        padding: '10px 8px', 
                        fontWeight: 700, 
                        fontSize: '12px',
                        color: '#0F172A', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        verticalAlign: 'middle',
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                        {row.branch}
                      </span>
                    </td>
                  )}

                  {/* WOK Name */}
                  <td style={{ 
                    padding: '8px 10px', 
                    fontWeight: 500, 
                    color: '#334155', 
                    textAlign: 'left', 
                    borderRight: '1px solid #E2E8F0', 
                    borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9' 
                  }}>
                    {row.wok}
                  </td>

                  {/* LOP Count */}
                  <td style={{ 
                    padding: '8px 6px', 
                    fontWeight: 700, 
                    color: '#0F172A', 
                    borderRight: '1px solid #E2E8F0', 
                    borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                    fontVariantNumeric: 'tabular-nums' 
                  }}>
                    {row.lopCount}
                  </td>

                  {/* 5 Done Values (Plain text numbers, no green background box) */}
                  {ACT_TYPES_ORDER.map(item => {
                    const val = row.done[item.key];
                    return (
                      <td 
                        key={`done-${item.key}`} 
                        style={{ 
                          padding: '8px 4px', 
                          fontWeight: val > 0 ? 700 : 400, 
                          color: val > 0 ? '#0F172A' : '#94A3B8', 
                          borderRight: '1px solid #E2E8F0', 
                          borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {val > 0 ? val : '-'}
                      </td>
                    );
                  })}

                  {/* 5 Not Yet Values (Plain text numbers, no amber background box) */}
                  {ACT_TYPES_ORDER.map(item => {
                    const val = row.notYet[item.key];
                    return (
                      <td 
                        key={`notyet-${item.key}`} 
                        style={{ 
                          padding: '8px 4px', 
                          fontWeight: val > 0 ? 600 : 400, 
                          color: val > 0 ? '#475569' : '#94A3B8', 
                          borderRight: '1px solid #E2E8F0', 
                          borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {val > 0 ? val : '-'}
                      </td>
                    );
                  })}

                  {/* Progress % (Plain text number, NO background color badge) */}
                  <td style={{ 
                    padding: '8px 6px', 
                    fontWeight: 700,
                    color: '#0F172A',
                    borderBottom: row.isLastInBranch ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {row.progressPct}%
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Table Footer: Clean Grand Totals (No rainbow colored numbers, no pill) */}
            <tfoot>
              <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 700, borderTop: '2px solid #0F172A' }}>
                <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', letterSpacing: '0.4px' }}>
                  TOTAL REGIONAL JATENG DIY
                </td>
                <td style={{ padding: '10px 6px', fontSize: '12px', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                  {executiveSummary.grandTotalLop}
                </td>

                {/* Grand Total Done (Clean white numbers) */}
                {ACT_TYPES_ORDER.map(item => (
                  <td 
                    key={`gt-done-${item.key}`} 
                    style={{ 
                      padding: '10px 4px', 
                      color: '#FFFFFF', 
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {executiveSummary.grandTotalDone[item.key]}
                  </td>
                ))}

                {/* Grand Total Not Yet (Clean white numbers) */}
                {ACT_TYPES_ORDER.map(item => (
                  <td 
                    key={`gt-notyet-${item.key}`} 
                    style={{ 
                      padding: '10px 4px', 
                      color: '#FFFFFF', 
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {executiveSummary.grandTotalNotYet[item.key]}
                  </td>
                ))}

                {/* Grand Total Progress (Plain white text, no background badge) */}
                <td style={{ 
                  padding: '10px 6px', 
                  fontSize: '12px', 
                  color: '#FFFFFF', 
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums' 
                }}>
                  {executiveSummary.grandProgressPct}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
