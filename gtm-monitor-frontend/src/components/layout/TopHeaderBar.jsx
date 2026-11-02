import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';

export default function TopHeaderBar({
  user,
  isAdmin,
  activeSection = 'dashboard',
  onLoginClick,
  goAdmin,
  pendingCount = 0,
  onToggleMobileSidebar,
  typeDesignFilter = 'ALL',
  setTypeDesignFilter
}) {
  const location = useLocation();
  const isBranchPage = location.pathname.startsWith('/branch');
  const isDashboard = location.pathname === '/' || location.pathname.startsWith('/dashboard');
  const isAdminPage = location.pathname.startsWith('/admin');
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header
      className="top-header-bar"
      style={{
        height: '64px',
        minHeight: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
      }}
    >
      <div
        className="header-left-zone"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '64px',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="mobile-hamburger-btn"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            padding: '8px',
            minWidth: '44px',
            minHeight: '44px',
            cursor: 'pointer',
            color: '#1E293B',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Buka Navigasi Mobile"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Penanda Halaman Admin */}
        {isAdminPage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '18px',
                fontWeight: 600,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.3px',
                lineHeight: 1
              }}
            >
              Admin
            </h1>
          </div>
        )}

        {/* Judul Halaman Continuous (Dashboard / Activity) dengan Ikon Persis seperti Opsi Sidebar */}
        {(isDashboard || isBranchPage) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            {activeSection === 'activity' ? (
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block', flexShrink: 0 }}
                aria-hidden="true"
              >
                <rect x="4" y="3" width="16" height="18" rx="2.5" />
                <line x1="8" y1="8" x2="16" y2="8" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="8" y1="16" x2="13" y2="16" />
              </svg>
            ) : (
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block', flexShrink: 0 }}
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
            )}

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '18px',
                fontWeight: 600,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.3px',
                lineHeight: 1
              }}
            >
              {activeSection === 'activity' ? 'Activity' : 'Dashboard'}
            </h1>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
        {/* Filter Segmented Control Tipe Proyek di Top Bar (Dipertahankan di kedua section) */}
        {isDashboard && setTypeDesignFilter && (
          <div
            role="radiogroup"
            aria-label="Filter Tipe Proyek"
            className="header-segmented-filter"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
            }}
          >
            {[
              { id: 'ALL', label: 'Semua Tipe' },
              { id: 'Greenfield', label: 'Greenfield' },
              { id: 'Brownfield', label: 'Brownfield' }
            ].map((f) => {
              const isActive = typeDesignFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setTypeDesignFilter(f.id)}
                  style={{
                    height: '30px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {isDashboard && setTypeDesignFilter && (
          <div
            style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#E2E8F0'
            }}
          />
        )}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            title={pendingCount > 0 ? `${pendingCount} aktivitas menunggu verifikasi` : 'Tidak ada aktivitas baru'}
            aria-label={pendingCount > 0 ? `${pendingCount} aktivitas menunggu verifikasi` : 'Notifikasi aktivitas'}
            aria-expanded={showNotificationDropdown}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '10px',
              background: showNotificationDropdown ? '#F1F5F9' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              if (!showNotificationDropdown) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {pendingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#800000',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 1px 3px rgba(128, 0, 0, 0.4)'
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>

          {showNotificationDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '320px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.12)',
                padding: '16px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Notifikasi Aktivitas</span>
                {pendingCount > 0 && (
                  <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: '#FEF3C7', color: '#B45309' }}>
                    {pendingCount} Menunggu
                  </span>
                )}
              </div>

              {pendingCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#FFFBEB',
                      borderRadius: '10px',
                      border: '1px solid #FDE68A'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                      1 Kegiatan Menunggu Verifikasi
                    </div>
                    <div style={{ fontSize: '11px', color: '#78350F', marginTop: '4px', lineHeight: 1.4 }}>
                      Aktivitas pelaporan lapangan baru telah diunggah dan memerlukan tinjauan verifikasi admin.
                    </div>
                    {isAdmin && goAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotificationDropdown(false);
                          goAdmin();
                        }}
                        style={{
                          marginTop: '8px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          background: '#F59E0B',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Tinjau Sekarang →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 8px', color: '#64748B', fontSize: '12px' }}>
                  Tidak ada aktivitas
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          {user ? (
            <div
              className="header-profile-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minHeight: '44px',
                padding: '6px 10px 6px 6px',
                borderRadius: '12px',
                userSelect: 'none',
                cursor: 'default'
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div className="header-profile-text" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                  {user.username || 'admin'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 500 }}>
                  {user.role === 'ADMIN' ? 'admin 1' : 'user'}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              style={{
                minHeight: '44px',
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#800000',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#990000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#800000';
              }}
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
