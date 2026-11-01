// Kartu: Upload Gambar Tracking Program Bulanan
export default function ProgramUploadCard({
  programFile,
  setProgramFile,
  programMonthLabel,
  setProgramMonthLabel,
  programName,
  setProgramName,
  programDetailUrl,
  setProgramDetailUrl,
  programLoading,
  programMessage,
  setProgramMessage,
  programError,
  setProgramError,
  programResultUpload,
  uploadAvailablePrograms = [],
  handleProgramUpload,
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
              Upload Gambar Tracking Program Bulanan
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('program');
              }}
              title="Panduan & Aturan Upload Program"
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
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.color = '#1D4ED8';
                e.currentTarget.style.background = '#EFF6FF';
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

          {/* Month Selector & Program Option Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '90px' }}>Pilih Periode:</span>
              <select
                value={programMonthLabel}
                onChange={(e) => setProgramMonthLabel(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  flex: 1
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '90px' }}>Nama Program:</span>
                <input
                  type="text"
                  placeholder="Ketikkan atau pilih nama program..."
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  list="existing-upload-programs-list"
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '12px',
                    fontWeight: 500,
                    flex: 1,
                    outline: 'none'
                  }}
                />
                <datalist id="existing-upload-programs-list">
                  {uploadAvailablePrograms.map((p, idx) => (
                    <option key={idx} value={p.sheetName || p.name} />
                  ))}
                </datalist>
              </div>

              {/* Live Indicator if Program with same name already exists in this period */}
              {(() => {
                const trimmedInput = programName.trim().replace(/\s+/g, ' ').toLowerCase();
                if (!trimmedInput) return null;
                const match = uploadAvailablePrograms.find(p => {
                  const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
                  return pName === trimmedInput;
                });
                if (!match) return null;
                const count = Array.isArray(match.images) && match.images.length > 0 ? match.images.length : (match.imageUrl ? 1 : 0);
                return (
                  <div
                    style={{
                      marginLeft: '98px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      fontSize: '11.5px',
                      color: '#1D4ED8',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <span>ℹ️</span>
                    <span>
                      Program <strong>"{match.sheetName || match.name}"</strong> sudah ada ({count} slide gambar). Gambar ini akan ditambahkan sebagai <strong>Slide ke-{count + 1}</strong>.
                    </span>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', minWidth: '90px' }}>Link Manual:</span>
              <input
                type="url"
                placeholder="http://... (Opsional - biarkan kosong untuk OCR otomatis)"
                value={programDetailUrl}
                onChange={(e) => setProgramDetailUrl(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 500,
                  flex: 1,
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handleProgramUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: programFile ? '#ECFDF5' : '#F8FAFC',
                border: programFile ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="program-image-input"
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
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Pilih Gambar</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: programFile ? '#065F46' : '#94A3B8',
                  fontWeight: programFile ? 600 : 400,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {programFile ? `${programFile.name} (${(programFile.size / 1024).toFixed(1)} KB)` : 'Format: .jpg, .png'}
              </span>

              {programFile && (
                <button
                  type="button"
                  onClick={() => {
                    setProgramFile(null);
                    if (setProgramMessage) setProgramMessage(null);
                    if (setProgramError) setProgramError(null);
                  }}
                  title="Hapus gambar"
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
                id="program-image-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onClick={(e) => { e.currentTarget.value = ''; }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setProgramFile(e.target.files[0]);
                    if (setProgramError) setProgramError(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {programMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {programMessage}
            </div>
          )}

          {programError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {programError}
            </div>
          )}

          {programResultUpload && (
            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Hasil Upload &amp; OCR Link Scan:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Status Cloudinary:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>Tersimpan</span></div>
                {programResultUpload.totalSlides > 1 && (
                  <div>
                    <strong>Status Slide:</strong>{' '}
                    <span style={{ color: '#2563EB', fontWeight: 600 }}>
                      Tersimpan sebagai Slide ke-{programResultUpload.totalSlides} (Total: {programResultUpload.totalSlides} slide gambar)
                    </span>
                  </div>
                )}
                <div><strong>Hasil Scan OCR:</strong> <span style={{ color: programResultUpload.scannedLink ? '#2563EB' : '#64748B', fontWeight: 600 }}>{programResultUpload.scannedLink || 'Tidak terdeteksi (Dapat diisi link manual)'}</span></div>
                {programResultUpload.detailUrl && (
                  <div style={{ marginTop: '4px' }}>
                    <a href={programResultUpload.detailUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontWeight: 600, fontSize: '12px' }}>
                      🔗 Buka Link Detail Resmi Slide Ini →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={programLoading || !programFile}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: programLoading || !programFile ? '#E2E8F0' : '#800000',
              color: programLoading || !programFile ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: programLoading || !programFile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {programLoading ? 'Sedang Mengunggah & Memindai OCR...' : 'Mulai Upload Gambar Program'}
          </button>
        </form>
      </div>
    </div>
  );
}
