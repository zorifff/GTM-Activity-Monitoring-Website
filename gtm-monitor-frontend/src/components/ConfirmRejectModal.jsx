import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmRejectModal({ isOpen, data, onConfirm, onCancel, isRejecting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRejecting) {
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
  }, [isOpen, isRejecting, onCancel]);

  if (!isOpen || !data) return null;

  const projectName = data.projectName || data.pName;
  const actLabel = data.actLabel;
  const photoIndex = data.photoIndex;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-reject-title"
      onClick={(e) => { e.stopPropagation(); if (!isRejecting) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100005,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          boxSizing: 'border-box',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Warning Badge Icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.12)'
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h3
          id="confirm-reject-title"
          style={{
            fontSize: '20px',
            fontWeight: 900,
            color: '#0F172A',
            margin: '0 0 10px 0',
            fontFamily: "var(--font-heading)"
          }}
        >
          Tolak Verifikasi Kegiatan?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
            fontWeight: 500
          }}
        >
          {data.actKey === 'rekrutmen_sf'
            ? 'Apakah Anda yakin ingin menolak verifikasi ini? Data Kode SF tersebut akan dihapus dan user perlu memasukkan data ulang.'
            : 'Apakah Anda yakin ingin menolak verifikasi ini? Foto tersebut akan dihapus dan user perlu melakukan upload ulang.'
          }
        </p>

        {/* Info card */}
        {(projectName || actLabel) && (
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '22px',
              border: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {projectName && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Proyek:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{projectName}</strong>
              </div>
            )}
            {actLabel && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Kegiatan:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{actLabel}</strong>
                {typeof photoIndex === 'number' && data.actKey !== 'rekrutmen_sf' && ` (Foto #${photoIndex + 1})`}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRejecting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isRejecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRejecting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #B91C1C',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: isRejecting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              opacity: isRejecting ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            {isRejecting ? 'Menolak...' : 'Ya, Tolak'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
