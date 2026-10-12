import { memo } from 'react';

const LandingPage = memo(function LandingPage({ onLoginClick, onExplore }) {
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (onLoginClick) {
      onLoginClick();
    } else if (onExplore) {
      onExplore();
    } else {
      window.location.hash = 'login';
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundImage: "url('/landing-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxSizing: 'border-box'
      }}
    >
      {/* Dark Vignette Overlay on the Left Side to ensure high contrast & legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.70) 0%, rgba(0, 0, 0, 0.45) 36%, rgba(0, 0, 0, 0.12) 65%, transparent 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Top Left: Telkomsel White Container Badge (Flush against the left screen edge) */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(36px, 5.5vh, 48px)',
          left: 0,
          zIndex: 10,
          backgroundColor: '#FFFFFF',
          borderRadius: '0 4px 4px 0',
          padding: '0 24px 0 32px',
          height: '52px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.14)'
        }}
      >
        <img
          src="/telkomsel-logo.png"
          alt="Telkomsel"
          style={{
            width: '135px',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>

      {/* Center Left: Main Headline & Flat Red Login Button (No Glow Effect) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 'clamp(24px, 4.5vw, 56px)',
          transform: 'translateY(-50%)',
          maxWidth: '640px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}
      >
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 'clamp(32px, 3.8vw, 52px)',
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: '-0.5px',
            margin: '0 0 32px 0',
            textShadow: '0 2px 12px rgba(0, 0, 0, 0.55)',
            userSelect: 'none'
          }}
        >
          Platform Pemantauan<br />
          Okupansi ODP<br />
          Regional Jawa Tengah<br />
          dan Yogyakarta
        </h1>

        <button
          type="button"
          id="landing-login-btn"
          onClick={handleLogin}
          style={{
            backgroundColor: '#FF0000',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '9999px',
            padding: '11px 44px',
            fontSize: '17px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'none', // Strictly no glow effect
            outline: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease, transform 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E50000';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FF0000';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
});

export default LandingPage;
