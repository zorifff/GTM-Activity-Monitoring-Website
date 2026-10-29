import { useEffect } from 'react';

// Modal Konfirmasi Export Rekap Excel
export default function ExportRekapModal({ setIsExportModalOpen, handleExportRekapExcel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsExportModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsExportModalOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-rekap-title"
      onClick={() => setIsExportModalOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div>
            <h3 id="export-rekap-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Konfirmasi Export Rekap</h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Format File Excel (.xlsx)</span>
          </div>
        </div>

        <p style={{ fontSize: '13.5px', color: '#334155', margin: '0 0 20px 0', lineHeight: '1.5' }}>
          Apakah Anda yakin ingin mengunduh rekapitulasi data LOP & status kegiatan dari seluruh branch ke dalam file Excel?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => setIsExportModalOpen(false)}
            style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            Batal
          </button>
          <button
            onClick={() => {
              setIsExportModalOpen(false);
              handleExportRekapExcel();
            }}
            style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)' }}
          >
            Unduh Excel
          </button>
        </div>
      </div>
    </div>
  );
}
