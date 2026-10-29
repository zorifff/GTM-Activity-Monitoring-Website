import { useState, useMemo, memo, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ACT_TYPES, actMeta, formatBranch } from '../utils';
import ActivityStatus from './ActivityStatus';
import UploadModal from './UploadModal';
import ConfirmSubmitModal from './ConfirmSubmitModal';

// Pilihan "Semua proyek" pada jumlah per halaman: seluruh baris ditampilkan dengan virtual scroll
// (hanya baris yang terlihat di layar yang dirender) agar ribuan proyek tetap ringan.
const PAGE_SIZE_ALL = 'all';
const PAGE_SIZE_OPTIONS = [15, 25, 50, PAGE_SIZE_ALL];
const ESTIMATED_ROW_HEIGHT = 64;

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const SortIcon = ({ sort }) => {
  if (sort === 'asc') {
    return (
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="18 15 12 9 6 15" />
      </svg>
    );
  }
  if (sort === 'desc') {
    return (
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
      <polyline points="8 9 12 5 16 9" />
      <polyline points="16 15 12 19 8 15" />
    </svg>
  );
};

// ─── OPTIMASI 3: ON-DEMAND LOADING & MEMOIZED ODP ROW ───
const OdpRow = memo(({ o, odpGrid }) => {
  const occRate = o.total > 0 ? Math.round((o.used / o.total) * 100) : 0;
  const badgeBg = o.used === 0 ? '#e2e8f0' : occRate < 50 ? '#dcfce7' : occRate < 75 ? '#fef3c7' : '#fee2e2';
  const badgeColor = o.used === 0 ? '#334155' : occRate < 50 ? '#16a34a' : occRate < 75 ? '#B45309' : '#dc2626';

  return (
    <div
      className="table-row"
      style={{ gridTemplateColumns: odpGrid, backgroundColor: '#fafbfc', borderTop: '1px solid #f8fafc', minHeight: '44px' }}
    >
      <div></div>
      <div style={{ fontSize: '13px', fontWeight: 600, paddingLeft: '14px', textAlign: 'left' }}>{o.odp}</div>

      <div style={{
        fontSize: '11.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px',
        display: 'inline-block',
        backgroundColor: badgeBg,
        color: badgeColor,
        textAlign: 'center'
      }}>
        {o.total > 0 ? `${occRate}%` : '-'}
      </div>

      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.used || 0).toLocaleString('id-ID')}</div>
      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.avai || 0).toLocaleString('id-ID')}</div>
      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.total || 0).toLocaleString('id-ID')}</div>
    </div>
  );
});

// ─── OPTIMASI 2: REACT RENDER OPTIMIZATION (MEMOIZED PROJECT ROW) ───
const ProjectRow = memo(({ p, branchName, isExpanded, toggleProject, onReview, onOpenUploadModal, tableGrid, odpGrid, isEven = false }) => {
  const pOdps = p.odps || [];
  const usedTotal = p.usedTotal;
  const avaiTotal = p.avaiTotal;
  const totalPort = p.totalPort;
  const bName = p.branchName || branchName;
  const projectActivities = p.activities || [];

  return (
    <div>
      {/* Project row with activity status & action buttons */}
      <div
        className={`table-row ${isEven ? 'table-row-even' : ''}`}
        style={{ gridTemplateColumns: tableGrid }}
      >
        <button
          type="button"
          aria-label={isExpanded ? `Ciutkan detail proyek ${p.name}` : `Perluas detail proyek ${p.name}`}
          aria-expanded={isExpanded}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', background: 'transparent', border: 'none', padding: 0 }}
          onClick={() => toggleProject(p.name)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Toggle detail proyek ${p.name}`}
          style={{
            fontSize: '13.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left',
            color: '#0F172A', display: 'block', width: '100%'
          }}
          onClick={() => toggleProject(p.name)}
        >
          {p.name}
        </button>
        <button
          type="button"
          aria-label={`Toggle detail WOK ${p.wok}`}
          style={{
            fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left',
            display: 'block', width: '100%', fontWeight: 500
          }}
          onClick={() => toggleProject(p.name)}
        >
          {formatBranch(bName)} · {p.wok}
        </button>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(usedTotal || 0).toLocaleString('id-ID')}</div>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(avaiTotal || 0).toLocaleString('id-ID')}</div>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(totalPort || 0).toLocaleString('id-ID')}</div>

        {/* Activity cells using unified ActivityStatus component */}
        {ACT_TYPES.map(actType => {
          const a = projectActivities.find(x => x.type === actType.key);
          const rawStatus = a?.status || 'belum';
          const photos = a?.photos || [];
          const verifiedPhotos = photos.filter(ph => ph.status === 'verified');
          const pendingPhotos = photos.filter(ph => ph.status === 'upload');
          const rejectedPhotos = photos.filter(ph => ph.status === 'rejected' || ph.status === 'gagal');

          let status = 'belum';
          if (rawStatus === 'verified' || verifiedPhotos.length > 0) {
            status = 'selesai';
          } else if (rawStatus === 'upload' || pendingPhotos.length > 0) {
            status = 'menunggu_verifikasi';
          } else if (rawStatus === 'gagal' || rawStatus === 'rejected' || rejectedPhotos.length > 0) {
            status = 'gagal';
          } else if (rawStatus === 'proses' || rawStatus === 'processing') {
            status = 'proses';
          }

          const verifiedCount = verifiedPhotos.length > 0 ? verifiedPhotos.length : (status === 'selesai' ? 1 : 0);
          const label = status === 'selesai' && verifiedCount > 1 ? `Selesai (${verifiedCount})` : undefined;

          const handleAction = () => {
            if (status === 'menunggu_verifikasi') {
              onReview && onReview(bName, p.name);
            } else {
              onOpenUploadModal && onOpenUploadModal({ branchName: bName, projectName: p.name, actTypeObj: actType });
            }
          };

          return (
            <div
              key={actType.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 4px',
                alignSelf: 'center'
              }}
            >
              <ActivityStatus
                status={status}
                label={label}
                count={verifiedCount}
                onAction={handleAction}
                onClick={handleAction}
                title={actType.label}
              />
            </div>
          );
        })}

        {/* Kolom ringkasan progres per proyek (badge + mini progress bar) */}
        {(() => {
          const completedCount = ACT_TYPES.reduce((count, actType) => {
            const a = projectActivities.find(x => x.type === actType.key);
            const isVerified = a?.status === 'verified' || (a?.photos && a.photos.some(ph => ph.status === 'verified'));
            return count + (isVerified ? 1 : 0);
          }, 0);
          const progressPct = Math.round((completedCount / ACT_TYPES.length) * 100);

          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0 6px',
                alignSelf: 'center'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: completedCount === ACT_TYPES.length ? '#15803D' : completedCount > 0 ? '#B45309' : '#64748B',
                  whiteSpace: 'nowrap'
                }}
              >
                {completedCount}/{ACT_TYPES.length} Selesai
              </span>
              <div
                style={{
                  width: '64px',
                  height: '5px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '9999px',
                  overflow: 'hidden'
                }}
                title={`Progres kegiatan GTM: ${completedCount} dari ${ACT_TYPES.length} selesai (${progressPct}%)`}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    backgroundColor: completedCount === ACT_TYPES.length ? '#16A34A' : completedCount > 0 ? '#D97706' : '#94A3B8',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* Kolom Detail / Review sejajar dan tidak terpotong di tepi kanan */}
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReview && onReview(bName, p.name); }}
            aria-label={`Buka detail dan review proyek ${p.name}`}
            title={`Lihat detail & review foto proyek ${p.name}`}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '32px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            Review
          </button>
        </div>
      </div>

      {/* ODP rows on-demand loading */}
      {isExpanded && pOdps.map((o) => (
        <OdpRow key={o.odp} o={o} odpGrid={odpGrid} />
      ))}
    </div>
  );
});

export default function ProjectTable({ projects, branchName, onReview, uploadPhoto, isLoading = false, onResetSearch }) {
  const [expanded, setExpanded] = useState({});
  const [filterPopup, setFilterPopup] = useState(null);
  const [filters, setFilters] = useState({
    name: { sort: null, search: '', unchecked: [] },
    wok: { sort: null, search: '', unchecked: [] },
    usedTotal: { sort: null, search: '', unchecked: [] },
    avaiTotal: { sort: null, search: '', unchecked: [] },
    totalPort: { sort: null, search: '', unchecked: [] }
  });

  // ─── FILTER POPUP REF & CLICK OUTSIDE LISTENER ───
  const popupRef = useRef(null);

  useEffect(() => {
    if (!filterPopup) return;
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setFilterPopup(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFilterPopup(null);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterPopup]);

  // ─── OPTIMASI 1: PAGINATION STATE ───
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const pageSizeRef = useRef(null);

  // Keyboard Escape and click-outside listener for page size dropdown (R-32)
  useEffect(() => {
    if (!isPageSizeOpen) return;
    const handleClickOutside = (e) => {
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target)) {
        setIsPageSizeOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPageSizeOpen]);

  // ─── UPLOAD MODAL STATE ───
  const [activeUploadData, setActiveUploadData] = useState(null);
  const [confirmSubmitData, setConfirmSubmitData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleProject = useCallback((projectName) => {
    setExpanded(prev => ({ ...prev, [projectName]: !prev[projectName] }));
  }, []);

  // ─── OPTIMASI 2: GUNAKAN NILAI PRE-COMPUTED DARI SERVER ───
  // usedTotal, avaiTotal, totalPort, occRate sudah dihitung di server.js — tidak perlu reduce() di sini.
  const projectsWithTotals = useMemo(() => {
    return (Array.isArray(projects) ? projects : []).map(p => {
      const odps = Array.isArray(p.odps) ? p.odps : [];
      return {
        ...p,
        wok: p.wok || '-',
        usedTotal: p.usedTotal ?? odps.reduce((s, o) => s + (o.used || 0), 0),
        avaiTotal: p.avaiTotal ?? odps.reduce((s, o) => s + (o.avai || 0), 0),
        totalPort: p.totalPort ?? odps.reduce((s, o) => s + (o.total || 0), 0),
      };
    });
  }, [projects]);

  const displayProjects = useMemo(() => {
    let list = [...projectsWithTotals];

    // Apply filtering
    ['wok', 'usedTotal', 'avaiTotal', 'totalPort'].forEach(col => {
      const f = filters[col];
      if (f && f.unchecked && f.unchecked.length > 0) {
        const uncheckedStr = f.unchecked.map(String);
        list = list.filter(p => !uncheckedStr.includes(String(p[col] ?? '-')));
      }
    });

    // Apply sorting
    const sortCol = ['name', 'wok', 'usedTotal', 'avaiTotal', 'totalPort'].find(col => filters[col]?.sort);
    if (sortCol) {
      const sortDir = filters[sortCol].sort;
      if (sortCol === 'name' || sortCol === 'wok') {
        list.sort((a, b) => {
          const valA = String(a[sortCol] || '');
          const valB = String(b[sortCol] || '');
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      } else {
        list.sort((a, b) => {
          const numA = Number(a[sortCol]) || 0;
          const numB = Number(b[sortCol]) || 0;
          return sortDir === 'asc' ? numA - numB : numB - numA;
        });
      }
    }

    return list;
  }, [projectsWithTotals, filters]);

  // Reset page ke 1 jika filter berubah atau daftar proyek berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [displayProjects.length, filters]);

  const isShowAll = pageSize === PAGE_SIZE_ALL;
  const totalPages = isShowAll ? 1 : (Math.ceil(displayProjects.length / pageSize) || 1);
  const paginatedProjects = useMemo(() => {
    if (isShowAll) return displayProjects;
    const start = (currentPage - 1) * pageSize;
    return displayProjects.slice(start, start + pageSize);
  }, [displayProjects, currentPage, pageSize, isShowAll]);
  const rangeStart = displayProjects.length > 0 ? (isShowAll ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const rangeEnd = isShowAll ? displayProjects.length : Math.min(currentPage * pageSize, displayProjects.length);

  // ─── OPTIMASI 4: VIRTUALISASI BARIS (mode "Semua proyek") ───
  // Tinggi tiap baris diukur otomatis (baris yang di-expand menampilkan daftar ODP sehingga lebih tinggi)
  const scrollRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: isShowAll ? displayProjects.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => displayProjects[index]?.name ?? index,
    overscan: 10,
    enabled: isShowAll
  });
  const virtualRows = isShowAll ? rowVirtualizer.getVirtualItems() : [];
  const virtualPaddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const virtualPaddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

  const renderProjectRow = (p, idx) => (
    <ProjectRow
      key={p.name}
      p={p}
      branchName={branchName}
      isExpanded={Boolean(expanded[p.name])}
      toggleProject={toggleProject}
      onReview={onReview}
      onOpenUploadModal={setActiveUploadData}
      tableGrid={tableGrid}
      odpGrid={odpGrid}
      isEven={idx % 2 === 1}
    />
  );

  const updateFilter = (col, key, val) => {
    setFilters(prev => {
      const newState = { ...prev };
      if (key === 'sort' && val !== null) {
        ['name', 'wok', 'usedTotal', 'avaiTotal', 'totalPort'].forEach(c => {
          if (c !== col) newState[c].sort = null;
        });
      }
      newState[col] = { ...newState[col], [key]: val };
      return newState;
    });
  };

  const handleSortCycle = (col) => {
    const current = filters[col]?.sort;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';
    updateFilter(col, 'sort', next);
  };

  const renderSortableHeader = (label, col, align = 'left', hasFilter = false) => {
    const isFiltered = (filters[col]?.unchecked?.length > 0) || Boolean(filters[col]?.search);
    const sort = filters[col]?.sort;

    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: '4px',
          paddingRight: align === 'right' ? '8px' : '0',
          paddingLeft: align === 'left' ? '2px' : '0',
          width: '100%'
        }}
      >
        <button
          type="button"
          onClick={() => handleSortCycle(col)}
          aria-label={`Urutkan kolom ${label} (${sort === 'asc' ? 'naik' : sort === 'desc' ? 'turun' : 'belum diurutkan'})`}
          title={`Klik untuk mengurutkan ${label}`}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            font: 'inherit',
            color: sort ? '#0F172A' : '#475569',
            fontWeight: sort ? 900 : 800,
            textTransform: 'inherit',
            letterSpacing: 'inherit'
          }}
        >
          <span>{label}</span>
          <SortIcon sort={sort} />
        </button>

        {hasFilter && (
          <button
            type="button"
            aria-label={`Filter kolom ${label}`}
            onClick={(e) => { e.stopPropagation(); setFilterPopup(filterPopup === col ? null : col); }}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: isFiltered ? '#C8102E' : '#94A3B8',
              padding: '2px',
              borderRadius: '4px',
              marginLeft: '2px'
            }}
            title={`Filter kolom ${label}`}
          >
            <FilterIcon />
          </button>
        )}

        {hasFilter && renderFilterPopup(col)}
      </div>
    );
  };

  const renderFilterPopup = (col) => {
    if (filterPopup !== col) return null;

    const valueCounts = {};
    projectsWithTotals.forEach(p => {
      const v = p[col] ?? '-';
      valueCounts[v] = (valueCounts[v] || 0) + 1;
    });

    const isStringCol = col === 'wok';
    const allValues = isStringCol
      ? Object.keys(valueCounts).sort((a, b) => a.localeCompare(b))
      : Object.keys(valueCounts).map(Number).sort((a, b) => a - b);

    const searchLower = (filters[col].search || '').toLowerCase();
    const visibleValues = allValues.filter(v => v.toString().toLowerCase().includes(searchLower));
    const currentUncheckedStr = (filters[col].unchecked || []).map(String);

    return (
      <div
        ref={popupRef}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '6px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.22)',
          zIndex: 99999,
          width: '210px',
          padding: '12px',
          fontSize: '12px',
          color: '#334155',
          fontWeight: 500,
          textAlign: 'left',
          textTransform: 'none',
          letterSpacing: 'normal'
        }}
      >
        <button
          type="button"
          onClick={() => { updateFilter(col, 'sort', filters[col].sort === 'asc' ? null : 'asc'); setFilterPopup(null); }}
          style={{ width: '100%', border: 'none', padding: '6px 10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: filters[col].sort === 'asc' ? '#F1F5F9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: filters[col].sort === 'asc' ? '#C8102E' : '#334155', textAlign: 'left' }}
        >
          <span style={{ fontSize: '14px' }}>↓</span> {isStringCol ? 'Sort A to Z' : 'Sort Kecil ke Besar'}
        </button>
        <button
          type="button"
          onClick={() => { updateFilter(col, 'sort', filters[col].sort === 'desc' ? null : 'desc'); setFilterPopup(null); }}
          style={{ width: '100%', border: 'none', padding: '6px 10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: filters[col].sort === 'desc' ? '#F1F5F9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: filters[col].sort === 'desc' ? '#C8102E' : '#334155', textAlign: 'left' }}
        >
          <span style={{ fontSize: '14px' }}>↑</span> {isStringCol ? 'Sort Z to A' : 'Sort Besar ke Kecil'}
        </button>

        <div style={{ height: '1px', background: '#E2E8F0', margin: '8px 0' }} />

        <input
          type="text"
          placeholder={`Cari ${col === 'wok' ? 'WOK' : 'nilai'}...`}
          aria-label={`Cari filter ${col}`}
          value={filters[col].search}
          onChange={e => updateFilter(col, 'search', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', marginBottom: '8px', fontSize: '11.5px' }}
        />

        <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '2px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer', fontWeight: 700, borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
            <input
              type="checkbox"
              checked={currentUncheckedStr.length === 0}
              onChange={(e) => {
                if (e.target.checked) updateFilter(col, 'unchecked', []);
                else updateFilter(col, 'unchecked', allValues.map(String));
              }}
            />
            (Pilih Semua)
          </label>
          {visibleValues.map(v => {
            const strVal = String(v);
            const isChecked = !currentUncheckedStr.includes(strVal);
            return (
              <label key={strVal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ flexShrink: 0 }}
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilter(col, 'unchecked', currentUncheckedStr.filter(x => x !== strVal));
                    } else {
                      updateFilter(col, 'unchecked', [...currentUncheckedStr, strVal]);
                    }
                  }}
                />
                <span style={{ lineHeight: '1.3', fontSize: '11.5px', color: '#0F172A' }}>
                  {strVal} <span style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 600 }}>({valueCounts[v]})</span>
                </span>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={() => {
              updateFilter(col, 'unchecked', []);
              updateFilter(col, 'search', '');
              updateFilter(col, 'sort', null);
            }}
            style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setFilterPopup(null)}
            style={{ padding: '4px 12px', border: 'none', borderRadius: '6px', background: '#0F172A', color: '#FFFFFF', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
          >
            Terapkan
          </button>
        </div>
      </div>
    );
  };

  const tableGrid = '34px 210px 130px 80px 80px 80px 120px 120px 120px 120px 120px 115px 85px';
  const odpGrid = '34px 210px 130px 80px 80px 80px';

  return (
    <div className="card" style={{ position: 'relative', overflow: filterPopup ? 'visible' : 'hidden' }}>
      <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: filterPopup ? 'visible' : 'auto', maxHeight: '75vh' }}>
        <div style={{ minWidth: 'max-content', paddingBottom: filterPopup ? '400px' : '0' }}>
          {/* Header */}
          <div
            className="table-header"
            style={{
              gridTemplateColumns: tableGrid,
              position: 'sticky',
              top: 0,
              zIndex: 20,
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div></div>
            {renderSortableHeader('Nama Proyek', 'name', 'left', false)}
            {renderSortableHeader('Branch / WOK', 'wok', 'left', true)}
            {renderSortableHeader('Used', 'usedTotal', 'right', true)}
            {renderSortableHeader('Available', 'avaiTotal', 'right', true)}
            {renderSortableHeader('Total', 'totalPort', 'right', true)}
            {ACT_TYPES.map(t => (
              <div key={t.key} className="activity-col-header">{t.label}</div>
            ))}
            <div style={{ textAlign: 'center', padding: '0 4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Progres</div>
            <div style={{ textAlign: 'center', padding: '0 4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Detail</div>
          </div>

          {/* Rows / Skeleton / Empty State */}
          {isLoading ? (
            <div style={{ padding: '4px 0' }}>
              {[1, 2, 3, 4, 5].map(idx => (
                <div
                  key={idx}
                  className="table-row"
                  style={{ gridTemplateColumns: tableGrid, minHeight: '52px' }}
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '150px', height: '14px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '90px', height: '12px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  {[1, 2, 3, 4, 5].map(actIdx => (
                    <div key={actIdx} style={{ width: '68px', height: '24px', borderRadius: '6px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                  ))}
                  <div style={{ width: '64px', height: '14px', borderRadius: '4px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '56px', height: '28px', borderRadius: '8px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          ) : isShowAll ? (
            <>
              <div style={{ height: `${virtualPaddingTop}px` }} />
              {virtualRows.map(virtualRow => (
                <div key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement}>
                  {renderProjectRow(displayProjects[virtualRow.index], virtualRow.index)}
                </div>
              ))}
              <div style={{ height: `${virtualPaddingBottom}px` }} />
            </>
          ) : (
            paginatedProjects.map((p, idx) => renderProjectRow(p, idx))
          )}

          {paginatedProjects.length === 0 && !isLoading && (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Tidak ada proyek yang sesuai dengan filter
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '420px', lineHeight: 1.5 }}>
                Hasil tidak ditemukan untuk filter atau kata kunci saat ini. Silakan atur ulang filter kolom untuk melihat seluruh data.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    name: { sort: null, search: '', unchecked: [] },
                    wok: { sort: null, search: '', unchecked: [] },
                    usedTotal: { sort: null, search: '', unchecked: [] },
                    avaiTotal: { sort: null, search: '', unchecked: [] },
                    totalPort: { sort: null, search: '', unchecked: [] }
                  });
                  if (onResetSearch) onResetSearch();
                }}
                aria-label="Reset semua filter tabel"
                style={{
                  marginTop: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset Filter</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {activeUploadData && (
        <UploadModal
          data={activeUploadData}
          onClose={() => setActiveUploadData(null)}
          onSubmit={(payload) => {
            setConfirmSubmitData({
              ...activeUploadData,
              actLabel: activeUploadData.actTypeObj.label,
              payload
            });
          }}
        />
      )}

      {/* Confirm Submit Modal */}
      {confirmSubmitData && (
        <ConfirmSubmitModal
          data={confirmSubmitData}
          isSubmitting={isSubmitting}
          onCancel={() => setConfirmSubmitData(null)}
          onConfirm={async () => {
            setIsSubmitting(true);
            try {
              let result = null;
              if (uploadPhoto) {
                result = await uploadPhoto(
                  confirmSubmitData.branchName,
                  confirmSubmitData.projectName,
                  confirmSubmitData.actTypeObj.key,
                  confirmSubmitData.payload
                );
              }
              setConfirmSubmitData(null);
              // Jika gagal, form upload tetap terbuka agar data yang sudah diisi tidak hilang
              if (!result || result.success !== false) {
                setActiveUploadData(null);
              }
            } catch (err) {
              console.error('Submit error:', err);
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      )}

      {/* Pagination Footer */}
      <div className="table-pagination-footer">
        <div className="tabular-nums" style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          Menampilkan <span style={{ color: '#0f172a', fontWeight: 700 }}>{rangeStart}</span> - <span style={{ color: '#0f172a', fontWeight: 700 }}>{rangeEnd}</span> dari <span style={{ color: '#0f172a', fontWeight: 700 }}>{displayProjects.length}</span> proyek
        </div>

        <div className="table-pagination-controls">
          {/* Custom Capsule Dropup for Page Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            <span>Per halaman:</span>
            <div ref={pageSizeRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                aria-haspopup="listbox"
                aria-expanded={isPageSizeOpen}
                aria-label="Pilih jumlah data per halaman"
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                <span>{isShowAll ? 'Semua' : pageSize} proyek</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isPageSizeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isPageSizeOpen && (
                <div 
                  role="listbox"
                  aria-label="Daftar pilihan baris per halaman"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: '6px',
                    width: '120px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    overflow: 'hidden'
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={pageSize === size}
                      className={`dropdown-item ${pageSize === size ? 'active' : ''}`}
                      onClick={() => { setPageSize(size); setCurrentPage(1); setIsPageSizeOpen(false); }}
                      style={{
                        width: '100%',
                        border: 'none',
                        textAlign: 'left',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: pageSize === size ? 800 : 600,
                        color: pageSize === size ? '#C8102E' : '#334155',
                        background: pageSize === size ? '#FEF2F2' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {size === PAGE_SIZE_ALL ? 'Semua' : size} proyek
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Capsule Arrow Buttons for Prev / Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              aria-label="Halaman Sebelumnya"
              title="Halaman Sebelumnya"
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f1f5f9' : '#fff',
                color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>

            <span className="tabular-nums" style={{ padding: '0 6px', fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              aria-label="Halaman Selanjutnya"
              title="Halaman Selanjutnya"
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: currentPage === totalPages ? '#f1f5f9' : '#fff',
                color: currentPage === totalPages ? '#94a3b8' : '#0f172a',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
