// Kartu: Kelola & Hapus Program Terdaftar
export default function ProgramDeleteCard({ deleteProgramMonth, setDeleteProgramMonth, deleteProgramTarget, setDeleteProgramTarget, deleteAvailablePrograms, deleteLoading, deleteMessage, setDeleteMessage, deleteError, setDeleteError, setShowDeleteConfirmModal }) {
  return (
    <div style={{ padding: '28px', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '20px', minHeight: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0' }}>
              Hapus Program Terdaftar
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
              Hapus program yang terdaftar di menu Program secara spesifik berdasarkan bulan atau hapus seluruh program pada periode tersebut.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Status Periode:</span>
            <div style={{
              padding: '4px 12px',
              borderRadius: '10px',
              background: deleteAvailablePrograms.length > 0 ? '#ECFDF5' : '#F1F5F9',
              border: deleteAvailablePrograms.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
              color: deleteAvailablePrograms.length > 0 ? '#047857' : '#64748B',
              fontSize: '12px',
              fontWeight: 700
            }}>
              {deleteAvailablePrograms.length > 0 ? `${deleteAvailablePrograms.length} Program Ditemukan` : 'Tidak Ada Program'}
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {/* Select Month */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>1. Pilih Periode Bulan:</label>
              <select
                value={deleteProgramMonth}
                onChange={(e) => {
                  setDeleteProgramMonth(e.target.value);
                  setDeleteProgramTarget('ALL');
                  setDeleteMessage(null);
                  setDeleteError(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 700,
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

            {/* Select Specific Program or ALL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>2. Pilih Opsi Program yang Ingin Dihapus:</label>
              <select
                value={deleteProgramTarget}
                onChange={(e) => {
                  setDeleteProgramTarget(e.target.value);
                  setDeleteMessage(null);
                  setDeleteError(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">Semua Program di Bulan {deleteProgramMonth}</option>
                {deleteAvailablePrograms.map((p, idx) => {
                  const pName = p.sheetName || p.name || `Program #${idx + 1}`;
                  const slideCount = Array.isArray(p.images) && p.images.length > 0 ? p.images.length : (p.imageUrl ? 1 : 0);
                  const slideLabel = slideCount > 1 ? ` (${slideCount} Slide Gambar)` : '';
                  return (
                    <option key={idx} value={pName}>
                      {pName}{slideLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {deleteMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
              {deleteMessage}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
              {deleteError}
            </div>
          )}

          {/* Telkomsel Red Gradient Delete Button */}
          <button
            type="button"
            onClick={() => {
              setDeleteMessage(null);
              setDeleteError(null);
              setShowDeleteConfirmModal(true);
            }}
            disabled={deleteLoading}
            style={{
              width: '100%',
              padding: '13px 24px',
              background: deleteLoading ? '#CBD5E1' : 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50px',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '1px',
              cursor: deleteLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: deleteLoading ? 'none' : '0 4px 16px rgba(200, 16, 46, 0.3)',
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
