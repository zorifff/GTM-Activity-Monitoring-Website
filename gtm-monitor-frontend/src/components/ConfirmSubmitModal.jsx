import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmSubmitModal({ data, onConfirm, onCancel, isSubmitting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!data) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, isSubmitting, onCancel]);

  if (!data) return null;
  const { projectName, actLabel } = data;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-submit-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', boxSizing: 'border-box'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'relative', width: '100%', maxWidth: '420px',
          background: '#FFFFFF', borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '28px 24px', boxSizing: 'border-box',
          textAlign: 'center', animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Badge Icon */}
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: '#FFF7ED',
          border: '1px solid #FED7AA', color: '#FF5E00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h3 id="confirm-submit-title" style={{ fontSize: '19px', fontWeight: 900, color: '#0F172A', margin: '0 0 10px 0', fontFamily: "var(--font-heading)" }}>
          Konfirmasi Pengiriman
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px 0', fontWeight: 500 }}>
          Apakah Anda ingin menambahkan foto di <strong style={{ color: '#0F172A' }}>{actLabel}</strong> pada proyek <strong style={{ color: '#0F172A' }}>"{projectName}"</strong>?
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid #E2E8F0', background: '#F8FAFC',
              color: '#475569', fontSize: '13.5px', fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid #991B1B', background: '#C8102E',
              color: '#FFFFFF', fontSize: '13.5px', fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(200, 16, 46, 0.25)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
