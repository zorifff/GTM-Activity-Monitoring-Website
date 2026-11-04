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
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
          Data Branch "{activeBranch}" Tidak Ditemukan
        </div>
        <button
          type="button"
          onClick={goDashboard}
          style={{ padding: '8px 20px', borderRadius: '8px', background: '#800000', color: '#FFF', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: '12px', fontSize: '13px' }}
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
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: '28px', fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
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
              fontWeight: 600,
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
            {priorityProjects.length.toLocaleString('id-ID')}
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
              fontWeight: 600,
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
            {stats.odpCount.toLocaleString('id-ID')}
            <span
              style={{
                fontSize: '20px',
                fontWeight: 500,
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
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontWeight: 600,
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
              fontWeight: 600,
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
            {stats.actVerified.toLocaleString('id-ID')}
            <span
              style={{
                fontSize: '20px',
                fontWeight: 500,
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
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: stats.actUploaded > 0 ? '#B45309' : '#1E293B',
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
      <div className="controls-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
