import { useEffect } from 'react';

// Modal Konfirmasi Hapus Program
export default function DeleteProgramConfirmModal({ deleteProgramMonth, deleteProgramTarget, deleteLoading, setShowDeleteConfirmModal, handleExecuteDeleteProgram }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !deleteLoading) {
        setShowDeleteConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteLoading, setShowDeleteConfirmModal]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-prog-title"
      onClick={() => { if (!deleteLoading) setShowDeleteConfirmModal(false); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100006,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
            border: '1px solid #FDA4AF',
            color: '#E11D48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 6px 16px rgba(225, 29, 72, 0.15)'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 id="delete-prog-title" style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 10px 0', fontFamily: "var(--font-heading)" }}>
          Konfirmasi Hapus Program
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px 0', fontWeight: 500 }}>
          Apakah Anda yakin ingin menghapus data program terdaftar ini? Program akan terhapus dari menu navigasi program.
        </p>

        <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px 16px', marginBottom: '22px', border: '1px solid #E2E8F0', textAlign: 'left', fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Periode Bulan:</span>{' '}
            <strong style={{ color: '#0F172A', fontWeight: 700 }}>{deleteProgramMonth}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Target Hapus:</span>{' '}
            <strong style={{ color: '#DC2626', fontWeight: 700 }}>
              {deleteProgramTarget === 'ALL' ? `Semua Program di ${deleteProgramMonth}` : deleteProgramTarget}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(false)}
            disabled={deleteLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: deleteLoading ? 'not-allowed' : 'pointer'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteDeleteProgram}
            disabled={deleteLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: deleteLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
            }}
          >
            {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
