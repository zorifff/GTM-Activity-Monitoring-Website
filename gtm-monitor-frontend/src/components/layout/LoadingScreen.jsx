import { useState, useEffect } from 'react';

// ─── LOADING SCREEN (di-definisikan di level modul agar TIDAK di-remount setiap App re-render) ───
export default function LoadingScreen() {
  const [dotsCount, setDotsCount] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotsCount(prev => (prev % 3) + 1);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const dots = '.'.repeat(dotsCount);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', color: '#64748B', gap: '18px' }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #800000 0%, #FF5E00 100%)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: '18px',
        boxShadow: '0 8px 24px rgba(128, 0, 0, 0.35)',
        letterSpacing: '-0.5px'
      }}>
        GTM
      </div>
      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A', fontFamily: 'inherit' }}>
        Memuat data dari server<span style={{ display: 'inline-block', width: '24px', textAlign: 'left' }}>{dots}</span>
      </div>
    </div>
  );
}
