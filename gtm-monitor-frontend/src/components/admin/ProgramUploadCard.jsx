// Kartu: Upload Gambar Tracking Program Bulanan
export default function ProgramUploadCard({ programFile, setProgramFile, programMonthLabel, setProgramMonthLabel, programName, setProgramName, programDetailUrl, setProgramDetailUrl, programLoading, programMessage, setProgramMessage, programError, setProgramError, programResultUpload, uploadAvailablePrograms, handleProgramUpload, setActiveInfoModal }) {
  return (
    <div style={{ padding: '28px', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px', minHeight: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                Upload Gambar Tracking Program Bulanan
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                Unggah gambar program (`.jpg`, `.png`) ke Cloudinary &amp; pindai teks link detail selengkapnya (*OCR*) secara otomatis.
              </p>
            </div>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '90px' }}>Pilih Periode:</span>
              <select
                value={programMonthLabel}
                onChange={(e) => setProgramMonthLabel(e.target.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '90px' }}>Nama Program:</span>
                <input
                  type="text"
                  placeholder="Ketikkan atau pilih nama program..."
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  list="existing-upload-programs-list"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '12px',
                    fontWeight: 600,
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
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', minWidth: '90px' }}>Link Manual:</span>
              <input
                type="url"
                placeholder="http://... (Opsional - biarkan kosong untuk OCR otomatis)"
                value={programDetailUrl}
                onChange={(e) => setProgramDetailUrl(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
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
          <div style={{ marginBottom: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label
              htmlFor="program-image-input"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                minHeight: '170px',
                padding: '20px',
                border: programFile ? '2px solid #059669' : '2px dashed #CBD5E1',
                borderRadius: '16px',
                background: programFile ? '#ECFDF5' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              {programFile ? (
                <div onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#065F46', wordBreak: 'break-all' }}>{programFile.name}</div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                    {(programFile.size / 1024).toFixed(1)} KB • Siap diproses &amp; di-scan OCR untuk {programMonthLabel}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
                    <label
                      htmlFor="program-image-input"
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 800,
                        color: '#059669',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Ganti Gambar
                    </label>

                    <span style={{ color: '#CBD5E1' }}>•</span>

                    <button
                      type="button"
                      onClick={() => {
                        setProgramFile(null);
                        setProgramMessage(null);
                        setProgramError(null);
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
                      Hapus Gambar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Pilih Gambar Program (.JPG / .PNG)</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Gambar akan diunggah ke Cloudinary &amp; dipindai otomatis untuk link detail</div>
                </div>
              )}
              <input
                id="program-image-input"
                type="file"
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept="image/jpeg, image/png, image/jpg, image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setProgramFile(e.target.files[0]);
                    setProgramError(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {programMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
              {programMessage}
            </div>
          )}

          {programError && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
              {programError}
            </div>
          )}

          {programResultUpload && (
            <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Hasil Upload &amp; OCR Link Scan:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Status Cloudinary:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>Tersimpan</span></div>
                {programResultUpload.totalSlides > 1 && (
                  <div>
                    <strong>Status Slide:</strong>{' '}
                    <span style={{ color: '#2563EB', fontWeight: 700 }}>
                      Tersimpan sebagai Slide ke-{programResultUpload.totalSlides} (Total: {programResultUpload.totalSlides} slide gambar)
                    </span>
                  </div>
                )}
                <div><strong>Hasil Scan OCR:</strong> <span style={{ color: programResultUpload.scannedLink ? '#2563EB' : '#64748B', fontWeight: 700 }}>{programResultUpload.scannedLink || 'Tidak terdeteksi (Dapat diisi link manual)'}</span></div>
                {programResultUpload.detailUrl && (
                  <div style={{ marginTop: '4px' }}>
                    <a href={programResultUpload.detailUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontWeight: 700, fontSize: '12px' }}>
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
              padding: '13px 24px',
              background: programLoading || !programFile ? '#CBD5E1' : 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50px',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '1px',
              cursor: programLoading || !programFile ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: programLoading || !programFile ? 'none' : '0 4px 16px rgba(200, 16, 46, 0.3)',
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
