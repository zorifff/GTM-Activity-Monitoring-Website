// Modal Panduan & Aturan Upload File (Program / Data ODP / Tsel One Pairing)
export default function UploadGuideModal({ activeInfoModal, setActiveInfoModal }) {
  return (
    <div 
      onClick={() => setActiveInfoModal(null)}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div 
        className="fade-in" 
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', width: '100%', maxWidth: '540px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}
      >
        {/* Header Dialog */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: activeInfoModal === 'program' ? '#EFF6FF' : '#FEF2F2', color: activeInfoModal === 'program' ? '#2563EB' : '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', flexShrink: 0 }}>
              i
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>
                Panduan &amp; Aturan File Upload
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                {activeInfoModal === 'program'
                  ? 'Excel Tracking Program Bulanan'
                  : activeInfoModal === 'pairing'
                  ? 'Excel Data Tsel One Pairing'
                  : 'Excel Data ODP & Kapasitas Port'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveInfoModal(null)}
            style={{ border: 'none', background: '#F1F5F9', color: '#64748B', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Content Body: Restrictions & Mandatory Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '13px' }}>
          {activeInfoModal === 'program' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '13px', marginBottom: '10px' }}>
                  Persyaratan Wajib yang Harus Ada:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Format file wajib berupa <code>.xlsx</code> atau <code>.xls</code>.</li>
                  <li>Nama Sheet mewakili <b>Nama Opsi Program</b> (Contoh: <code>Program Kickoff GTM</code>, <code>Penetrasi Outlet</code>). Setiap sheet akan dibaca sebagai 1 program.</li>
                  <li>Baris Header tabel wajib memuat nama kolom baku: <code>Branch</code>, <code>Project</code> (atau <code>Nama LOP</code>), <code>WOK</code>, <code>ODP</code>, <code>Avai</code>, <code>Used</code>, dan <code>Total</code>.</li>
                  <li>Tautan URL Detail (seperti <code>bit.ly/...</code>, <code>s.id/...</code>, atau <code>https://...</code>) dapat dicantumkan pada sel baris atas sheet.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '14px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '13px', marginBottom: '10px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><b>Dilarang</b> mengunggah format selain <code>.xlsx</code> atau <code>.xls</code> (seperti <code>.pdf</code>, <code>.csv</code>, <code>.doc</code>, <code>.png</code>).</li>
                  <li><b>Dilarang</b> mengganti atau menghapus nama header kolom baku menjadi istilah yang tidak dikenal sistem.</li>
                  <li><b>Dilarang</b> mengunci sheet menggunakan <i>password protection</i>.</li>
                  <li><b>Dilarang</b> mengunggah file kosong yang tidak berisi baris data.</li>
                </ul>
              </div>
            </>
          ) : activeInfoModal === 'pairing' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '13px', marginBottom: '10px' }}>
                  Persyaratan Wajib yang Harus Ada:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Format file wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code>.</li>
                  <li>Nama Sheet baku: <code>Unstacked_Pairing_Data</code> (atau sheet pertama file).</li>
                  <li>Baris Header tabel wajib memuat kolom utama: <code>bb_id</code>, <code>msisdn_parent</code>, <code>msisdn_child1</code>..<code>msisdn_child6</code>, <code>activation_date_ih</code>, <code>activation_date_parent</code>, <code>activation_date_child1</code>..<code>6</code>, <code>city</code>, <code>sto</code>, dan <code>order_id</code>.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '14px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '13px', marginBottom: '10px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><b>Dilarang</b> menghapus atau merusak struktur nama kolom <code>bb_id</code>, <code>msisdn_parent</code>, atau <code>order_id</code>.</li>
                  <li><b>Dilarang</b> menggabungkan sel (<i>merged cells</i>) pada area baris data pairing.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan <i>password protection</i>.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '13px', marginBottom: '10px' }}>
                  Persyaratan Wajib yang Harus Ada:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Format file wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code>.</li>
                  <li>Baris Header tabel wajib memuat nama kolom baku: <code>Branch</code>, <code>Project</code>, <code>WOK</code>, <code>ODP</code>, <code>Avai</code>, <code>Used</code>, dan <code>Total</code>.</li>
                  <li>Nilai pada kolom <code>Avai</code>, <code>Used</code>, dan <code>Total</code> port wajib berupa angka numerik valid (bilangan bulat &ge; 0).</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '14px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '13px', marginBottom: '10px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><b>Dilarang</b> mengosongkan atau menghapus kolom <code>Branch</code>, <code>Project</code>, <code>WOK</code>, atau <code>ODP</code>.</li>
                  <li><b>Dilarang</b> mengisi angka negatif atau karakter teks pada kolom kapasitas port (<code>Avai</code>, <code>Used</code>, <code>Total</code>).</li>
                  <li><b>Dilarang</b> menggunakan <i>merged cells</i> (gabungan sel) pada area tabel data ODP.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan <i>password protection</i>.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
          <button
            onClick={() => setActiveInfoModal(null)}
            style={{
              padding: '10px 24px',
              borderRadius: '50px',
              border: 'none',
              background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
            }}
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
