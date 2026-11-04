import { useEffect } from 'react';

// Modal: Upload File Excel Data ODP
export default function OdpImportModal({
  isOpen,
  onClose,
  file,
  setFile,
  loading,
  importProgress,
  message,
  setMessage,
  error,
  setError,
  handleFileChange,
  handleUpload,
  setActiveInfoModal
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
      aria-labelledby="odp-modal-title"
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 id="odp-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload File Excel Data ODP
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Target: Data ODP &amp; Kapasitas Port Mingguan
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('odp')}
                title="Panduan Format Excel ODP"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                i
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog upload ODP"
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
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: file ? '#ECFDF5' : '#F8FAFC',
              border: file ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-odp-file-input"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Pilih File ODP</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: file ? '#065F46' : '#94A3B8',
                fontWeight: file ? 600 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
            </span>

            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (setMessage) setMessage(null);
                  if (setError) setError(null);
                }}
                title="Hapus file"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#800000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

            <input
              id="modal-odp-file-input"
              type="file"
              onClick={(e) => { e.currentTarget.value = ''; }}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#800000', fontSize: '13px', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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
              type="submit"
              disabled={loading || !file}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: loading || !file ? '#E2E8F0' : '#800000',
                color: loading || !file ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? `Sedang Membaca & Memperbarui...${importProgress ? ` (${importProgress})` : ''}` : 'Mulai Update ODP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

