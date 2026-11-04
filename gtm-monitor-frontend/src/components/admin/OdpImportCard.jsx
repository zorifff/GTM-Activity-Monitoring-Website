// Kartu: Upload File Excel Data ODP
export default function OdpImportCard({
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload File Excel Data ODP
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('odp');
              }}
              title="Panduan & Aturan Upload Data ODP"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#800000';
                e.currentTarget.style.color = '#800000';
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Target Update:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                }}
            >
              Data ODP &amp; Port Mingguan
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: file ? '#ECFDF5' : '#F8FAFC',
                border: file ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="excel-upload-input"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
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
                  color: file ? '#0F172A' : '#94A3B8',
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
                    color: '#0F172A',
                    fontSize: '15px',
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}

              <input
                id="excel-upload-input"
                type="file"
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: loading || !file ? '#E2E8F0' : '#800000',
              color: loading || !file ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? `Sedang Membaca & Memperbarui Database...${importProgress ? ` (${importProgress})` : ''}` : 'Mulai Update ODP'}
          </button>
        </form>
      </div>
    </div>
  );
}
