import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';
import TurnstileWidget, { TURNSTILE_SITE_KEY } from './TurnstileWidget';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);

  const usernameInputRef = useRef(null);
  const turnstileRef = useRef(null);

  // Auto-focus username field when modal opens & handle Escape key to close (Antislop R-26 & R-32)
  useEffect(() => {
    if (!isOpen) return undefined;

    const focusTimer = setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 60);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password) {
      setError('Silakan masukkan username dan password Anda.');
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Selesaikan verifikasi keamanan (captcha) terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, turnstileToken })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        if (onLoginSuccess) {
          onLoginSuccess(data.user, data.expiresAt);
        }
      } else {
        const fallbackMsg =
          res.status >= 500
            ? 'Terjadi gangguan pada server backend. Silakan coba beberapa saat lagi.'
            : 'Login gagal. Periksa kembali username dan password Anda.';
        setError(data.message || data.error || fallbackMsg);
        turnstileRef.current?.reset();
      }
    } catch (err) {
      console.error(err);
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="presentation"
      className="landing-login-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading && onClose) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(15, 23, 42, 0.42)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'landingModalBackdropIn 0.22s ease-out forwards',
        boxSizing: 'border-box'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="landing-login-modal"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '410px',
          padding: '36px 32px 32px',
          borderRadius: '22px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow:
            '0 24px 56px rgba(15, 23, 42, 0.18), 0 4px 16px rgba(15, 23, 42, 0.08), inset 0 1px 0 #FFFFFF',
          fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
          fontWeight: 400,
          color: '#0F172A',
          boxSizing: 'border-box',
          animation: 'landingModalCardIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Top-Right Close Button */}
        {onClose && (
          <button
            type="button"
            id="login-modal-close-btn"
            aria-label="Tutup pop up login"
            disabled={loading}
            onClick={onClose}
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: isCloseHovered ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
              backgroundColor: isCloseHovered ? '#F1F5F9' : 'rgba(255, 255, 255, 0.8)',
              color: isCloseHovered ? '#0F172A' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
              padding: 0
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Modal Header with Telkomsel Symbol */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <img
              src="/telkomsel-symbol.png"
              alt=""
              aria-hidden="true"
              style={{
                height: '32px',
                width: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 2px 6px rgba(224, 0, 27, 0.25))'
              }}
            />
          </div>
          <h2
            id="login-modal-title"
            style={{
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              fontSize: '24px',
              fontWeight: 400,
              color: '#0F172A',
              letterSpacing: '-0.3px',
              margin: '0 0 6px 0'
            }}
          >
            Login Petugas
          </h2>
          <p
            style={{
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              fontSize: '13px',
              fontWeight: 400,
              color: '#475569',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            Masuk untuk mengakses monitoring okupansi ODP
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Username Input Box */}
          <div style={{ marginBottom: '18px', textAlign: 'left' }}>
            <label
              htmlFor="login-username"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 400,
                color: '#1E293B',
                marginBottom: '8px',
                letterSpacing: '0.01em'
              }}
            >
              Username
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                ref={usernameInputRef}
                type="text"
                id="login-username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan username"
                style={{
                  width: '100%',
                  height: '46px',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border:
                    focusedField === 'username'
                      ? '1.5px solid #E0001B'
                      : '1px solid #CBD5E1',
                  backgroundColor:
                    focusedField === 'username'
                      ? '#FFFFFF'
                      : 'rgba(248, 250, 252, 0.95)',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '10px 42px 10px 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#0F172A',
                  fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
                  transition: 'all 0.18s ease'
                }}
              />
              {/* Right User Icon */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'username' ? '#E0001B' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  transition: 'color 0.18s ease'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            </div>
          </div>

          {/* Password Input Box */}
          <div
            style={{
              marginBottom: TURNSTILE_SITE_KEY ? '18px' : '24px',
              textAlign: 'left'
            }}
          >
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 400,
                color: '#1E293B',
                marginBottom: '8px',
                letterSpacing: '0.01em'
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan password"
                style={{
                  width: '100%',
                  height: '46px',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border:
                    focusedField === 'password'
                      ? '1.5px solid #E0001B'
                      : '1px solid #CBD5E1',
                  backgroundColor:
                    focusedField === 'password'
                      ? '#FFFFFF'
                      : 'rgba(248, 250, 252, 0.95)',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '10px 44px 10px 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#0F172A',
                  letterSpacing: showPassword || !password ? 'normal' : '2.5px',
                  fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
                  transition: 'all 0.18s ease'
                }}
              />

              {/* Eye Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: '6px',
                  color: focusedField === 'password' ? '#E0001B' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.18s ease'
                }}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Optional Cloudflare Turnstile Captcha */}
          {TURNSTILE_SITE_KEY && (
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 400,
                  color: '#1E293B',
                  marginBottom: '8px'
                }}
              >
                Verifikasi Keamanan
              </label>
              <TurnstileWidget
                ref={turnstileRef}
                action="login"
                onToken={setTurnstileToken}
                onError={() =>
                  setError(
                    'Captcha gagal dimuat. Periksa koneksi internet, lalu muat ulang halaman.'
                  )
                }
              />
            </div>
          )}

          {/* Error Feedback Banner */}
          {error && (
            <div
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '12.5px',
                fontWeight: 400,
                lineHeight: 1.45,
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}

          {/* Dynamic Telkomsel Red Signature Submit Button */}
          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            onMouseEnter={() => setIsSubmitHovered(true)}
            onMouseLeave={() => setIsSubmitHovered(false)}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: isSubmitHovered ? '#C50017' : '#E0001B',
              color: '#FFFFFF',
              fontSize: '15.5px',
              fontWeight: 400,
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSubmitHovered
                ? '0 6px 20px rgba(224, 0, 27, 0.35)'
                : '0 4px 14px rgba(224, 0, 27, 0.25)',
              transform: isSubmitHovered && !loading ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
