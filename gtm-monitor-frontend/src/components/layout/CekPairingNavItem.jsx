import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import CekPairingPopover from '../CekPairingPopover';

// Menu CEK PAIRING di navigasi atas + popover pencarian (posisi fixed mengikuti tombol)
export default function CekPairingNavItem({ user, setShowLoginModal }) {
  const cekPairingTabRef = useRef(null);
  // Tsel One Pairing Popover States
  const [isPairingDropdownOpen, setIsPairingDropdownOpen] = useState(false);
  const [pairingCoords, setPairingCoords] = useState({ top: 0, left: 0 });

  const updatePairingCoords = useCallback(() => {
    if (cekPairingTabRef.current) {
      const rect = cekPairingTabRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(380, window.innerWidth - 24);
      let targetLeft = rect.left + rect.width / 2;
      const margin = 12;
      if (targetLeft - popoverWidth / 2 < margin) {
        targetLeft = popoverWidth / 2 + margin;
      } else if (targetLeft + popoverWidth / 2 > window.innerWidth - margin) {
        targetLeft = window.innerWidth - popoverWidth / 2 - margin;
      }
      setPairingCoords({
        top: rect.bottom + 8,
        left: targetLeft
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isPairingDropdownOpen) {
      updatePairingCoords();
      window.addEventListener('resize', updatePairingCoords);
      window.addEventListener('scroll', updatePairingCoords);
      return () => {
        window.removeEventListener('resize', updatePairingCoords);
        window.removeEventListener('scroll', updatePairingCoords);
      };
    }
  }, [isPairingDropdownOpen, updatePairingCoords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        cekPairingTabRef.current && !cekPairingTabRef.current.contains(e.target) &&
        !e.target.closest('.pairing-fixed-dropdown') &&
        !e.target.closest('.pairing-transposed-modal')
      ) {
        setIsPairingDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={cekPairingTabRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="nav-tab-btn"
        onClick={() => {
          if (!user) {
            setShowLoginModal(true);
            return;
          }
          if (!isPairingDropdownOpen && cekPairingTabRef.current) {
            const rect = cekPairingTabRef.current.getBoundingClientRect();
            setPairingCoords({
              top: rect.bottom + 8,
              left: rect.left + rect.width / 2
            });
          }
          setIsPairingDropdownOpen(!isPairingDropdownOpen);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: isPairingDropdownOpen ? '#ED0226' : '#64748B',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          cursor: 'pointer',
          transition: 'color 0.2s ease',
          padding: '6px 4px',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => { if (!isPairingDropdownOpen) e.currentTarget.style.color = '#0F172A'; }}
        onMouseLeave={(e) => { if (!isPairingDropdownOpen) e.currentTarget.style.color = '#64748B'; }}
      >
        <span>CEK PAIRING</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isPairingDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <CekPairingPopover
        isOpen={isPairingDropdownOpen}
        coords={pairingCoords}
        onClose={() => setIsPairingDropdownOpen(false)}
      />
    </div>
  );
}
