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
              fontWeight: 600,
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
              fontWeight: 600,
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
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Kapasitas:{' '}
            <span
              style={{
                fontWeight: 600,
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
              fontWeight: 600,
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
              fontWeight: 600,
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
                fontWeight: 500,
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
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Mencakup{' '}
            <span
              style={{
                fontWeight: 600,
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
              fontWeight: 600,
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
              fontWeight: 600,
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
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Terverifikasi:{' '}
            <span
              style={{
                fontWeight: 600,
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
            <span className="branch-text-label" style={{ fontWeight: 600, fontSize: '13px' }}>Branch: {formatBranch(branches[0].name)}</span>
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
              <span className="branch-text-label" style={{ flex: 1, fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
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
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === 'Semua Branch' ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', fontWeight: selectedBranch === 'Semua Branch' ? 600 : 500, color: '#0F172A', cursor: 'pointer' }}
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
                    style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === b.name ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', fontWeight: selectedBranch === b.name ? 600 : 500, color: '#0F172A', cursor: 'pointer' }}
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
                fontWeight: 600,
                flexShrink: 0,
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
                border: isStatusFiltered ? '1.5px solid #800000' : '1px solid #CBD5E1',
                backgroundColor: isStatusFiltered ? '#FEF2F2' : '#FFFFFF',
                color: isStatusFiltered ? '#800000' : '#0F172A',
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
              <span className="status-text-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                Status ({statusMatchingProjectsCount})
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isStatusFiltered ? '#800000' : '#64748B'}
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
                  fontWeight: 500,
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
                    fontWeight: 600,
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
                  <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
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
                        <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: isChecked ? 600 : 500 }}>
                          {st}
                        </span>
                        <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
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
            fontWeight: 600,
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
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.1px' }}>
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
