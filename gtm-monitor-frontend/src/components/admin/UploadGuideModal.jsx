import { useEffect } from 'react';

// Modal Panduan & Aturan Upload File / Kelola Data
export default function UploadGuideModal({ activeInfoModal, setActiveInfoModal }) {
  useEffect(() => {
    if (!activeInfoModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveInfoModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInfoModal, setActiveInfoModal]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onClick={() => setActiveInfoModal(null)}
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
        {/* Header Dialog */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: activeInfoModal === 'delete' ? '#FEF2F2' : '#EFF6FF',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                flexShrink: 0
              }}
            >
              i
            </div>
            <div>
              <h3 id="guide-modal-title" style={{ margin: 0, fontSize: '17px', color: '#0F172A' }}>
                Panduan &amp; Ketentuan
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', }}>
                {activeInfoModal === 'program'
                  ? 'Tracking Program Bulanan (Flyer & OCR)'
                  : activeInfoModal === 'pairing'
                  ? 'Excel Data Tsel One Pairing'
                  : activeInfoModal === 'delete'
                  ? 'Kelola & Hapus Program Terdaftar'
                  : 'Excel Data ODP & Kapasitas Port'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveInfoModal(null)}
            aria-label="Tutup panduan upload"
            style={{
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
          {activeInfoModal === 'program' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Upload Program:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas yang diterima: <code>.jpg</code>, <code>.jpeg</code>, <code>.png</code>, atau <code>.webp</code> (maksimal 10MB).</li>
                  <li>Flyer promosi diunggah ke Cloudinary dan dipindai secara otomatis (*OCR*) untuk mendeteksi link detail promo (seperti <code>bit.ly/...</code> atau <code>s.id/...</code>).</li>
                  <li>Tentukan <b>Periode Bulan</b> dan <b>Nama Program</b> pada formulir.</li>
                  <li>Jika tautan detail tidak terdeteksi otomatis oleh OCR, gunakan input <b>Link Manual</b> opsional.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> mengunggah berkas non-gambar (seperti berkas <code>.pdf</code>, <code>.docx</code>, atau <code>.xlsx</code>).</li>
                  <li><b>Dilarang</b> mengunggah gambar yang terlalu buram atau beresolusi sangat rendah sehingga teks tidak dapat dibaca OCR.</li>
                  <li><b>Dilarang</b> mengosongkan nama program saat mengunggah flyer materi.</li>
                </ul>
              </div>
            </>
          ) : activeInfoModal === 'pairing' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Data Pairing:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> (maksimal 25MB).</li>
                  <li>Nama Sheet baku: <code>Unstacked_Pairing_Data</code> (atau sheet pertama berkas).</li>
                  <li>Baris Header tabel wajib memuat kolom utama: <code>bb_id</code>, <code>msisdn_parent</code>, <code>msisdn_child1</code>..<code>6</code>, <code>activation_date_*</code>, <code>city</code>, <code>sto</code>, dan <code>order_id</code>.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> menghapus atau merusak struktur nama kolom baku (<code>bb_id</code>, <code>msisdn_parent</code>, <code>order_id</code>).</li>
                  <li><b>Dilarang</b> menggabungkan sel (*merged cells*) pada area baris data pairing.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan *password protection*.</li>
                </ul>
              </div>
            </>
          ) : activeInfoModal === 'delete' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Ketentuan Penghapusan Program:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Pilih <b>Periode Bulan</b> untuk melihat daftar materi program yang tersimpan di sistem.</li>
                  <li>Pilih opsi: <b>Hapus Seluruh Program</b> pada periode tersebut, atau <b>Hapus 1 Program Spesifik</b>.</li>
                  <li>Sistem akan menampilkan pop-up konfirmasi sebelum proses penghapusan diproses.</li>
                </ul>
              </div>

              {/* Section 2: Warning */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Peringatan Penting:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Tindakan penghapusan bersifat <b>permanen</b> dan tidak dapat diurungkan (*irreversible*).</li>
                  <li>File gambar pada CDN Cloudinary dan data program pada database akan dihapus dari server.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Data ODP:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> (maksimal 25MB).</li>
                  <li>Baris Header tabel wajib memuat nama kolom baku: <code>Branch</code>, <code>Project</code>, <code>WOK</code>, <code>ODP</code>, <code>Avai</code>, <code>Used</code>, dan <code>Total</code>.</li>
                  <li>Nilai pada kolom <code>Avai</code>, <code>Used</code>, dan <code>Total</code> port wajib berupa bilangan bulat valid (≥ 0).</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> mengosongkan atau mengganti nama kolom <code>Branch</code>, <code>Project</code>, <code>WOK</code>, atau <code>ODP</code>.</li>
                  <li><b>Dilarang</b> mengisi nilai negatif atau karakter huruf pada kolom kapasitas port.</li>
                  <li><b>Dilarang</b> menggunakan *merged cells* (sel gabungan) pada area tabel data ODP.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan *password protection*.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
          <button
            type="button"
            onClick={() => setActiveInfoModal(null)}
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              border: 'none',
              background: '#800000',
              color: '#FFFFFF',
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(128, 0, 0, 0.2)'
            }}
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
