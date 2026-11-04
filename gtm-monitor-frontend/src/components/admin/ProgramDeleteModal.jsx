import { useEffect } from 'react';

// Modal: Kelola & Hapus Program Terdaftar
export default function ProgramDeleteModal({
  isOpen,
  onClose,
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
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <h3 id="delete-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Kelola &amp; Hapus Program Terdaftar
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Hapus program terdaftar spesifik per bulan atau periode
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog hapus program"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Status Periode Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status Periode:</span>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              background: deleteAvailablePrograms.length > 0 ? '#ECFDF5' : '#F1F5F9',
              border: deleteAvailablePrograms.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
              color: deleteAvailablePrograms.length > 0 ? '#047857' : '#64748B',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {deleteAvailablePrograms.length > 0 ? `${deleteAvailablePrograms.length} Program Ditemukan` : 'Tidak Ada Program Terdaftar'}
          </div>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Pilih Periode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>1. Pilih Periode Bulan:</label>
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

          {/* Pilih Opsi Program */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>2. Pilih Opsi Program yang Ingin Dihapus:</label>
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

          {deleteMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {deleteMessage}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#800000', fontSize: '13px', fontWeight: 600 }}>
              {deleteError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={deleteLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirmModal(true);
              }}
              disabled={deleteLoading || deleteAvailablePrograms.length === 0}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: deleteLoading || deleteAvailablePrograms.length === 0 ? '#E2E8F0' : '#800000',
                color: deleteLoading || deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: deleteLoading || deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
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
    </div>
  );
}

