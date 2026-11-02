import { useState, useEffect } from 'react';

// ─── PUSAT PEMBARUAN DATABASE & PROGRAM (ACTION HUB 1 SEGMEN DENGAN TANDA HINT PANDUAN & KETENTUAN) ───
export default function AdminActionHubCard({
  onOpenModal
}) {
  const [activeHintId, setActiveHintId] = useState(null);
  const [isPinned, setIsPinned] = useState(false);

  const actions = [
    {
      id: 'odp',
      title: 'Data ODP & Kapasitas Port Mingguan',
      buttonLabel: 'Upload Data ODP',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload ODP',
        rules: [
          'Format berkas: Excel (.xlsx, .xls, .csv, maks. 25MB)',
          'Header kolom wajib: Branch, Project, WOK, ODP, Avai, Used, Total',
          'Nilai kolom port (Avai, Used, Total) berupa bilangan bulat valid (≥ 0)',
          'Dilarang menggunakan merged cells (sel gabungan) pada baris data',
          'File tidak boleh diproteksi password'
        ]
      }
    },
    {
      id: 'pairing',
      title: 'Data Tsel One Pairing Pelanggan',
      buttonLabel: 'Upload Pairing',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload Pairing',
        rules: [
          'Format berkas: Excel (.xlsx, .xls, .csv, maks. 25MB)',
          'Nama sheet baku: Unstacked_Pairing_Data (atau sheet pertama)',
          'Kolom utama wajib: bb_id, msisdn_parent, order_id, city, sto',
          'Dilarang merusak atau mengubah struktur nama kolom baku',
          'Dilarang menggunakan merged cells pada data pairing'
        ]
      }
    },
    {
      id: 'program',
      title: 'Tracking Program Bulanan (Flyer & OCR)',
      buttonLabel: 'Upload Program',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload Program',
        rules: [
          'Format berkas: Gambar (.jpg, .jpeg, .png, .webp, maks. 10MB)',
          'Pilih periode bulan & tentukan nama program yang relevan',
          'Pastikan teks pada flyer terbaca jelas agar tautan bit.ly/s.id terpindai otomatis via OCR',
          'Tautan manual dapat diisi opsional bila link tidak tertera pada flyer',
          'Dilarang mengunggah berkas non-gambar (seperti .pdf atau .xlsx)'
        ]
      }
    },
    {
      id: 'delete',
      title: 'Kelola & Hapus Program Terdaftar',
      buttonLabel: 'Kelola Program',
      isDanger: true,
      hint: {
        title: 'Ketentuan Kelola & Hapus Program',
        rules: [
          'Cakupan: Manajemen basis data materi promosi',
          'Pilih periode bulan untuk melihat daftar program aktif',
          'Opsi hapus: 1 nama program spesifik atau seluruh program pada periode terpilih',
          'Tindakan penghapusan bersifat permanen dari database & Cloudinary',
          'Konfirmasi keamanan akan muncul sebelum eksekusi dilakukan'
        ]
      }
    }
  ];

  // Penanganan klik di luar atau tombol Escape untuk menutup hint popover
  useEffect(() => {
    if (!activeHintId) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveHintId(null);
        setIsPinned(false);
      }
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-hint-wrapper]')) {
        setActiveHintId(null);
        setIsPinned(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHintId]);

  const handleToggleHint = (id) => {
    if (activeHintId === id && isPinned) {
      setActiveHintId(null);
      setIsPinned(false);
    } else {
      setActiveHintId(id);
      setIsPinned(true);
    }
  };

  const handleMouseEnter = (id) => {
    if (!isPinned) {
      setActiveHintId(id);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setActiveHintId(null);
    }
  };

  return (
    <div
      className="saas-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Segmen */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>
            Pusat Pembaruan Database &amp; Program
          </h2>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
            Pilih pembaruan data mingguan atau kelola materi program melalui jendela pop-up dialog
          </div>
        </div>
      </div>

      {/* Daftar Baris Aksi Terpadu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {actions.map((act) => (
          <div
            key={act.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '14px 20px',
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            {/* Sisi Kiri: Judul + Tanda Hint + Badge (Tanpa Icon Besar, Tanpa Subtext) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                flex: 1
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13.5px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.1px' }}>
                {act.title}
              </span>

              {/* Wrapper Interaktif Tanda Hint (Hover & Click) */}
              <div
                data-hint-wrapper
                style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                onMouseEnter={() => handleMouseEnter(act.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleHint(act.id);
                  }}
                  aria-label={`Lihat panduan dan ketentuan untuk ${act.title}`}
                  title="Arahkan kursor atau klik untuk melihat panduan & ketentuan upload"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: activeHintId === act.id ? '#EFF6FF' : '#FFFFFF',
                    color: activeHintId === act.id ? '#1D4ED8' : '#64748B',
                    border: activeHintId === act.id ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>

                {/* Popover Tanda Hint (Font identik dengan halaman lain, tanpa box format terpisah, tanpa link lihat panduan lengkap) */}
                {activeHintId === act.id && (
                  <div
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '0',
                      zIndex: 60,
                      width: '350px',
                      maxWidth: 'calc(100vw - 40px)',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
                      padding: '14px 16px',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-body)',
                      color: '#334155'
                    }}
                  >
                    {/* Header Hint Popover */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
                        {act.hint.title}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHintId(null);
                          setIsPinned(false);
                        }}
                        aria-label="Tutup panduan"
                        style={{
                          border: 'none',
                          background: '#F1F5F9',
                          color: '#64748B',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#E2E8F0';
                          e.currentTarget.style.color = '#0F172A';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F1F5F9';
                          e.currentTarget.style.color = '#64748B';
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Ketentuan Upload Bersatu (Termasuk Format Berkas) */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#475569', lineHeight: 1.55 }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '6px', fontSize: '12px' }}>
                        Ketentuan Upload:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {act.hint.rules.map((rule, idx) => (
                          <li key={idx} style={{ letterSpacing: '-0.1px' }}>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sisi Kanan: Tombol Sejajar Presisi (170px) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '170px' }}>
              <button
                type="button"
                onClick={() => onOpenModal(act.id)}
                style={{
                  width: '170px',
                  height: '38px',
                  borderRadius: '8px',
                  border: act.isDanger ? '1px solid #FCA5A5' : 'none',
                  background: act.isDanger ? '#FFFFFF' : '#800000',
                  color: act.isDanger ? '#DC2626' : '#FFFFFF',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: act.isDanger ? 'none' : '0 1px 2px rgba(128, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (act.isDanger) {
                    e.currentTarget.style.background = '#FEF2F2';
                    e.currentTarget.style.borderColor = '#EF4444';
                  } else {
                    e.currentTarget.style.background = '#990000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (act.isDanger) {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                  } else {
                    e.currentTarget.style.background = '#800000';
                  }
                }}
              >
                {act.buttonLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
