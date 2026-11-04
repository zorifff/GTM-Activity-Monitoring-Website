import { memo, useEffect, useState } from 'react';
import LoginModal from './Auth/LoginModal';

const REGIONAL_BRANCHES = [
  'SEMARANG',
  'SURAKARTA',
  'YOGYAKARTA',
  'MAGELANG',
  'PEKALONGAN',
  'PURWOKERTO'
];

const LandingPage = memo(function LandingPage({
  initialLoginOpen = false,
  onLoginSuccess,
  onCloseLoginRoute
}) {
  const [isLoginOpen, setIsLoginOpen] = useState(Boolean(initialLoginOpen));

  useEffect(() => {
    setIsLoginOpen(Boolean(initialLoginOpen));
  }, [initialLoginOpen]);

  const handleOpenLogin = (e) => {
    if (e) e.preventDefault();
    setIsLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
    if (onCloseLoginRoute) {
      onCloseLoginRoute();
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100dvh',
        height: '100dvh',
        margin: 0,
        padding: '24px',
        overflow: 'hidden',
        backgroundColor: '#021329',
        fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, var(--font-body))",
        fontWeight: 400,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Architectural Navy Networking & Angular Planes Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        <img
          src="/landing-network-mesh.svg"
          alt=""
          aria-hidden="true"
          width="1920"
          height="1080"
          fetchpriority="high"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      </div>

      {/* Top-Left: Telkomsel Brand Logo (Identical to Sidebar) */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(24px, 4vh, 36px)',
          left: 'clamp(24px, 4vw, 44px)',
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <img
          src="/telkomsel-symbol.png"
          alt=""
          aria-hidden="true"
          style={{
            height: '28px',
            width: 'auto',
            display: 'block',
            filter:
              'drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))'
          }}
        />
        <img
          src="/telkomsel-logo.png"
          alt="Telkomsel"
          style={{
            height: '22px',
            width: 'auto',
            display: 'block',
            filter: 'brightness(0) invert(1)'
          }}
        />
      </div>

      {/* Center: Architectural Hero Composition (Smoothly recedes when Login Pop-up opens) */}
      <div
        aria-hidden={isLoginOpen}
        style={{
          maxWidth: '880px',
          width: '100%',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 16px',
          marginBottom: '28px',
          opacity: isLoginOpen ? 0 : 1,
          transform: isLoginOpen ? 'scale(0.96) translateY(-8px)' : 'scale(1) translateY(0)',
          pointerEvents: isLoginOpen ? 'none' : 'auto',
          transition: 'opacity 0.24s ease, transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Two-Tone Headline in Gordita Regular */}
        <h1
          style={{
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            color: '#FFFFFF',
            fontSize: 'clamp(32px, 4.3vw, 56px)',
            fontWeight: 400,
            lineHeight: 1.22,
            letterSpacing: '-0.3px',
            margin: '0 0 22px 0',
            userSelect: 'none'
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Monitoring Okupansi ODP</span>
          <br />
          <span style={{ color: '#7DD3FC' }}>Regional Jateng &amp; DIY</span>
        </h1>

        {/* Concise Supporting Sub-Headline */}
        <p
          style={{
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            fontSize: 'clamp(13.5px, 1.15vw, 15.5px)',
            fontWeight: 400,
            color: 'rgba(203, 213, 225, 0.78)',
            lineHeight: 1.65,
            maxWidth: '580px',
            margin: '0 0 36px 0'
          }}
        >
          Sistem pemantauan utilisasi kapasitas port ODP Greenfield, verifikasi kegiatan lapangan,
          dan evaluasi distribusi Sales Force secara terpadu.
        </p>

        {/* Transparent Ghost Login Button with Precision Rim Highlight */}
        <button
          type="button"
          id="landing-login-btn"
          tabIndex={isLoginOpen ? -1 : 0}
          onClick={handleOpenLogin}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            color: '#FFFFFF',
            border: '1.5px solid rgba(186, 230, 253, 0.55)',
            borderRadius: '10px',
            padding: '12px 56px',
            fontSize: '16px',
            fontWeight: 400,
            cursor: 'pointer',
            boxShadow: 'none',
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(125, 211, 252, 0.14)';
            e.currentTarget.style.borderColor = '#FFFFFF';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(186, 230, 253, 0.55)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Login
        </button>
      </div>

      {/* Dynamic Frosted Navy Login Pop-up Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={handleCloseLogin}
        onLoginSuccess={(loggedInUser, expiresAt) => {
          setIsLoginOpen(false);
          if (onLoginSuccess) {
            onLoginSuccess(loggedInUser, expiresAt);
          }
        }}
      />

      {/* Bottom Regional Coverage HUD Strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          borderTop: '1px solid rgba(148, 163, 184, 0.12)',
          backgroundColor: 'rgba(2, 16, 36, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '14px clamp(20px, 4vw, 44px)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 400,
            letterSpacing: '0.12em',
            color: 'rgba(148, 163, 184, 0.7)',
            textTransform: 'uppercase'
          }}
        >
          CAKUPAN WILAYAH OPERASIONAL
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'clamp(10px, 2vw, 22px)'
          }}
        >
          {REGIONAL_BRANCHES.map((branch, idx) => (
            <span
              key={branch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'clamp(10px, 2vw, 22px)',
                fontSize: '11.5px',
                fontWeight: 400,
                letterSpacing: '0.1em',
                color: 'rgba(226, 232, 240, 0.8)'
              }}
            >
              <span>{branch}</span>
              {idx < REGIONAL_BRANCHES.length - 1 && (
                <span aria-hidden="true" style={{ color: 'rgba(56, 189, 248, 0.45)' }}>
                  &bull;
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

export default LandingPage;
