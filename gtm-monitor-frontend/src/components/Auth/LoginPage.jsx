import { useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';

export default function LoginPage({ onLoginSuccess, onBackToLanding }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!username.trim() || !password) {
      setError('Silakan masukkan username dan password Anda.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // server memasang cookie sesi HttpOnly
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        if (onLoginSuccess) onLoginSuccess(data.user, data.expiresAt);
      } else {
        setError(data.message || 'Login gagal. Periksa kembali username dan password Anda.');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal terhubung ke server. Pastikan server backend sedang aktif.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ─── LEFT PANE: 57.2% WIDTH (EXACT MOCKUP PROPORTION 781px / 1366px) ─── */}
      <div
        style={{
          flex: '0 0 57.2%',
          width: '57.2%',
          minHeight: '100dvh',
          backgroundColor: '#FFFFFF',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Proportional Accent Wave Lines SVG Background */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
          viewBox="0 0 781 768"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top-Right Waves: Flowing smoothly from x=435 down to right border */}
          <path
            d="M 435,0 C 445,55 480,95 540,115 C 620,140 700,125 781,148"
            stroke="#FFB8BC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 475,0 C 485,65 520,110 580,130 C 655,155 715,145 781,168"
            stroke="#FFB8BC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Bottom-Left Waves: Concentric curves in bottom-left corner */}
          <path
            d="M 0,620 C 70,620 130,645 125,710 C 120,745 60,768 0,768"
            stroke="#FFB8BC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 0,660 C 50,660 95,680 90,735 C 85,758 45,768 0,768"
            stroke="#FFB8BC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 0,700 C 35,700 65,715 60,755 C 55,765 25,768 0,768"
            stroke="#FFB8BC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Top-Left: Proportional Telkomsel Wordmark Logo (x: 79px, y: 101px, w: 117px) */}
        <div
          style={{
            position: 'absolute',
            top: 'clamp(36px, 13.1vh, 101px)',
            left: 'clamp(32px, 5.8vw, 79px)',
            zIndex: 10
          }}
        >
          <img
            src="/telkomsel-logo.png"
            alt="Telkomsel"
            style={{
              width: '117px',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>

        {/* Top-Right: Back to Landing Page Button */}
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            style={{
              position: 'absolute',
              top: 'clamp(28px, 6vh, 48px)',
              right: '32px',
              zIndex: 20,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FF0000';
              e.currentTarget.style.borderColor = '#FF0000';
              e.currentTarget.style.backgroundColor = '#FFF5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748B';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
          >
            <span>← Kembali ke Beranda</span>
          </button>
        )}

        {/* Center: Welcome Heading & Proportional Form Container (Width: 542px) */}
        <div
          style={{
            width: '100%',
            maxWidth: '542px',
            zIndex: 10,
            boxSizing: 'border-box',
            marginTop: '10px'
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#111827',
              textAlign: 'center',
              margin: '0 0 44px 0',
              letterSpacing: '-0.5px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Welcome!
          </h1>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {/* Username Field */}
            <div style={{ marginBottom: '28px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#1F2937',
                  marginBottom: '6px'
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Gatfanrajendra9@gmail.com"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: 'none',
                  borderBottom: '1.5px solid #2B2B2B',
                  borderRadius: 0,
                  backgroundColor: 'transparent',
                  padding: '6px 0',
                  fontSize: '14px',
                  color: '#1F2937',
                  outline: 'none',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => { e.target.style.borderBottomColor = '#FF0000'; }}
                onBlur={(e) => { e.target.style.borderBottomColor = '#2B2B2B'; }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '40px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#1F2937',
                  marginBottom: '6px'
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: 'none',
                    borderBottom: '1.5px solid #2B2B2B',
                    borderRadius: 0,
                    backgroundColor: 'transparent',
                    padding: '6px 36px 6px 0',
                    fontSize: '14px',
                    color: '#1F2937',
                    letterSpacing: showPassword ? 'normal' : '4px',
                    outline: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => { e.target.style.borderBottomColor = '#FF0000'; }}
                  onBlur={(e) => { e.target.style.borderBottomColor = '#2B2B2B'; }}
                />

                {/* Eye Icon Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#4B5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none'
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Interactive Login Button:
                - Width: 100% of container (542px)
                - Height: 54px
                - Unhovered: Background Putih, Border Merah, Teks Hitam
                - Hovered: Background Merah Solid (#FF0000), Border Merah, Teks Putih
            */}
            {error && (
              <div
                role="alert"
                style={{
                  margin: '-20px 0 20px 0',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#DC2626',
                  textAlign: 'center',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                width: '100%',
                height: '54px',
                borderRadius: '12px',
                border: '1.5px solid #FF0000',
                backgroundColor: isHovered ? '#FF0000' : '#FFFFFF',
                color: isHovered ? '#FFFFFF' : '#111827',
                fontSize: '15px',
                fontWeight: isHovered ? 600 : 500,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: 'none',
                transition: 'background-color 0.22s ease, color 0.22s ease'
              }}
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      {/* ─── RIGHT PANE: 42.8% WIDTH (TELKOMSEL AGENT PHOTOGRAPHY 585px / 1366px) ─── */}
      <div
        style={{
          flex: '0 0 42.8%',
          width: '42.8%',
          minHeight: '100dvh',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0F172A'
        }}
      >
        <img
          src="/login-agent-hero.webp"
          alt="Telkomsel Officer"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 22%',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}
