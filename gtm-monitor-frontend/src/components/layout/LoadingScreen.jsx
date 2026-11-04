import { memo, useEffect, useState } from 'react';

const LoadingScreen = memo(function LoadingScreen({ isVisible = true }) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsFadingOut(false);
    } else {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat sistem monitoring"
      className="transition-loading-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#021329',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
        fontWeight: 400,
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Directional Deep Navy Spotlight Backdrop */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 46%, rgba(14, 57, 115, 0.32) 0%, rgba(3, 20, 44, 0.18) 45%, rgba(2, 19, 41, 0) 75%)',
          pointerEvents: 'none'
        }}
      />

      {/* Decorative Corner Grid Crosshairs (Echoing Networking Precision) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '32px',
          left: '36px',
          color: 'rgba(125, 211, 252, 0.35)',
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase'
        }}
      >
        TELKOMSEL TELEMETRY
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '28px',
          right: '36px',
          color: 'rgba(148, 163, 184, 0.45)',
          fontSize: '11px',
          letterSpacing: '0.12em'
        }}
      >
        REGIONAL JATENG &amp; DIY
      </div>

      {/* Center Composition */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px'
        }}
      >
        {/* Telkomsel 'T' Symbol with Breathing Optical Telemetry Halo */}
        <div
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '26px'
          }}
        >
          {/* Outer Breathing Halo */}
          <div
            className="transition-loading-aura"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-12px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(225, 29, 72, 0.28) 0%, rgba(56, 189, 248, 0.16) 48%, transparent 72%)',
              animation: 'telkomselAuraPulse 2.4s ease-in-out infinite',
              pointerEvents: 'none'
            }}
          />

          {/* Telkomsel 'T' Symbol Image */}
          <img
            src="/telkomsel-symbol.png"
            alt="Telkomsel"
            style={{
              width: '46px',
              height: 'auto',
              display: 'block',
              filter:
                'drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 4px 14px rgba(225, 29, 72, 0.35))',
              position: 'relative',
              zIndex: 2
            }}
          />
        </div>

        {/* Primary Status Title */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: '#FFFFFF',
            letterSpacing: '-0.2px',
            marginBottom: '8px'
          }}
        >
          Sinkronisasi Sistem Monitoring
        </div>

        {/* Secondary Subtitle */}
        <div
          style={{
            fontSize: '12.5px',
            fontWeight: 400,
            color: 'rgba(203, 213, 225, 0.72)',
            lineHeight: 1.5,
            marginBottom: '24px'
          }}
        >
          Menyiapkan telemetri ODP Regional Jateng &amp; DIY...
        </div>

        {/* Telemetry Precision Hairline Scanning Bar */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            width: '210px',
            height: '2.5px',
            borderRadius: '99px',
            backgroundColor: 'rgba(125, 211, 252, 0.15)',
            overflow: 'hidden'
          }}
        >
          <div
            className="transition-loading-beam"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '80px',
              borderRadius: '99px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.8) 40%, #FFFFFF 65%, rgba(225, 29, 72, 0.9) 100%)',
              animation: 'telemetryScanningBeam 1.8s ease-in-out infinite'
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default LoadingScreen;
