import { useState, useEffect, useMemo, useRef, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch, computeStats, exportProjectsToExcel } from '../utils';

// UploadView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const UploadView = memo(function UploadView({ branches, initialBranch, verifyActivity, rejectActivity, uploadPhoto, deletePhoto }) {
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
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Jika akun user biasa hanya memiliki akses 1 branch, kunci selectedBranch ke branch tersebut
  useEffect(() => {
    if (priorityBranches?.length === 1 && selectedBranch !== priorityBranches[0].name) {
      setSelectedBranch(priorityBranches[0].name);
    }
  }, [priorityBranches, selectedBranch]);

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

  // 3. Filter Projects within those branches based on search text (bisa cari nama proyek, WOK, atau nama ODP)
  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      const projs = b.projects.filter(p => 
        !s || 
        p.name.toLowerCase().includes(s) || 
        (p.wok && p.wok.toLowerCase().includes(s)) ||
        (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
      );
      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search]);

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

  // Calibrated discrete status color tokens (R-18 & R-37)
  const getStatusColor35 = (val) => {
    const numeric = parseFloat(val) || 0;
    if (numeric >= 35) return '#16A34A'; // Target reached (>= 35%)
    if (numeric >= 20) return '#D97706'; // Moderate
    return '#DC2626'; // Low occupancy (< 20%)
  };

  const getCompletionColor = (val) => {
    const numeric = parseFloat(val) || 0;
    if (numeric >= 80) return '#16A34A'; // High completion (green)
    if (numeric > 0) return '#D97706'; // In progress (amber)
    return '#0F172A'; // 0% is normal initial state -> neutral slate (never red)
  };

  const getProgressBarColor = (val) => {
    const numeric = parseFloat(val) || 0;
    if (numeric >= 80) return '#16A34A';
    if (numeric > 0) return '#D97706';
    return '#94A3B8';
  };

  const usedPct = useMemo(() => {
    return stats.totalPort > 0 ? (stats.totalUsed / stats.totalPort) * 100 : 0;
  }, [stats.totalUsed, stats.totalPort]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* ─── 1. HEADER TITLE (MATCHING MONITORING PAGE STYLE) ─── */}
      <div className="page-title-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            GTM Activity LOP Greenfield Priority
          </h1>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY GRID (3 CARDS PROPORTIONALLY BALANCED) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Port Avai / Used / Total */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              Ketersediaan Port
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
              <span className="tabular-nums" style={{ fontFamily: "var(--font-heading)", fontSize: '26px', fontWeight: 900, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                {stats.totalAvai.toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#64748B' }}>
                Port tersedia
              </span>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '10px', fontWeight: 500 }}>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>{stats.totalUsed.toLocaleString('id-ID')}</span> terpakai dari <span style={{ fontWeight: 700, color: '#0F172A' }}>{stats.totalPort.toLocaleString('id-ID')}</span> total ({usedPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
          </div>
        </div>

        {/* Card 2: Jumlah Proyek / ODP */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              Cakupan Proyek & ODP
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
              <span className="tabular-nums" style={{ fontFamily: "var(--font-heading)", fontSize: '26px', fontWeight: 900, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                {totalProjectsInFilter.toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#64748B' }}>
                Proyek
              </span>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '10px', fontWeight: 500 }}>
            Mencakup <span style={{ fontWeight: 700, color: '#0F172A' }}>{stats.odpCount.toLocaleString('id-ID')}</span> total titik ODP prioritas
          </div>
        </div>

        {/* Card 3: Aktivitas GTM Selesai (Mini Progress Bar & Neutral 0%) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              Aktivitas GTM Selesai
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
              <span className="tabular-nums" style={{ fontFamily: "var(--font-heading)", fontSize: '26px', fontWeight: 900, color: getCompletionColor(stats.actCompletionPct), fontVariantNumeric: 'tabular-nums', transition: 'color 0.2s ease' }}>
                {stats.actCompletionPct.toLocaleString('id-ID')}%
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#64748B' }}>
                Selesai
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#E2E8F0',
                borderRadius: '9999px',
                marginTop: '10px',
                overflow: 'hidden'
              }}
              title={`Progres Aktivitas GTM: ${stats.actCompletionPct}% selesai`}
            >
              <div
                style={{
                  width: `${Math.min(stats.actCompletionPct, 100)}%`,
                  height: '100%',
                  backgroundColor: getProgressBarColor(stats.actCompletionPct),
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '10px', fontWeight: 500 }}>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>{stats.actVerified.toLocaleString('id-ID')}</span> dari <span style={{ fontWeight: 700, color: '#0F172A' }}>{stats.totalActivitySlots.toLocaleString('id-ID')}</span> aktivitas terverifikasi
          </div>
        </div>
      </div>

      {/* ─── 3. CONTROLS BAR (FILTER BRANCH, SEARCH, & EXPORT EXCEL) ─── */}
      <div className="controls-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Branch Dropdown */}
        {branches.length === 1 ? (
          <div className="branch-filter-capsule" style={{ height: '42px', minWidth: 'auto', border: '1px solid #CBD5E1', color: '#0F172A', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', background: '#FFFFFF', boxSizing: 'border-box' }}>
            <span className="branch-text-label" style={{ fontWeight: 700, fontSize: '13px' }}>Branch: {formatBranch(branches[0].name)}</span>
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
              <span className="branch-text-label" style={{ flex: 1, fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
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
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === 'Semua Branch' ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', fontWeight: selectedBranch === 'Semua Branch' ? 700 : 500, color: '#0F172A', cursor: 'pointer' }}
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
                    style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === b.name ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', fontWeight: selectedBranch === b.name ? 700 : 500, color: '#0F172A', cursor: 'pointer' }}
                  >
                    {formatBranch(b.name)} ({b.projects?.length || 0})
                  </button>
                ))}
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
            fontWeight: 700,
            fontSize: '13px',
            padding: '0 18px',
            height: '42px',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
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
          <div style={{ marginBottom: '32px' }}>
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
          <div key={b.name} style={{ marginBottom: '32px' }}>
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
          textAlign: 'center',
          padding: '48px 24px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
            Tidak ada proyek yang sesuai kriteria
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '420px', lineHeight: 1.5 }}>
            Tidak ditemukan proyek Greenfield dengan kata kunci pencarian atau filter branch yang dipilih.
          </p>
          {(search || selectedBranch !== 'Semua Branch') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedBranch('Semua Branch');
              }}
              style={{
                marginTop: '6px',
                padding: '8px 18px',
                background: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Reset Pencarian & Filter
            </button>
          )}
        </div>
      )}

      {/* Reusing the Review Modal and passing verifyActivity & rejectActivity */}
      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} rejectActivity={rejectActivity} deletePhoto={deletePhoto} />
    </div>
  );
});

export default UploadView;
