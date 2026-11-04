import { memo, useEffect, useState } from 'react';
import LoginModal from './Auth/LoginModal';

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
        backgroundColor: '#F8FAFC',
        fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, var(--font-body))",
        fontWeight: 400,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Background Layer 1: Bright Daylight Telecommunications BTS Tower Photography */}
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
          src="/landing-bts-daylight.jpg"
          alt=""
          aria-hidden="true"
          width="1920"
          height="1080"
          fetchpriority="high"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            filter: 'brightness(1.02) contrast(1.02)',
            transform: isLoginOpen ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease'
          }}
        />
      </div>

      {/* Background Layer 2: Clean Airy White Scrim (Maximizing Brightness & Text Legibility) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(90deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.74) 40%, rgba(255, 255, 255, 0.32) 75%, rgba(255, 255, 255, 0.08) 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Top-Left: Telkomsel Brand Logo */}
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
            filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12))'
          }}
        />
        <img
          src="/telkomsel-logo.png"
          alt="Telkomsel"
          style={{
            height: '22px',
            width: 'auto',
            display: 'block',
            filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.10))'
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
          marginBottom: 0,
          opacity: isLoginOpen ? 0 : 1,
          transform: isLoginOpen ? 'scale(0.96) translateY(-8px)' : 'scale(1) translateY(0)',
          pointerEvents: isLoginOpen ? 'none' : 'auto',
          transition: 'opacity 0.24s ease, transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Two-Tone Headline in Gordita Regular harmonized with Bright Telkomsel Corporate Palette */}
        <h1
          style={{
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            fontSize: 'clamp(32px, 4.3vw, 56px)',
            fontWeight: 400,
            lineHeight: 1.22,
            letterSpacing: '-0.3px',
            margin: '0 0 22px 0',
            userSelect: 'none'
          }}
        >
          <span style={{ color: '#0F172A' }}>Monitoring Okupansi ODP</span>
          <br />
          <span style={{ color: '#E0001B' }}>Regional Jateng &amp; DIY</span>
        </h1>

        {/* Concise Supporting Sub-Headline with High Contrast */}
        <p
          style={{
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            fontSize: 'clamp(13.5px, 1.15vw, 15.5px)',
            fontWeight: 400,
            color: '#334155',
            lineHeight: 1.65,
            maxWidth: '580px',
            margin: '0 0 36px 0'
          }}
        >
          Sistem pemantauan utilisasi kapasitas port ODP Greenfield, verifikasi kegiatan lapangan,
          dan evaluasi distribusi Sales Force secara terpadu.
        </p>

        {/* Crisp Telkomsel Red Signature Button */}
        <button
          type="button"
          id="landing-login-btn"
          tabIndex={isLoginOpen ? -1 : 0}
          onClick={handleOpenLogin}
          style={{
            backgroundColor: '#E0001B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 56px',
            fontSize: '16px',
            fontWeight: 400,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(224, 0, 27, 0.28)',
            fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#C50017';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 22px rgba(224, 0, 27, 0.38)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#E0001B';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(224, 0, 27, 0.28)';
          }}
        >
          Login
        </button>
      </div>

      {/* Dynamic Frosted Crimson Login Pop-up Modal */}
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
    </div>
  );
});

export default LandingPage;
