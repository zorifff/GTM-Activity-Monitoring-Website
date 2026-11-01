// Kartu: Upload File Excel Data Tsel One Pairing
export default function PairingImportCard({
  pairingFile,
  setPairingFile,
  pairingLoading,
  pairingProgress,
  pairingMessage,
  setPairingMessage,
  pairingError,
  setPairingError,
  handlePairingUpload,
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
            <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload File Excel Data Tsel One Pairing
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('pairing');
              }}
              title="Panduan & Aturan Upload Pairing"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 800,
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
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Target Update:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              Data Tsel One Pairing
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handlePairingUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: pairingFile ? '#ECFDF5' : '#F8FAFC',
                border: pairingFile ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="pairing-file-input"
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
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Pilih File Pairing</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: pairingFile ? '#065F46' : '#94A3B8',
                  fontWeight: pairingFile ? 600 : 400,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {pairingFile ? `${pairingFile.name} (${(pairingFile.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
              </span>

              {pairingFile && (
                <button
                  type="button"
                  onClick={() => {
                    setPairingFile(null);
                    if (setPairingMessage) setPairingMessage(null);
                    if (setPairingError) setPairingError(null);
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
                id="pairing-file-input"
                type="file"
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPairingFile(e.target.files[0]);
                    if (setPairingMessage) setPairingMessage(null);
                    if (setPairingError) setPairingError(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {pairingMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {pairingMessage}
            </div>
          )}

          {pairingError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {pairingError}
            </div>
          )}

          <button
            type="submit"
            disabled={pairingLoading || !pairingFile}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: pairingLoading || !pairingFile ? '#E2E8F0' : '#800000',
              color: pairingLoading || !pairingFile ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: pairingLoading || !pairingFile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {pairingLoading ? `Sedang Memproses Data Pairing...${pairingProgress ? ` (${pairingProgress})` : ''}` : 'Mulai Update Pairing'}
          </button>
        </form>
      </div>
    </div>
  );
}
