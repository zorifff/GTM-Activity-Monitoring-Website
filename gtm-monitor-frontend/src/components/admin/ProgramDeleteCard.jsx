// Kartu: Kelola & Hapus Program Terdaftar
export default function ProgramDeleteCard({
  deleteProgramMonth,
  setDeleteProgramMonth,
  deleteProgramTarget,
  setDeleteProgramTarget,
  deleteAvailablePrograms = [],
  deleteLoading,
  deleteMessage,
  setDeleteMessage,
  deleteError,
  setDeleteError,
  setShowDeleteConfirmModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px', color: '#0F172A', margin: '0' }}>
              Hapus Program Terdaftar
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status Periode:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                background: deleteAvailablePrograms.length > 0 ? '#ECFDF5' : '#F1F5F9',
                border: deleteAvailablePrograms.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                color: deleteAvailablePrograms.length > 0 ? '#047857' : '#64748B',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              {deleteAvailablePrograms.length > 0 ? `${deleteAvailablePrograms.length} Program Ditemukan` : 'Tidak Ada Program'}
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {/* Select Month */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>1. Pilih Periode Bulan:</label>
              <select
                value={deleteProgramMonth}
                onChange={(e) => {
                  setDeleteProgramMonth(e.target.value);
                  setDeleteProgramTarget('ALL');
                  if (setDeleteMessage) setDeleteMessage(null);
                  if (setDeleteError) setDeleteError(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Maret 2026">Maret 2026</option>
                <option value="April 2026">April 2026</option>
                <option value="Mei 2026">Mei 2026</option>
                <option value="Juni 2026">Juni 2026</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Agustus 2026">Agustus 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="Oktober 2026">Oktober 2026</option>
                <option value="November 2026">November 2026</option>
                <option value="Desember 2026">Desember 2026</option>
              </select>
            </div>

            {/* Select Program Option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>2. Pilih Opsi Program yang Ingin Dihapus:</label>
              <select
                value={deleteProgramTarget}
                onChange={(e) => {
                  setDeleteProgramTarget(e.target.value);
                  if (setDeleteMessage) setDeleteMessage(null);
                  if (setDeleteError) setDeleteError(null);
                }}
                disabled={deleteAvailablePrograms.length === 0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: deleteAvailablePrograms.length === 0 ? '#F1F5F9' : '#FFFFFF',
                  color: deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="ALL">Seluruh Program di Periode Ini ({deleteAvailablePrograms.length} Program)</option>
                {deleteAvailablePrograms.map((p, idx) => (
                  <option key={idx} value={p.sheetName || p.name}>
                    Hanya: {p.sheetName || p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {deleteMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {deleteMessage}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {deleteError}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            disabled={deleteLoading || deleteAvailablePrograms.length === 0}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: deleteLoading || deleteAvailablePrograms.length === 0 ? '#E2E8F0' : '#DC2626',
              color: deleteLoading || deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: deleteLoading || deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>{deleteLoading ? 'Memproses Hapus...' : 'Hapus Program'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
