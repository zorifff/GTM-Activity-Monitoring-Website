import ProjectTable from '../ProjectTable';
import { formatBranch } from '../../utils';

// ─── TAB 1: MONITORING & VERIFIKASI PROYEK ───
export default function MonitoringTab({ priorityBranches, totalProjects, selectedBranch, setSelectedBranch, search, setSearch, statusFilter, setStatusFilter, isBranchDropdownOpen, setIsBranchDropdownOpen, isStatusDropdownOpen, setIsStatusDropdownOpen, statusCounts, branchesWithFilteredProjects, allProjectsMultiBranch, openModal, uploadPhoto }) {
  return (
    <div className="fade-in">
      {/* Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', position: 'relative', zIndex: 80, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)' }}>
        {/* Branch Filter Capsule Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => {
              setIsBranchDropdownOpen(!isBranchDropdownOpen);
              setIsStatusDropdownOpen(false);
            }}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '50px', 
              border: '1px solid #E2E8F0', 
              fontSize: '13px', 
              background: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              minWidth: '210px', 
              userSelect: 'none' 
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Branch:</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', fontWeight: 800, color: '#0F172A' }}>
              {selectedBranch === 'Semua Branch' 
                ? `Semua Branch (${totalProjects})` 
                : `${formatBranch(selectedBranch)} (${priorityBranches.find(x => x.name === selectedBranch)?.projects?.length || 0})`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isBranchDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '240px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
              <div 
                className={`dropdown-item ${selectedBranch === 'Semua Branch' ? 'active' : ''}`}
                onClick={() => { setSelectedBranch('Semua Branch'); setIsBranchDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: selectedBranch === 'Semua Branch' ? 800 : 600, color: selectedBranch === 'Semua Branch' ? '#C8102E' : '#334155', cursor: 'pointer' }}
              >
                Semua Branch ({totalProjects})
              </div>
              {priorityBranches.map(b => (
                <div 
                  key={b.name}
                  className={`dropdown-item ${selectedBranch === b.name ? 'active' : ''}`}
                  onClick={() => { setSelectedBranch(b.name); setIsBranchDropdownOpen(false); }}
                  style={{ padding: '12px 18px', fontSize: '13px', fontWeight: selectedBranch === b.name ? 800 : 600, color: selectedBranch === b.name ? '#C8102E' : '#334155', cursor: 'pointer' }}
                >
                  {formatBranch(b.name)} ({b.projects?.length || 0})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Capsule Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => {
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
              setIsBranchDropdownOpen(false);
            }}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '50px', 
              border: '1px solid #E2E8F0', 
              fontSize: '13px', 
              background: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              minWidth: '220px', 
              userSelect: 'none' 
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status:</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', fontWeight: 800, color: '#0F172A' }}>
              {statusFilter === 'all' 
                ? `Semua Status (${statusCounts.all})` 
                : statusFilter === 'need_review' 
                ? `Menunggu Verifikasi (${statusCounts.need_review})` 
                : statusFilter === 'verified' 
                ? `Sudah Terverifikasi (${statusCounts.verified})` 
                : `Belum Dikerjakan (${statusCounts.pending})`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isStatusDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '250px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
              <div 
                className={`dropdown-item ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('all'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'all' ? 800 : 600, color: statusFilter === 'all' ? '#C8102E' : '#334155', cursor: 'pointer' }}
              >
                Semua Status ({statusCounts.all})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'need_review' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('need_review'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'need_review' ? 800 : 600, color: statusFilter === 'need_review' ? '#C8102E' : '#334155', cursor: 'pointer' }}
              >
                Menunggu Verifikasi ({statusCounts.need_review})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'verified' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('verified'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'verified' ? 800 : 600, color: statusFilter === 'verified' ? '#C8102E' : '#334155', cursor: 'pointer' }}
              >
                Sudah Terverifikasi ({statusCounts.verified})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('pending'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'pending' ? 800 : 600, color: statusFilter === 'pending' ? '#C8102E' : '#334155', cursor: 'pointer' }}
              >
                Belum Dikerjakan ({statusCounts.pending})
              </div>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="search-container-mobile" style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Cari nama proyek, WOK, atau ODP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 20px', borderRadius: '50px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FFFFFF', outline: 'none' }}
          />
        </div>
      </div>

      {/* Project Table */}
      {branchesWithFilteredProjects.length > 0 ? (
        selectedBranch === 'Semua Branch' ? (
          <div style={{ marginBottom: '32px' }}>
            <ProjectTable 
              projects={allProjectsMultiBranch} 
              branchName="Multi Branch" 
              uploadPhoto={uploadPhoto}
              onReview={openModal}
            />
          </div>
        ) : (
          branchesWithFilteredProjects.map(b => (
            <div key={b.name} style={{ marginBottom: '32px' }}>
              <ProjectTable 
                projects={b.projects} 
                branchName={b.name} 
                uploadPhoto={uploadPhoto}
                onReview={openModal}
              />
            </div>
          ))
        )
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', color: '#64748B' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Tidak ada proyek yang sesuai filter</div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Coba ganti filter branch, status verifikasi, atau kata kunci pencarian Anda.</p>
        </div>
      )}
    </div>
  );
}
