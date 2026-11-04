import { useEffect } from 'react';

// Modal: Upload Gambar Tracking Program Bulanan
export default function ProgramUploadModal({
  isOpen,
  onClose,
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
      aria-labelledby="program-modal-title"
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
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
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
                background: '#F1F5F9',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <h3 id="program-modal-title" style={{ margin: 0, fontSize: '17px', color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload Gambar Tracking Program
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', }}>
                Unggah flyer program bulanan &amp; pindai teks link detail (OCR)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('program')}
                title="Panduan Upload Gambar Program"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
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
              aria-label="Tutup dialog upload program"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                fontSize: '14px',
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
        <form onSubmit={handleProgramUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pilih Periode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', color: '#334155' }}>Pilih Periode Bulan:</label>
            <select
              value={programMonthLabel}
              onChange={(e) => setProgramMonthLabel(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '13px',
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

          {/* Nama Program */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', color: '#334155' }}>Nama Program:</label>
            <input
              type="text"
              placeholder="Ketikkan atau pilih nama program..."
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              list="modal-existing-programs-list"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <datalist id="modal-existing-programs-list">
              {uploadAvailablePrograms.map((p, idx) => (
                <option key={idx} value={p.sheetName || p.name} />
              ))}
            </datalist>

            {/* Live Indicator */}
            {(() => {
              const trimmedInput = programName.trim().replace(/\s+/g, ' ').toLowerCase();
              if (!trimmedInput) return null;
              const match = uploadAvailablePrograms.find((p) => {
                const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
                return pName === trimmedInput;
              });
              if (!match) return null;
              const count = Array.isArray(match.images) && match.images.length > 0 ? match.images.length : match.imageUrl ? 1 : 0;
              return (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    fontSize: '11.5px',
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>ℹ️</span>
                  <span>
                    Program <strong>"{match.sheetName || match.name}"</strong> sudah ada ({count} slide). File ini akan ditambahkan sebagai <strong>Slide ke-{count + 1}</strong>.
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Link Manual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', color: '#64748B' }}>
              Link Manual <span style={{ }}>(Opsional)</span>:
            </label>
            <input
              type="url"
              placeholder="http://... (Kosongkan bila ingin dipindai via OCR)"
              value={programDetailUrl}
              onChange={(e) => setProgramDetailUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '12.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: programFile ? '#ECFDF5' : '#F8FAFC',
              border: programFile ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-program-image-input"
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Pilih Gambar</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: programFile ? '#0F172A' : '#94A3B8',
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
              id="modal-program-image-input"
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

          {programMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', }}>
              {programMessage}
            </div>
          )}

          {programError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', fontSize: '13px', }}>
              {programError}
            </div>
          )}

          {programResultUpload && (
            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Hasil Upload &amp; OCR Link Scan:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Status:</strong> <span style={{ color: '#0F172A', }}>Tersimpan di Cloudinary</span></div>
                {programResultUpload.totalSlides > 1 && (
                  <div>
                    <strong>Status Slide:</strong>{' '}
                    <span style={{ color: '#0F172A', }}>
                      Slide ke-{programResultUpload.totalSlides} (Total: {programResultUpload.totalSlides} slide gambar)
                    </span>
                  </div>
                )}
                <div><strong>Hasil Scan OCR:</strong> <span style={{ color: programResultUpload.scannedLink ? '#0F172A' : '#64748B', }}>{programResultUpload.scannedLink || 'Tidak terdeteksi'}</span></div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={programLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={programLoading || !programFile}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: programLoading || !programFile ? '#E2E8F0' : '#800000',
                color: programLoading || !programFile ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                cursor: programLoading || !programFile ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {programLoading ? 'Sedang Mengunggah & Memindai...' : 'Mulai Upload Gambar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

