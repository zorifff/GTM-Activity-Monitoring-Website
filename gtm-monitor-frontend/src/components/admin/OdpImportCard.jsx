// Kartu: Upload File Excel Data ODP
export default function OdpImportCard({ file, setFile, loading, importProgress, message, setMessage, error, setError, handleFileChange, handleUpload, setActiveInfoModal }) {
  return (
    <div style={{ padding: '28px', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone (Matching Height with Left Card) */}
        <div style={{ marginBottom: '20px', minHeight: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                Upload File Excel Data ODP
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                Unggah file Excel data ODP (`.xlsx`, `.csv`) untuk memperbarui kapasitas port ODP mingguan secara otomatis.
              </p>
            </div>

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
                e.currentTarget.style.borderColor = '#C8102E';
                e.currentTarget.style.color = '#C8102E';
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

          {/* Matching Action Pill Badge (Left Aligned) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Target Update:</span>
            <div style={{
              padding: '6px 14px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#0F172A',
              fontSize: '12.5px',
              fontWeight: 700
            }}>
              Data ODP &amp; Port Mingguan
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label 
              htmlFor="excel-upload-input"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flex: 1,
                minHeight: '190px',
                padding: '24px 20px', 
                border: file ? '2px solid #059669' : '2px dashed #CBD5E1', 
                borderRadius: '16px', 
                background: file ? '#ECFDF5' : '#FFFFFF', 
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              {file ? (
                <div onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#065F46', wordBreak: 'break-all' }}>{file.name}</div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB · Siap diunggah</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
                    <label 
                      htmlFor="excel-upload-input"
                      style={{ 
                        fontSize: '12.5px', 
                        fontWeight: 800, 
                        color: '#059669', 
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Ganti File
                    </label>

                    <span style={{ color: '#CBD5E1' }}>•</span>

                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setMessage(null);
                        setError(null);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#C8102E',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                        transition: 'color 0.15s'
                      }}
                    >
                      Hapus File
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Upload File ODP</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Mendukung format .xlsx, .xls, atau .csv</div>
                </div>
              )}
              <input 
                id="excel-upload-input"
                type="file" 
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !file}
            style={{ 
              width: '100%', 
              padding: '13px 24px', 
              background: loading || !file ? '#CBD5E1' : 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)', 
              color: '#FFFFFF', 
              border: 'none', 
              borderRadius: '50px', 
              fontWeight: 800, 
              fontSize: '13px', 
              letterSpacing: '1px',
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: loading || !file ? 'none' : '0 4px 16px rgba(200, 16, 46, 0.3)',
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
