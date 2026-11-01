import { useEffect } from 'react';

// Custom Logout Confirmation Modal
export default function LogoutConfirmModal({ setShowLogoutConfirmModal, executeLogout }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowLogoutConfirmModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowLogoutConfirmModal]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi Keluar Akun"
      onClick={() => setShowLogoutConfirmModal(false)}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(15, 23, 42, 0.45)', 
        backdropFilter: 'blur(4px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 300, 
        padding: '20px', 
        animation: 'fadeIn 0.2s ease-in-out' 
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: '#FFFFFF', 
          borderRadius: '16px', 
          width: '100%', 
          maxWidth: '350px', 
          padding: '24px 22px 20px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)', 
          border: '1px solid #E2E8F0', 
          textAlign: 'center', 
          animation: 'flyoutSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'var(--font-body)'
        }}
      >
        <p 
          style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '14.5px', 
            fontWeight: 600, 
            color: '#0F172A', 
            margin: '0 0 22px', 
            lineHeight: 1.55,
            letterSpacing: '-0.1px'
          }}
        >
          Apakah Anda yakin ingin keluar dari Portal GTM Activity Monitor?
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#475569',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={executeLogout}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #DC2626',
              background: '#DC2626',
              color: '#FFFFFF',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.borderColor = '#B91C1C'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.borderColor = '#DC2626'; }}
          >
            Ya, Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
