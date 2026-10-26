// ─── SESSION EXPIRED (15 MIN INACTIVITY / SESI TIDAK SAH) POPUP MODAL ───
export default function SessionExpiredModal({ sessionExpiredNotice, setSessionExpiredNotice }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: '420px',
        background: '#FFFFFF', borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '28px 24px', boxSizing: 'border-box',
        textAlign: 'center', animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: '#FFF7ED', border: '1px solid #FFEDD5',
          color: '#F97316', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px auto'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', fontFamily: "'Outfit', sans-serif" }}>
          {sessionExpiredNotice === 'invalid' ? 'Sesi Berakhir' : 'Sesi Berakhir (15 Menit)'}
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', fontWeight: 500 }}>
          {sessionExpiredNotice === 'invalid'
            ? 'Sesi login Anda sudah tidak berlaku atau telah kedaluwarsa. Anda telah ter-logout otomatis, silakan login kembali untuk melanjutkan.'
            : 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Anda telah ter-logout otomatis dan dikembalikan ke menu Overview.'}
        </p>

        <button
          type="button"
          onClick={() => setSessionExpiredNotice(false)}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            border: 'none', background: 'linear-gradient(135deg, #C8102E 0%, #FF5E00 100%)',
            color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(200, 16, 46, 0.35)',
            transition: 'all 0.2s'
          }}
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}
