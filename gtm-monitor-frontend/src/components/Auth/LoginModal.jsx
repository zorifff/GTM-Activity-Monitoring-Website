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
      setError('Gagal terhubung ke server. Pastikan server backend sedang aktif.');
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
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
        backgroundColor: 'rgba(1, 10, 24, 0.42)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
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
          padding: '38px 34px 34px',
          borderRadius: '22px',
          background:
            'linear-gradient(155deg, rgba(14, 48, 94, 0.62) 0%, rgba(5, 22, 48, 0.78) 55%, rgba(2, 13, 29, 0.88) 100%)',
          backdropFilter: 'blur(20px) saturate(145%)',
          WebkitBackdropFilter: 'blur(20px) saturate(145%)',
          border: '1px solid rgba(125, 211, 252, 0.34)',
          boxShadow:
            '0 28px 64px rgba(0, 5, 16, 0.68), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
          fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
          fontWeight: 400,
          color: '#FFFFFF',
          boxSizing: 'border-box',
          animation: 'landingModalCardIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Top-Right Close Button (Ref #2) */}
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
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: isCloseHovered
                ? '1px solid rgba(186, 230, 253, 0.55)'
                : '1px solid rgba(125, 211, 252, 0.18)',
              backgroundColor: isCloseHovered
                ? 'rgba(125, 211, 252, 0.14)'
                : 'rgba(255, 255, 255, 0.04)',
              color: isCloseHovered ? '#FFFFFF' : 'rgba(226, 232, 240, 0.78)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
              padding: 0
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Modal Header (Ref #1 & Ref #4) */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2
            id="login-modal-title"
            style={{
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              fontSize: '28px',
              fontWeight: 400,
              color: '#FFFFFF',
              letterSpacing: '-0.3px',
              margin: '0 0 8px 0'
            }}
          >
            Login
          </h2>
          <p
            style={{
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(203, 213, 225, 0.76)',
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
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label
              htmlFor="login-username"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 400,
                color: 'rgba(226, 232, 240, 0.88)',
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
                      ? '1px solid #7DD3FC'
                      : '1px solid rgba(125, 211, 252, 0.26)',
                  backgroundColor:
                    focusedField === 'username'
                      ? 'rgba(4, 22, 48, 0.72)'
                      : 'rgba(2, 12, 27, 0.52)',
                  boxShadow:
                    focusedField === 'username'
                      ? '0 0 0 3px rgba(56, 189, 248, 0.14)'
                      : 'none',
                  padding: '10px 42px 10px 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#FFFFFF',
                  fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
                  transition: 'all 0.18s ease'
                }}
              />
              {/* Right User Icon (Ref #4) */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color:
                    focusedField === 'username'
                      ? '#7DD3FC'
                      : 'rgba(148, 163, 184, 0.65)',
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
              marginBottom: TURNSTILE_SITE_KEY ? '20px' : '26px',
              textAlign: 'left'
            }}
          >
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 400,
                color: 'rgba(226, 232, 240, 0.88)',
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
                      ? '1px solid #7DD3FC'
                      : '1px solid rgba(125, 211, 252, 0.26)',
                  backgroundColor:
                    focusedField === 'password'
                      ? 'rgba(4, 22, 48, 0.72)'
                      : 'rgba(2, 12, 27, 0.52)',
                  boxShadow:
                    focusedField === 'password'
                      ? '0 0 0 3px rgba(56, 189, 248, 0.14)'
                      : 'none',
                  padding: '10px 44px 10px 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#FFFFFF',
                  letterSpacing: showPassword || !password ? 'normal' : '2.5px',
                  fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
                  transition: 'all 0.18s ease'
                }}
              />

              {/* Eye Toggle Button (Ref #1 & Ref #4) */}
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
                  color:
                    focusedField === 'password'
                      ? '#7DD3FC'
                      : 'rgba(148, 163, 184, 0.72)',
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
            <div style={{ marginBottom: '22px', textAlign: 'left' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 400,
                  color: 'rgba(226, 232, 240, 0.88)',
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
                marginBottom: '18px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(220, 38, 38, 0.18)',
                border: '1px solid rgba(248, 113, 113, 0.45)',
                color: '#FECACA',
                fontSize: '12.5px',
                fontWeight: 400,
                lineHeight: 1.45,
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}

          {/* Dynamic Frosted Cyan-Navy Submit Button */}
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
              border: isSubmitHovered
                ? '1.5px solid #FFFFFF'
                : '1.5px solid rgba(186, 230, 253, 0.62)',
              background: isSubmitHovered
                ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.32) 0%, rgba(14, 116, 144, 0.48) 100%)'
                : 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(14, 116, 144, 0.32) 100%)',
              color: '#FFFFFF',
              fontSize: '15.5px',
              fontWeight: 400,
              fontFamily: "'Gordita', 'Gordita-Regular', var(--font-landing, sans-serif)",
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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

