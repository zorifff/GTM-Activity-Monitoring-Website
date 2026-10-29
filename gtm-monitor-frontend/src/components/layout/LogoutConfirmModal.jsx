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
      aria-labelledby="logout-confirm-title"
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
          background: '#ffffff', 
          borderRadius: '16px', 
          width: '100%', 
          maxWidth: '340px', 
          padding: '24px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
          border: '1px solid #e2e8f0', 
          textAlign: 'center', 
          animation: 'flyoutSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        <div 
          style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '50%', 
            background: '#fef2f2', 
            color: '#dc2626', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px', 
            border: '1px solid #fee2e2' 
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
          Konfirmasi Log Out
        </h3>

        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 22px', lineHeight: 1.5 }}>
          Apakah Anda yakin ingin keluar dari Portal GTM Activity Monitor?
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowLogoutConfirmModal(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            Batal
          </button>

          <button
            onClick={executeLogout}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #dc2626',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#b91c1c'; e.currentTarget.style.borderColor = '#b91c1c'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; }}
          >
            Ya, Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
