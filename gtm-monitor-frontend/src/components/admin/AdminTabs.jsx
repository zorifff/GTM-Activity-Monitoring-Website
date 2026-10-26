// ─── 3. NAVIGATION TABS (SEAMLESS PILL TOGGLES) ───
export default function AdminTabs({ activeTab, setActiveTab, stats, setIsExportModalOpen }) {
  return (
    <div className="admin-tabs-container">
      <button
        className="admin-tab-btn"
        onClick={() => setActiveTab('monitoring')}
        style={{
          border: activeTab === 'monitoring' ? 'none' : '1px solid #E2E8F0',
          background: activeTab === 'monitoring' ? 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)' : '#FFFFFF',
          color: activeTab === 'monitoring' ? '#FFFFFF' : '#475569',
          boxShadow: activeTab === 'monitoring' ? '0 4px 16px rgba(200, 16, 46, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.02)'
        }}
      >
        <span>Monitoring & Verifikasi Proyek</span>
        {stats.actUploaded > 0 && (
          <span style={{ background: activeTab === 'monitoring' ? '#FFFFFF' : '#FF5E00', color: activeTab === 'monitoring' ? '#C8102E' : '#FFFFFF', padding: '2px 8px', borderRadius: '50px', fontSize: '11px', fontWeight: 900 }}>
            {stats.actUploaded}
          </span>
        )}
      </button>

      <button
        className="admin-tab-btn"
        onClick={() => setActiveTab('excel')}
        style={{
          border: activeTab === 'excel' ? 'none' : '1px solid #E2E8F0',
          background: activeTab === 'excel' ? 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)' : '#FFFFFF',
          color: activeTab === 'excel' ? '#FFFFFF' : '#475569',
          boxShadow: activeTab === 'excel' ? '0 4px 16px rgba(200, 16, 46, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.02)'
        }}
      >
        <span>Update Data Mingguan</span>
      </button>

      <button
        className="admin-tab-btn"
        onClick={() => setIsExportModalOpen(true)}
        style={{
          border: '1px solid #E2E8F0',
          background: '#FFFFFF',
          color: '#475569',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#FF5E00';
          e.currentTarget.style.color = '#C8102E';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#E2E8F0';
          e.currentTarget.style.color = '#475569';
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Export Rekap Excel</span>
      </button>
    </div>
  );
}
