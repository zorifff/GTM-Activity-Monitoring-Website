This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/**/*.{js,jsx,css}, package.json, vite.config.js, index.html
- Files matching these patterns are excluded: node_modules/**, dist/**, build/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
src/
  api/
    queries.js
  auth/
    AuthContext.jsx
  components/
    admin/
      AdminActionHubCard.jsx
      AdminHeader.jsx
      AdminKpiGrid.jsx
      AdminTabs.jsx
      DeleteProgramConfirmModal.jsx
      ExportRekapModal.jsx
      MonitoringTab.jsx
      OdpImportCard.jsx
      OdpImportModal.jsx
      PairingImportCard.jsx
      PairingImportModal.jsx
      ProgramDeleteCard.jsx
      ProgramDeleteModal.jsx
      ProgramUploadCard.jsx
      ProgramUploadModal.jsx
      UploadGuideModal.jsx
    Auth/
      LoginPage.jsx
      TurnstileWidget.jsx
    dashboard/
      BranchProjectsPieCard.jsx
      BranchRankingCard.jsx
      DashboardHeader.jsx
      ExecutiveSummaryCard.jsx
      ExecutiveSummarySection.jsx
      GtmExecutionInsightCard.jsx
      HeroOccupancyCard.jsx
      KpiCards.jsx
      OdpStatusDonutCard.jsx
      PortDistributionChartCard.jsx
      RegionalMetricsSummaryCard.jsx
      RightWidgetPanel.jsx
      SearchFilterToolbar.jsx
    layout/
      AppSidebar.jsx
      CekPairingNavItem.jsx
      LoadingScreen.jsx
      LogoutConfirmModal.jsx
      ProfileMenu.jsx
      ProgramMenu.jsx
      SessionExpiredModal.jsx
      TopHeaderBar.jsx
      TopNav.jsx
    ActivityStatus.jsx
    AdminPanel.jsx
    BranchView.jsx
    CekPairingPopover.jsx
    ConfirmDeleteModal.jsx
    ConfirmRejectModal.jsx
    ConfirmSubmitModal.jsx
    Dashboard.jsx
    LandingPage.jsx
    ProgramViewerModal.jsx
    ProjectTable.jsx
    ReviewModal.jsx
    UploadModal.jsx
    UploadView.jsx
  constants/
    dashboard.js
    gapWow.js
    programs.js
  hooks/
    useActivityActions.js
    useAdminMonitoring.js
    useAppNotifications.js
    useCountUp.js
    useExecutiveSummary.js
    useExecutiveSummaryExport.js
    useGtmMonitoring.js
    useInView.js
    useLastUpdateLabel.js
    useMonitoringData.js
    useOdpImport.js
    useOdpSummary.js
    usePairingImport.js
    usePairingSearch.js
    useProgramDelete.js
    usePrograms.js
    useProgramUpload.js
    useProjectReviewModal.js
    useRekapExcelExport.js
  lib/
    queryClient.js
  routes/
    AppLayout.jsx
    guards.jsx
    pages.jsx
    paths.js
  apiConfig.js
  App.jsx
  index.css
  jobEvents.js
  main.jsx
  utils.js
index.html
package.json
vite.config.js
```

# Files

## File: src/api/queries.js
```javascript
// Kunci & fungsi pengambil data server (dipakai TanStack Query). Mutasi (upload/verifikasi/hapus/import)
// memanggil queryClient.invalidateQueries({ queryKey: … }) agar data yang terkait diambil ulang.
import { API_BASE_URL } from '../apiConfig';

export const queryKeys = {
  // Data monitoring per akun (branch → proyek → ODP & aktivitas) + ringkasan Jateng DIY
  monitoring: (userKey) => ['monitoring', userKey],
  monitoringAll: ['monitoring'],
  // Program bulanan: semua periode ('all') atau satu periode (label bulan)
  programs: (month = 'all') => ['programs', month],
  programsAll: ['programs'],
  authSession: ['auth', 'session']
};

// GET /api/data + /api/import-meta (meta bersifat pelengkap: kegagalannya tidak menggagalkan data utama)
export async function fetchMonitoringData() {
  const [dataRes, metaRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/data`, { credentials: 'include' }),
    fetch(`${API_BASE_URL}/api/import-meta`, { credentials: 'include' }).catch(() => null)
  ]);
  if (!dataRes.ok) throw new Error(`Gagal memuat data monitoring (Status ${dataRes.status}).`);
  const branches = await dataRes.json();
  let importMeta = null;
  if (metaRes && metaRes.ok) importMeta = await metaRes.json();
  return { branches, importMeta };
}

// GET /api/programs — tanpa periode: { monthsData } untuk menu PROGRAM; dengan periode: daftar program periode itu
export async function fetchPrograms(month) {
  const url = month && month !== 'all'
    ? `${API_BASE_URL}/api/programs?month=${encodeURIComponent(month)}`
    : `${API_BASE_URL}/api/programs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat data program (Status ${res.status}).`);
  return res.json();
}

// GET /api/auth/session — selalu 200; { retry: true } bila tab lain sedang memperbarui sesi yang sama
export async function fetchAuthSession(attempt = 1) {
  const res = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' });
  const data = res.ok ? await res.json() : null;
  if (data?.retry && attempt < 3) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return fetchAuthSession(attempt + 1);
  }
  return data;
}
```

## File: src/auth/AuthContext.jsx
```javascript
// Status login (Universal Auth State). Token sesi ada di cookie HttpOnly (tidak terbaca JS);
// profil user diambil dari server (/api/auth/session), tidak disimpan di localStorage/sessionStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, UNAUTHORIZED_EVENT, SESSION_REFRESHED_EVENT } from '../apiConfig';
import { fetchAuthSession, queryKeys } from '../api/queries';
import { PATHS } from '../routes/paths';

const AuthContext = createContext(null);

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 menit = 900.000 ms

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);
  const lastLoginTimestamp = useRef(0);
  const lastActivityRef = useRef(Date.now());

  // Data monitoring milik akun sebelumnya dibuang saat akun berganti (login/logout)
  const clearAccountData = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.monitoringAll });
  }, [queryClient]);

  // Token sudah dipasang server sebagai cookie HttpOnly; frontend hanya menyimpan profil di memori
  const login = useCallback((newUser, expiresAt) => {
    document.activeElement?.blur();
    lastLoginTimestamp.current = Date.now();
    lastActivityRef.current = Date.now(); // Reset timestamp aktivitas saat login berhasil
    clearAccountData();
    setUser(newUser);
    setSessionExpiresAt(expiresAt || null);

    // Semua akun (Admin & User) selalu masuk ke Dashboard terlebih dahulu
    navigate(PATHS.dashboard, { replace: true });
  }, [clearAccountData, navigate]);

  const logout = useCallback(() => {
    lastActivityRef.current = Date.now(); // Reset timestamp aktivitas saat logout
    // Cookie HttpOnly hanya bisa dihapus oleh server. keepalive: request tetap terkirim walau halaman
    // langsung dimuat ulang / ditutup setelah logout (sesi di server pasti dicabut)
    fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include', keepalive: true })
      .catch(() => { /* server tidak terjangkau: cookie tetap kedaluwarsa sesuai masa aktifnya */ });
    setUser(null);
    setSessionExpiresAt(null);
    clearAccountData();
    navigate(PATHS.landing, { replace: true });
  }, [clearAccountData, navigate]);

  // ─── VALIDASI TOKEN SESI (TOKEN TIDAK SAH / KEDALUWARSA → LOGIN ULANG) ───
  const handleInvalidSession = useCallback(() => {
    logout();
    setSessionExpiredNotice('invalid');
  }, [logout]);

  // ─── OPTIMIZED 15-MINUTE INACTIVITY AUTO-LOGOUT EFFECT (ALL ROLES: ADMIN & USER) ───
  useEffect(() => {
    if (!user) return;

    // Reset timestamp aktivitas saat useEffect sesi diaktifkan untuk akun yang baru login
    lastActivityRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT) {
        logout(); // Terlogout otomatis & kembali ke menu overview (landing)
        setSessionExpiredNotice('inactivity');
      }
    };

    // Listen to user interaction events across the entire window
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

    // Evaluasi otomatis saat tab browser dibuka kembali setelah berada di background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Evaluasi berkala setiap 3 detik
    const intervalId = setInterval(checkInactivity, 3000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user, logout]);

  // Server menolak sesi (401) pada request apa pun yang memakai authFetch
  useEffect(() => {
    const onUnauthorized = () => {
      if (userRef.current) handleInvalidSession();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [handleInvalidSession]);

  // Access token diperbarui otomatis (tiap 15 menit): sinkronkan profil & batas sesi terbaru dari server
  useEffect(() => {
    const onSessionRefreshed = (event) => {
      const data = event.detail;
      if (!userRef.current || !data?.user) return;
      setUser(data.user);
      setSessionExpiresAt(data.expiresAt || null);
    };
    window.addEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed);
    return () => window.removeEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed);
  }, []);

  // Bersihkan sisa penyimpanan token/profil versi lama (sebelum migrasi ke cookie HttpOnly)
  useEffect(() => {
    try {
      ['gtm_token', 'gtm_user', 'token'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch { /* storage diblokir browser: abaikan */ }
  }, []);

  // Saat aplikasi dibuka: tanyakan ke server siapa yang login (cookie HttpOnly terkirim otomatis).
  // /api/auth/session selalu menjawab 200 dan sekaligus memperbarui sesi bila access token sudah habis.
  const sessionQuery = useQuery({
    queryKey: queryKeys.authSession,
    queryFn: () => fetchAuthSession(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  useEffect(() => {
    if (authChecked || !sessionQuery.isFetched) return;
    const data = sessionQuery.data;
    if (data?.authenticated && data.user) {
      setUser(data.user);
      setSessionExpiresAt(data.expiresAt || null);
    }
    // server tidak terjangkau: tampil sebagai pengunjung
    setAuthChecked(true);
  }, [authChecked, sessionQuery.isFetched, sessionQuery.data]);

  // Sesi login berlaku 7 hari sejak login: logout otomatis begitu batas sesi (dari server) habis
  useEffect(() => {
    if (!user || !sessionExpiresAt) return;
    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      handleInvalidSession();
      return;
    }
    // setTimeout maksimal ~24.8 hari; sesi 7 hari aman di bawah batas tersebut
    const timer = setTimeout(handleInvalidSession, Math.min(remaining, 2147483647));
    return () => clearTimeout(timer);
  }, [user, sessionExpiresAt, handleInvalidSession]);

  const value = useMemo(() => ({
    user,
    isAdmin: !!user && user.role === 'ADMIN',
    authChecked,
    sessionExpiresAt,
    login,
    logout,
    sessionExpiredNotice,
    setSessionExpiredNotice,
    lastLoginTimestamp
  }), [user, authChecked, sessionExpiresAt, login, logout, sessionExpiredNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return context;
}
```

## File: src/components/admin/AdminActionHubCard.jsx
```javascript
import { useState, useEffect } from 'react';

// ─── PUSAT PEMBARUAN DATABASE & PROGRAM (ACTION HUB 1 SEGMEN DENGAN TANDA HINT PANDUAN & KETENTUAN) ───
export default function AdminActionHubCard({
  onOpenModal
}) {
  const [activeHintId, setActiveHintId] = useState(null);
  const [isPinned, setIsPinned] = useState(false);

  const actions = [
    {
      id: 'odp',
      title: 'Data ODP & Kapasitas Port Mingguan',
      buttonLabel: 'Upload Data ODP',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload ODP',
        rules: [
          'Format berkas: Excel (.xlsx, .xls, .csv, maks. 25MB)',
          'Header kolom wajib: Branch, Project, WOK, ODP, Avai, Used, Total',
          'Nilai kolom port (Avai, Used, Total) berupa bilangan bulat valid (≥ 0)',
          'Dilarang menggunakan merged cells (sel gabungan) pada baris data',
          'File tidak boleh diproteksi password'
        ]
      }
    },
    {
      id: 'pairing',
      title: 'Data Tsel One Pairing Pelanggan',
      buttonLabel: 'Upload Pairing',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload Pairing',
        rules: [
          'Format berkas: Excel (.xlsx, .xls, .csv, maks. 25MB)',
          'Nama sheet baku: Unstacked_Pairing_Data (atau sheet pertama)',
          'Kolom utama wajib: bb_id, msisdn_parent, order_id, city, sto',
          'Dilarang merusak atau mengubah struktur nama kolom baku',
          'Dilarang menggunakan merged cells pada data pairing'
        ]
      }
    },
    {
      id: 'program',
      title: 'Tracking Program Bulanan (Flyer & OCR)',
      buttonLabel: 'Upload Program',
      isDanger: false,
      hint: {
        title: 'Panduan & Ketentuan Upload Program',
        rules: [
          'Format berkas: Gambar (.jpg, .jpeg, .png, .webp, maks. 10MB)',
          'Pilih periode bulan & tentukan nama program yang relevan',
          'Pastikan teks pada flyer terbaca jelas agar tautan bit.ly/s.id terpindai otomatis via OCR',
          'Tautan manual dapat diisi opsional bila link tidak tertera pada flyer',
          'Dilarang mengunggah berkas non-gambar (seperti .pdf atau .xlsx)'
        ]
      }
    },
    {
      id: 'delete',
      title: 'Kelola & Hapus Program Terdaftar',
      buttonLabel: 'Kelola Program',
      isDanger: true,
      hint: {
        title: 'Ketentuan Kelola & Hapus Program',
        rules: [
          'Cakupan: Manajemen basis data materi promosi',
          'Pilih periode bulan untuk melihat daftar program aktif',
          'Opsi hapus: 1 nama program spesifik atau seluruh program pada periode terpilih',
          'Tindakan penghapusan bersifat permanen dari database & Cloudinary',
          'Konfirmasi keamanan akan muncul sebelum eksekusi dilakukan'
        ]
      }
    }
  ];

  // Penanganan klik di luar atau tombol Escape untuk menutup hint popover
  useEffect(() => {
    if (!activeHintId) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveHintId(null);
        setIsPinned(false);
      }
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-hint-wrapper]')) {
        setActiveHintId(null);
        setIsPinned(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHintId]);

  const handleToggleHint = (id) => {
    if (activeHintId === id && isPinned) {
      setActiveHintId(null);
      setIsPinned(false);
    } else {
      setActiveHintId(id);
      setIsPinned(true);
    }
  };

  const handleMouseEnter = (id) => {
    if (!isPinned) {
      setActiveHintId(id);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setActiveHintId(null);
    }
  };

  return (
    <div
      className="saas-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Segmen */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>
            Pusat Pembaruan Database &amp; Program
          </h2>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
            Pilih pembaruan data mingguan atau kelola materi program melalui jendela pop-up dialog
          </div>
        </div>
      </div>

      {/* Daftar Baris Aksi Terpadu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {actions.map((act) => (
          <div
            key={act.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '14px 20px',
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            {/* Sisi Kiri: Judul + Tanda Hint + Badge (Tanpa Icon Besar, Tanpa Subtext) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                flex: 1
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13.5px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.1px' }}>
                {act.title}
              </span>

              {/* Wrapper Interaktif Tanda Hint (Hover & Click) */}
              <div
                data-hint-wrapper
                style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                onMouseEnter={() => handleMouseEnter(act.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleHint(act.id);
                  }}
                  aria-label={`Lihat panduan dan ketentuan untuk ${act.title}`}
                  title="Arahkan kursor atau klik untuk melihat panduan & ketentuan upload"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: activeHintId === act.id ? '#EFF6FF' : '#FFFFFF',
                    color: activeHintId === act.id ? '#1D4ED8' : '#64748B',
                    border: activeHintId === act.id ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>

                {/* Popover Tanda Hint (Font identik dengan halaman lain, tanpa box format terpisah, tanpa link lihat panduan lengkap) */}
                {activeHintId === act.id && (
                  <div
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '0',
                      zIndex: 60,
                      width: '350px',
                      maxWidth: 'calc(100vw - 40px)',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
                      padding: '14px 16px',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-body)',
                      color: '#334155'
                    }}
                  >
                    {/* Header Hint Popover */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
                        {act.hint.title}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHintId(null);
                          setIsPinned(false);
                        }}
                        aria-label="Tutup panduan"
                        style={{
                          border: 'none',
                          background: '#F1F5F9',
                          color: '#64748B',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#E2E8F0';
                          e.currentTarget.style.color = '#0F172A';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F1F5F9';
                          e.currentTarget.style.color = '#64748B';
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Ketentuan Upload Bersatu (Termasuk Format Berkas) */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#475569', lineHeight: 1.55 }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '6px', fontSize: '12px' }}>
                        Ketentuan Upload:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {act.hint.rules.map((rule, idx) => (
                          <li key={idx} style={{ letterSpacing: '-0.1px' }}>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sisi Kanan: Tombol Sejajar Presisi (170px) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '170px' }}>
              <button
                type="button"
                onClick={() => onOpenModal(act.id)}
                style={{
                  width: '170px',
                  height: '38px',
                  borderRadius: '8px',
                  border: act.isDanger ? '1px solid #FCA5A5' : 'none',
                  background: act.isDanger ? '#FFFFFF' : '#800000',
                  color: act.isDanger ? '#DC2626' : '#FFFFFF',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: act.isDanger ? 'none' : '0 1px 2px rgba(128, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (act.isDanger) {
                    e.currentTarget.style.background = '#FEF2F2';
                    e.currentTarget.style.borderColor = '#EF4444';
                  } else {
                    e.currentTarget.style.background = '#990000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (act.isDanger) {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                  } else {
                    e.currentTarget.style.background = '#800000';
                  }
                }}
              >
                {act.buttonLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## File: src/components/admin/AdminHeader.jsx
```javascript
// ─── 1. HEADER TITLE (MATCHING MONITORING & ACTIVITY PAGE STYLE) ───
export default function AdminHeader() {
  return (
    <div className="page-title-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          Administrator Control Panel
        </h1>
      </div>
    </div>
  );
}
```

## File: src/components/admin/AdminKpiGrid.jsx
```javascript
// ─── KPI SUMMARY GRID (4 CARDS MATCHING DASHBOARD & ACTIVITY STYLE) ───
export default function AdminKpiGrid({ priorityBranches = [], stats = {}, totalProjects = 0 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
      {/* Card 1: Total Proyek Prioritas */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Total Proyek Prioritas
        </div>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 600,
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {totalProjects.toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            Proyek
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Tersebar di{' '}
          <span
            style={{
              fontWeight: 600,
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {priorityBranches.length}
          </span>{' '}
          Branch Jateng DIY
        </div>
      </div>

      {/* Card 2: Total ODP Terpantau */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Total ODP Terpantau
        </div>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 600,
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {(stats.odpCount || 0).toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            ODP
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Kapasitas:{' '}
          <span
            style={{
              fontWeight: 600,
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {(stats.totalPort || 0).toLocaleString('id-ID')}
          </span>
          <span style={{ color: '#64748B' }}>
            ({(stats.totalUsed || 0).toLocaleString('id-ID')} port • {stats.occRate || 0}%)
          </span>
        </div>
      </div>

      {/* Card 3: Menunggu Verifikasi */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Menunggu Verifikasi</span>
          {stats.actUploaded > 0 && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF5E00' }} />}
        </div>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 600,
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {(stats.actUploaded || 0).toLocaleString('id-ID')}
          <span
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#64748B',
              letterSpacing: '-0.2px',
              marginLeft: '6px'
            }}
          >
            Kegiatan
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {stats.actUploaded > 0 ? 'Butuh tindakan review admin' : 'Semua kegiatan telah ditinjau'}
        </div>
      </div>

      {/* Card 4: Progress Verifikasi GTM */}
      <div
        className="saas-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Progress Verifikasi GTM
        </div>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 600,
            color: '#0F172A',
            letterSpacing: '-1.5px',
            margin: '18px 0 16px 0',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {(stats.actCompletionPct || 0).toLocaleString('id-ID')}%
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            height: '24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Terverifikasi:{' '}
          <span
            style={{
              fontWeight: 600,
              color: '#1E293B',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              margin: '0 4px'
            }}
          >
            {(stats.actVerified || 0).toLocaleString('id-ID')}
          </span>{' '}
          dari {(stats.totalActivitySlots || 0).toLocaleString('id-ID')} aktivitas
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/admin/AdminTabs.jsx
```javascript
// ─── 3. NAVIGATION TABS (SEGMENTED PILL) ───
export default function AdminTabs() {
  return (
    <div className="admin-tabs-container" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#F1F5F9',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}
      >
        <span
          style={{
            height: '32px',
            padding: '0 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            background: '#FFFFFF',
            color: '#0F172A',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          Update Data Mingguan
        </span>
      </div>
    </div>
  );
}
```

## File: src/components/admin/DeleteProgramConfirmModal.jsx
```javascript
import { useEffect } from 'react';

// Modal Konfirmasi Hapus Program
export default function DeleteProgramConfirmModal({ deleteProgramMonth, deleteProgramTarget, deleteLoading, setShowDeleteConfirmModal, handleExecuteDeleteProgram }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !deleteLoading) {
        setShowDeleteConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteLoading, setShowDeleteConfirmModal]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-prog-title"
      onClick={() => { if (!deleteLoading) setShowDeleteConfirmModal(false); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100006,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
            border: '1px solid #FDA4AF',
            color: '#E11D48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 6px 16px rgba(225, 29, 72, 0.15)'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 id="delete-prog-title" style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 10px 0', fontFamily: "var(--font-heading)" }}>
          Konfirmasi Hapus Program
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px 0', fontWeight: 500 }}>
          Apakah Anda yakin ingin menghapus data program terdaftar ini? Program akan terhapus dari menu navigasi program.
        </p>

        <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px 16px', marginBottom: '22px', border: '1px solid #E2E8F0', textAlign: 'left', fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Periode Bulan:</span>{' '}
            <strong style={{ color: '#0F172A', fontWeight: 700 }}>{deleteProgramMonth}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Target Hapus:</span>{' '}
            <strong style={{ color: '#DC2626', fontWeight: 700 }}>
              {deleteProgramTarget === 'ALL' ? `Semua Program di ${deleteProgramMonth}` : deleteProgramTarget}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(false)}
            disabled={deleteLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: deleteLoading ? 'not-allowed' : 'pointer'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteDeleteProgram}
            disabled={deleteLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: deleteLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
            }}
          >
            {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/admin/ExportRekapModal.jsx
```javascript
import { useEffect } from 'react';

// Modal Konfirmasi Export Rekap Excel
export default function ExportRekapModal({ setIsExportModalOpen, handleExportRekapExcel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsExportModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsExportModalOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-rekap-title"
      onClick={() => setIsExportModalOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div>
            <h3 id="export-rekap-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Konfirmasi Export Rekap</h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Format File Excel (.xlsx)</span>
          </div>
        </div>

        <p style={{ fontSize: '13.5px', color: '#334155', margin: '0 0 20px 0', lineHeight: '1.5' }}>
          Apakah Anda yakin ingin mengunduh rekapitulasi data LOP & status kegiatan dari seluruh branch ke dalam file Excel?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => setIsExportModalOpen(false)}
            style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            Batal
          </button>
          <button
            onClick={() => {
              setIsExportModalOpen(false);
              handleExportRekapExcel();
            }}
            style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)' }}
          >
            Unduh Excel
          </button>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/admin/MonitoringTab.jsx
```javascript
import ProjectTable from '../ProjectTable';
import { formatBranch } from '../../utils';

// ─── TAB 1: MONITORING & VERIFIKASI PROYEK ───
export default function MonitoringTab({ priorityBranches, totalProjects, selectedBranch, setSelectedBranch, search, setSearch, statusFilter, setStatusFilter, isBranchDropdownOpen, setIsBranchDropdownOpen, isStatusDropdownOpen, setIsStatusDropdownOpen, statusCounts, branchesWithFilteredProjects, allProjectsMultiBranch, openModal, uploadPhoto }) {
  return (
    <div className="fade-in">
      {/* Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', position: 'relative', zIndex: 80, boxShadow: 'none' }}>
        {/* Branch Filter Capsule Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => {
              setIsBranchDropdownOpen(!isBranchDropdownOpen);
              setIsStatusDropdownOpen(false);
            }}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '50px', 
              border: '1px solid #E2E8F0', 
              fontSize: '13px', 
              background: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              minWidth: '210px', 
              userSelect: 'none' 
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Branch:</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', fontWeight: 800, color: '#0F172A' }}>
              {selectedBranch === 'Semua Branch' 
                ? `Semua Branch (${totalProjects})` 
                : `${formatBranch(selectedBranch)} (${priorityBranches.find(x => x.name === selectedBranch)?.projects?.length || 0})`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isBranchDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '240px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
              <div 
                className={`dropdown-item ${selectedBranch === 'Semua Branch' ? 'active' : ''}`}
                onClick={() => { setSelectedBranch('Semua Branch'); setIsBranchDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: selectedBranch === 'Semua Branch' ? 800 : 600, color: selectedBranch === 'Semua Branch' ? '#800000' : '#334155', cursor: 'pointer' }}
              >
                Semua Branch ({totalProjects})
              </div>
              {priorityBranches.map(b => (
                <div 
                  key={b.name}
                  className={`dropdown-item ${selectedBranch === b.name ? 'active' : ''}`}
                  onClick={() => { setSelectedBranch(b.name); setIsBranchDropdownOpen(false); }}
                  style={{ padding: '12px 18px', fontSize: '13px', fontWeight: selectedBranch === b.name ? 800 : 600, color: selectedBranch === b.name ? '#800000' : '#334155', cursor: 'pointer' }}
                >
                  {formatBranch(b.name)} ({b.projects?.length || 0})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Capsule Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => {
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
              setIsBranchDropdownOpen(false);
            }}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '50px', 
              border: '1px solid #E2E8F0', 
              fontSize: '13px', 
              background: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              minWidth: '220px', 
              userSelect: 'none' 
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status:</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', fontWeight: 800, color: '#0F172A' }}>
              {statusFilter === 'all' 
                ? `Semua Status (${statusCounts.all})` 
                : statusFilter === 'need_review' 
                ? `Menunggu Verifikasi (${statusCounts.need_review})` 
                : statusFilter === 'verified' 
                ? `Sudah Terverifikasi (${statusCounts.verified})` 
                : `Belum Dikerjakan (${statusCounts.pending})`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isStatusDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '250px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
              <div 
                className={`dropdown-item ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('all'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'all' ? 800 : 600, color: statusFilter === 'all' ? '#800000' : '#334155', cursor: 'pointer' }}
              >
                Semua Status ({statusCounts.all})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'need_review' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('need_review'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'need_review' ? 800 : 600, color: statusFilter === 'need_review' ? '#800000' : '#334155', cursor: 'pointer' }}
              >
                Menunggu Verifikasi ({statusCounts.need_review})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'verified' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('verified'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'verified' ? 800 : 600, color: statusFilter === 'verified' ? '#800000' : '#334155', cursor: 'pointer' }}
              >
                Sudah Terverifikasi ({statusCounts.verified})
              </div>
              <div 
                className={`dropdown-item ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('pending'); setIsStatusDropdownOpen(false); }}
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: statusFilter === 'pending' ? 800 : 600, color: statusFilter === 'pending' ? '#800000' : '#334155', cursor: 'pointer' }}
              >
                Belum Dikerjakan ({statusCounts.pending})
              </div>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="search-container-mobile" style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Cari nama proyek, WOK, atau ODP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 20px', borderRadius: '50px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FFFFFF', outline: 'none' }}
          />
        </div>
      </div>

      {/* Project Table */}
      {branchesWithFilteredProjects.length > 0 ? (
        selectedBranch === 'Semua Branch' ? (
          <div style={{ marginBottom: '32px' }}>
            <ProjectTable 
              projects={allProjectsMultiBranch} 
              branchName="Multi Branch" 
              uploadPhoto={uploadPhoto}
              onReview={openModal}
            />
          </div>
        ) : (
          branchesWithFilteredProjects.map(b => (
            <div key={b.name} style={{ marginBottom: '32px' }}>
              <ProjectTable 
                projects={b.projects} 
                branchName={b.name} 
                uploadPhoto={uploadPhoto}
                onReview={openModal}
              />
            </div>
          ))
        )
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', color: '#64748B' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Tidak ada proyek yang sesuai filter</div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Coba ganti filter branch, status verifikasi, atau kata kunci pencarian Anda.</p>
        </div>
      )}
    </div>
  );
}
```

## File: src/components/admin/OdpImportCard.jsx
```javascript
// Kartu: Upload File Excel Data ODP
export default function OdpImportCard({
  file,
  setFile,
  loading,
  importProgress,
  message,
  setMessage,
  error,
  setError,
  handleFileChange,
  handleUpload,
  setActiveInfoModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload File Excel Data ODP
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('odp');
              }}
              title="Panduan & Aturan Upload Data ODP"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#800000';
                e.currentTarget.style.color = '#800000';
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Target Update:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              Data ODP &amp; Port Mingguan
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: file ? '#ECFDF5' : '#F8FAFC',
                border: file ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="excel-upload-input"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Pilih File ODP</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: file ? '#065F46' : '#94A3B8',
                  fontWeight: file ? 600 : 400,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
              </span>

              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (setMessage) setMessage(null);
                    if (setError) setError(null);
                  }}
                  title="Hapus file"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#800000',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}

              <input
                id="excel-upload-input"
                type="file"
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: loading || !file ? '#E2E8F0' : '#800000',
              color: loading || !file ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? `Sedang Membaca & Memperbarui Database...${importProgress ? ` (${importProgress})` : ''}` : 'Mulai Update ODP'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## File: src/components/admin/OdpImportModal.jsx
```javascript
import { useEffect } from 'react';

// Modal: Upload File Excel Data ODP
export default function OdpImportModal({
  isOpen,
  onClose,
  file,
  setFile,
  loading,
  importProgress,
  message,
  setMessage,
  error,
  setError,
  handleFileChange,
  handleUpload,
  setActiveInfoModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="odp-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 id="odp-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload File Excel Data ODP
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Target: Data ODP &amp; Kapasitas Port Mingguan
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('odp')}
                title="Panduan Format Excel ODP"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                i
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog upload ODP"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: file ? '#ECFDF5' : '#F8FAFC',
              border: file ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-odp-file-input"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Pilih File ODP</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: file ? '#065F46' : '#94A3B8',
                fontWeight: file ? 600 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
            </span>

            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (setMessage) setMessage(null);
                  if (setError) setError(null);
                }}
                title="Hapus file"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#800000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

            <input
              id="modal-odp-file-input"
              type="file"
              onClick={(e) => { e.currentTarget.value = ''; }}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading || !file}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: loading || !file ? '#E2E8F0' : '#800000',
                color: loading || !file ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? `Sedang Membaca & Memperbarui...${importProgress ? ` (${importProgress})` : ''}` : 'Mulai Update ODP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## File: src/components/admin/PairingImportCard.jsx
```javascript
// Kartu: Upload File Excel Data Tsel One Pairing
export default function PairingImportCard({
  pairingFile,
  setPairingFile,
  pairingLoading,
  pairingProgress,
  pairingMessage,
  setPairingMessage,
  pairingError,
  setPairingError,
  handlePairingUpload,
  setActiveInfoModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload File Excel Data Tsel One Pairing
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('pairing');
              }}
              title="Panduan & Aturan Upload Pairing"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#800000';
                e.currentTarget.style.color = '#800000';
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Target Update:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              Data Tsel One Pairing
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handlePairingUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: pairingFile ? '#ECFDF5' : '#F8FAFC',
                border: pairingFile ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="pairing-file-input"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Pilih File Pairing</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: pairingFile ? '#065F46' : '#94A3B8',
                  fontWeight: pairingFile ? 600 : 400,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {pairingFile ? `${pairingFile.name} (${(pairingFile.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
              </span>

              {pairingFile && (
                <button
                  type="button"
                  onClick={() => {
                    setPairingFile(null);
                    if (setPairingMessage) setPairingMessage(null);
                    if (setPairingError) setPairingError(null);
                  }}
                  title="Hapus file"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#800000',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}

              <input
                id="pairing-file-input"
                type="file"
                onClick={(e) => { e.currentTarget.value = ''; }}
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPairingFile(e.target.files[0]);
                    if (setPairingMessage) setPairingMessage(null);
                    if (setPairingError) setPairingError(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {pairingMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {pairingMessage}
            </div>
          )}

          {pairingError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {pairingError}
            </div>
          )}

          <button
            type="submit"
            disabled={pairingLoading || !pairingFile}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: pairingLoading || !pairingFile ? '#E2E8F0' : '#800000',
              color: pairingLoading || !pairingFile ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: pairingLoading || !pairingFile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {pairingLoading ? `Sedang Memproses Data Pairing...${pairingProgress ? ` (${pairingProgress})` : ''}` : 'Mulai Update Pairing'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## File: src/components/admin/PairingImportModal.jsx
```javascript
import { useEffect } from 'react';

// Modal: Upload File Excel Data Tsel One Pairing
export default function PairingImportModal({
  isOpen,
  onClose,
  pairingFile,
  setPairingFile,
  pairingLoading,
  pairingProgress,
  pairingMessage,
  setPairingMessage,
  pairingError,
  setPairingError,
  handlePairingUpload,
  setActiveInfoModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pairing-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <h3 id="pairing-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload File Excel Data Pairing
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Target: Data Tsel One Pairing Pelanggan
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('pairing')}
                title="Panduan Format Excel Pairing"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                i
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog upload pairing"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePairingUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: pairingFile ? '#ECFDF5' : '#F8FAFC',
              border: pairingFile ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-pairing-file-input"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Pilih File Pairing</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: pairingFile ? '#065F46' : '#94A3B8',
                fontWeight: pairingFile ? 600 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {pairingFile ? `${pairingFile.name} (${(pairingFile.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
            </span>

            {pairingFile && (
              <button
                type="button"
                onClick={() => {
                  setPairingFile(null);
                  if (setPairingMessage) setPairingMessage(null);
                  if (setPairingError) setPairingError(null);
                }}
                title="Hapus file"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#800000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

            <input
              id="modal-pairing-file-input"
              type="file"
              onClick={(e) => { e.currentTarget.value = ''; }}
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPairingFile(e.target.files[0]);
                  if (setPairingMessage) setPairingMessage(null);
                  if (setPairingError) setPairingError(null);
                }
              }}
              style={{ display: 'none' }}
            />
          </div>

          {pairingMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {pairingMessage}
            </div>
          )}

          {pairingError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {pairingError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={pairingLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={pairingLoading || !pairingFile}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: pairingLoading || !pairingFile ? '#E2E8F0' : '#800000',
                color: pairingLoading || !pairingFile ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: pairingLoading || !pairingFile ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {pairingLoading ? `Sedang Memproses...${pairingProgress ? ` (${pairingProgress})` : ''}` : 'Mulai Update Pairing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## File: src/components/admin/ProgramDeleteCard.jsx
```javascript
// Kartu: Kelola & Hapus Program Terdaftar
export default function ProgramDeleteCard({
  deleteProgramMonth,
  setDeleteProgramMonth,
  deleteProgramTarget,
  setDeleteProgramTarget,
  deleteAvailablePrograms = [],
  deleteLoading,
  deleteMessage,
  setDeleteMessage,
  deleteError,
  setDeleteError,
  setShowDeleteConfirmModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px', color: '#0F172A', margin: '0' }}>
              Hapus Program Terdaftar
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status Periode:</span>
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                background: deleteAvailablePrograms.length > 0 ? '#ECFDF5' : '#F1F5F9',
                border: deleteAvailablePrograms.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                color: deleteAvailablePrograms.length > 0 ? '#047857' : '#64748B',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              {deleteAvailablePrograms.length > 0 ? `${deleteAvailablePrograms.length} Program Ditemukan` : 'Tidak Ada Program'}
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {/* Select Month */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>1. Pilih Periode Bulan:</label>
              <select
                value={deleteProgramMonth}
                onChange={(e) => {
                  setDeleteProgramMonth(e.target.value);
                  setDeleteProgramTarget('ALL');
                  if (setDeleteMessage) setDeleteMessage(null);
                  if (setDeleteError) setDeleteError(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Maret 2026">Maret 2026</option>
                <option value="April 2026">April 2026</option>
                <option value="Mei 2026">Mei 2026</option>
                <option value="Juni 2026">Juni 2026</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Agustus 2026">Agustus 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="Oktober 2026">Oktober 2026</option>
                <option value="November 2026">November 2026</option>
                <option value="Desember 2026">Desember 2026</option>
              </select>
            </div>

            {/* Select Program Option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>2. Pilih Opsi Program yang Ingin Dihapus:</label>
              <select
                value={deleteProgramTarget}
                onChange={(e) => {
                  setDeleteProgramTarget(e.target.value);
                  if (setDeleteMessage) setDeleteMessage(null);
                  if (setDeleteError) setDeleteError(null);
                }}
                disabled={deleteAvailablePrograms.length === 0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: deleteAvailablePrograms.length === 0 ? '#F1F5F9' : '#FFFFFF',
                  color: deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="ALL">Seluruh Program di Periode Ini ({deleteAvailablePrograms.length} Program)</option>
                {deleteAvailablePrograms.map((p, idx) => (
                  <option key={idx} value={p.sheetName || p.name}>
                    Hanya: {p.sheetName || p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {deleteMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {deleteMessage}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {deleteError}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            disabled={deleteLoading || deleteAvailablePrograms.length === 0}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: deleteLoading || deleteAvailablePrograms.length === 0 ? '#E2E8F0' : '#DC2626',
              color: deleteLoading || deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: deleteLoading || deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>{deleteLoading ? 'Memproses Hapus...' : 'Hapus Program'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/admin/ProgramDeleteModal.jsx
```javascript
import { useEffect } from 'react';

// Modal: Kelola & Hapus Program Terdaftar
export default function ProgramDeleteModal({
  isOpen,
  onClose,
  deleteProgramMonth,
  setDeleteProgramMonth,
  deleteProgramTarget,
  setDeleteProgramTarget,
  deleteAvailablePrograms = [],
  deleteLoading,
  deleteMessage,
  setDeleteMessage,
  deleteError,
  setDeleteError,
  setShowDeleteConfirmModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <h3 id="delete-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Kelola &amp; Hapus Program Terdaftar
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Hapus program terdaftar spesifik per bulan atau periode
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog hapus program"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Status Periode Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status Periode:</span>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              background: deleteAvailablePrograms.length > 0 ? '#ECFDF5' : '#F1F5F9',
              border: deleteAvailablePrograms.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
              color: deleteAvailablePrograms.length > 0 ? '#047857' : '#64748B',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {deleteAvailablePrograms.length > 0 ? `${deleteAvailablePrograms.length} Program Ditemukan` : 'Tidak Ada Program Terdaftar'}
          </div>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Pilih Periode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>1. Pilih Periode Bulan:</label>
            <select
              value={deleteProgramMonth}
              onChange={(e) => {
                setDeleteProgramMonth(e.target.value);
                setDeleteProgramTarget('ALL');
                if (setDeleteMessage) setDeleteMessage(null);
                if (setDeleteError) setDeleteError(null);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Maret 2026">Maret 2026</option>
              <option value="April 2026">April 2026</option>
              <option value="Mei 2026">Mei 2026</option>
              <option value="Juni 2026">Juni 2026</option>
              <option value="Juli 2026">Juli 2026</option>
              <option value="Agustus 2026">Agustus 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="Oktober 2026">Oktober 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="Desember 2026">Desember 2026</option>
            </select>
          </div>

          {/* Pilih Opsi Program */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>2. Pilih Opsi Program yang Ingin Dihapus:</label>
            <select
              value={deleteProgramTarget}
              onChange={(e) => {
                setDeleteProgramTarget(e.target.value);
                if (setDeleteMessage) setDeleteMessage(null);
                if (setDeleteError) setDeleteError(null);
              }}
              disabled={deleteAvailablePrograms.length === 0}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: deleteAvailablePrograms.length === 0 ? '#F1F5F9' : '#FFFFFF',
                color: deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="ALL">Seluruh Program di Periode Ini ({deleteAvailablePrograms.length} Program)</option>
              {deleteAvailablePrograms.map((p, idx) => (
                <option key={idx} value={p.sheetName || p.name}>
                  Hanya: {p.sheetName || p.name}
                </option>
              ))}
            </select>
          </div>

          {deleteMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {deleteMessage}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {deleteError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={deleteLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirmModal(true);
              }}
              disabled={deleteLoading || deleteAvailablePrograms.length === 0}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: deleteLoading || deleteAvailablePrograms.length === 0 ? '#E2E8F0' : '#DC2626',
                color: deleteLoading || deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: deleteLoading || deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>{deleteLoading ? 'Memproses Hapus...' : 'Hapus Program'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/admin/ProgramUploadCard.jsx
```javascript
// Kartu: Upload Gambar Tracking Program Bulanan
export default function ProgramUploadCard({
  programFile,
  setProgramFile,
  programMonthLabel,
  setProgramMonthLabel,
  programName,
  setProgramName,
  programDetailUrl,
  setProgramDetailUrl,
  programLoading,
  programMessage,
  setProgramMessage,
  programError,
  setProgramError,
  programResultUpload,
  uploadAvailablePrograms = [],
  handleProgramUpload,
  setActiveInfoModal
}) {
  return (
    <div
      className="saas-card"
      style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        {/* Header Zone */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px', color: '#0F172A', margin: 0 }}>
              Upload Gambar Tracking Program Bulanan
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveInfoModal('program');
              }}
              title="Panduan & Aturan Upload Program"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.color = '#1D4ED8';
                e.currentTarget.style.background = '#EFF6FF';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              i
            </button>
          </div>

          {/* Month Selector & Program Option Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '90px' }}>Pilih Periode:</span>
              <select
                value={programMonthLabel}
                onChange={(e) => setProgramMonthLabel(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                <option value="Maret 2026">Maret 2026</option>
                <option value="April 2026">April 2026</option>
                <option value="Mei 2026">Mei 2026</option>
                <option value="Juni 2026">Juni 2026</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Agustus 2026">Agustus 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="Oktober 2026">Oktober 2026</option>
                <option value="November 2026">November 2026</option>
                <option value="Desember 2026">Desember 2026</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '90px' }}>Nama Program:</span>
                <input
                  type="text"
                  placeholder="Ketikkan atau pilih nama program..."
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  list="existing-upload-programs-list"
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '12px',
                    fontWeight: 500,
                    flex: 1,
                    outline: 'none'
                  }}
                />
                <datalist id="existing-upload-programs-list">
                  {uploadAvailablePrograms.map((p, idx) => (
                    <option key={idx} value={p.sheetName || p.name} />
                  ))}
                </datalist>
              </div>

              {/* Live Indicator if Program with same name already exists in this period */}
              {(() => {
                const trimmedInput = programName.trim().replace(/\s+/g, ' ').toLowerCase();
                if (!trimmedInput) return null;
                const match = uploadAvailablePrograms.find(p => {
                  const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
                  return pName === trimmedInput;
                });
                if (!match) return null;
                const count = Array.isArray(match.images) && match.images.length > 0 ? match.images.length : (match.imageUrl ? 1 : 0);
                return (
                  <div
                    style={{
                      marginLeft: '98px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      fontSize: '11.5px',
                      color: '#1D4ED8',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <span>ℹ️</span>
                    <span>
                      Program <strong>"{match.sheetName || match.name}"</strong> sudah ada ({count} slide gambar). Gambar ini akan ditambahkan sebagai <strong>Slide ke-{count + 1}</strong>.
                    </span>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', minWidth: '90px' }}>Link Manual:</span>
              <input
                type="url"
                placeholder="http://... (Opsional - biarkan kosong untuk OCR otomatis)"
                value={programDetailUrl}
                onChange={(e) => setProgramDetailUrl(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 500,
                  flex: 1,
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Form Zone */}
        <form onSubmit={handleProgramUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: programFile ? '#ECFDF5' : '#F8FAFC',
                border: programFile ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '10px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <label
                htmlFor="program-image-input"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Pilih Gambar</span>
              </label>

              <span
                style={{
                  fontSize: '12.5px',
                  color: programFile ? '#065F46' : '#94A3B8',
                  fontWeight: programFile ? 600 : 400,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {programFile ? `${programFile.name} (${(programFile.size / 1024).toFixed(1)} KB)` : 'Format: .jpg, .png'}
              </span>

              {programFile && (
                <button
                  type="button"
                  onClick={() => {
                    setProgramFile(null);
                    if (setProgramMessage) setProgramMessage(null);
                    if (setProgramError) setProgramError(null);
                  }}
                  title="Hapus gambar"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#800000',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              )}

              <input
                id="program-image-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onClick={(e) => { e.currentTarget.value = ''; }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setProgramFile(e.target.files[0]);
                    if (setProgramError) setProgramError(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {programMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {programMessage}
            </div>
          )}

          {programError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {programError}
            </div>
          )}

          {programResultUpload && (
            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Hasil Upload &amp; OCR Link Scan:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Status Cloudinary:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>Tersimpan</span></div>
                {programResultUpload.totalSlides > 1 && (
                  <div>
                    <strong>Status Slide:</strong>{' '}
                    <span style={{ color: '#2563EB', fontWeight: 600 }}>
                      Tersimpan sebagai Slide ke-{programResultUpload.totalSlides} (Total: {programResultUpload.totalSlides} slide gambar)
                    </span>
                  </div>
                )}
                <div><strong>Hasil Scan OCR:</strong> <span style={{ color: programResultUpload.scannedLink ? '#2563EB' : '#64748B', fontWeight: 600 }}>{programResultUpload.scannedLink || 'Tidak terdeteksi (Dapat diisi link manual)'}</span></div>
                {programResultUpload.detailUrl && (
                  <div style={{ marginTop: '4px' }}>
                    <a href={programResultUpload.detailUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontWeight: 600, fontSize: '12px' }}>
                      🔗 Buka Link Detail Resmi Slide Ini →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={programLoading || !programFile}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: programLoading || !programFile ? '#E2E8F0' : '#800000',
              color: programLoading || !programFile ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: programLoading || !programFile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {programLoading ? 'Sedang Mengunggah & Memindai OCR...' : 'Mulai Upload Gambar Program'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## File: src/components/admin/ProgramUploadModal.jsx
```javascript
import { useEffect } from 'react';

// Modal: Upload Gambar Tracking Program Bulanan
export default function ProgramUploadModal({
  isOpen,
  onClose,
  programFile,
  setProgramFile,
  programMonthLabel,
  setProgramMonthLabel,
  programName,
  setProgramName,
  programDetailUrl,
  setProgramDetailUrl,
  programLoading,
  programMessage,
  setProgramMessage,
  programError,
  setProgramError,
  programResultUpload,
  uploadAvailablePrograms = [],
  handleProgramUpload,
  setActiveInfoModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <h3 id="program-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload Gambar Tracking Program
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Unggah flyer program bulanan &amp; pindai teks link detail (OCR)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('program')}
                title="Panduan Upload Gambar Program"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                i
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog upload program"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleProgramUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pilih Periode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>Pilih Periode Bulan:</label>
            <select
              value={programMonthLabel}
              onChange={(e) => setProgramMonthLabel(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Maret 2026">Maret 2026</option>
              <option value="April 2026">April 2026</option>
              <option value="Mei 2026">Mei 2026</option>
              <option value="Juni 2026">Juni 2026</option>
              <option value="Juli 2026">Juli 2026</option>
              <option value="Agustus 2026">Agustus 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="Oktober 2026">Oktober 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="Desember 2026">Desember 2026</option>
            </select>
          </div>

          {/* Nama Program */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>Nama Program:</label>
            <input
              type="text"
              placeholder="Ketikkan atau pilih nama program..."
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              list="modal-existing-programs-list"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <datalist id="modal-existing-programs-list">
              {uploadAvailablePrograms.map((p, idx) => (
                <option key={idx} value={p.sheetName || p.name} />
              ))}
            </datalist>

            {/* Live Indicator */}
            {(() => {
              const trimmedInput = programName.trim().replace(/\s+/g, ' ').toLowerCase();
              if (!trimmedInput) return null;
              const match = uploadAvailablePrograms.find((p) => {
                const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
                return pName === trimmedInput;
              });
              if (!match) return null;
              const count = Array.isArray(match.images) && match.images.length > 0 ? match.images.length : match.imageUrl ? 1 : 0;
              return (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    fontSize: '11.5px',
                    color: '#1D4ED8',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>ℹ️</span>
                  <span>
                    Program <strong>"{match.sheetName || match.name}"</strong> sudah ada ({count} slide). File ini akan ditambahkan sebagai <strong>Slide ke-{count + 1}</strong>.
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Link Manual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>
              Link Manual <span style={{ fontWeight: 400 }}>(Opsional)</span>:
            </label>
            <input
              type="url"
              placeholder="http://... (Kosongkan bila ingin dipindai via OCR)"
              value={programDetailUrl}
              onChange={(e) => setProgramDetailUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: programFile ? '#ECFDF5' : '#F8FAFC',
              border: programFile ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-program-image-input"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Pilih Gambar</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: programFile ? '#065F46' : '#94A3B8',
                fontWeight: programFile ? 600 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {programFile ? `${programFile.name} (${(programFile.size / 1024).toFixed(1)} KB)` : 'Format: .jpg, .png'}
            </span>

            {programFile && (
              <button
                type="button"
                onClick={() => {
                  setProgramFile(null);
                  if (setProgramMessage) setProgramMessage(null);
                  if (setProgramError) setProgramError(null);
                }}
                title="Hapus gambar"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#800000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

            <input
              id="modal-program-image-input"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onClick={(e) => { e.currentTarget.value = ''; }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setProgramFile(e.target.files[0]);
                  if (setProgramError) setProgramError(null);
                }
              }}
              style={{ display: 'none' }}
            />
          </div>

          {programMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {programMessage}
            </div>
          )}

          {programError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {programError}
            </div>
          )}

          {programResultUpload && (
            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Hasil Upload &amp; OCR Link Scan:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Status:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>Tersimpan di Cloudinary</span></div>
                {programResultUpload.totalSlides > 1 && (
                  <div>
                    <strong>Status Slide:</strong>{' '}
                    <span style={{ color: '#2563EB', fontWeight: 600 }}>
                      Slide ke-{programResultUpload.totalSlides} (Total: {programResultUpload.totalSlides} slide gambar)
                    </span>
                  </div>
                )}
                <div><strong>Hasil Scan OCR:</strong> <span style={{ color: programResultUpload.scannedLink ? '#2563EB' : '#64748B', fontWeight: 600 }}>{programResultUpload.scannedLink || 'Tidak terdeteksi'}</span></div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={programLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={programLoading || !programFile}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: programLoading || !programFile ? '#E2E8F0' : '#800000',
                color: programLoading || !programFile ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: programLoading || !programFile ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {programLoading ? 'Sedang Mengunggah & Memindai...' : 'Mulai Upload Gambar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## File: src/components/admin/UploadGuideModal.jsx
```javascript
import { useEffect } from 'react';

// Modal Panduan & Aturan Upload File / Kelola Data
export default function UploadGuideModal({ activeInfoModal, setActiveInfoModal }) {
  useEffect(() => {
    if (!activeInfoModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveInfoModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInfoModal, setActiveInfoModal]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onClick={() => setActiveInfoModal(null)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="fade-in" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Dialog */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: activeInfoModal === 'delete' ? '#FEF2F2' : '#EFF6FF',
                color: activeInfoModal === 'delete' ? '#DC2626' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}
            >
              i
            </div>
            <div>
              <h3 id="guide-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                Panduan &amp; Ketentuan
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                {activeInfoModal === 'program'
                  ? 'Tracking Program Bulanan (Flyer & OCR)'
                  : activeInfoModal === 'pairing'
                  ? 'Excel Data Tsel One Pairing'
                  : activeInfoModal === 'delete'
                  ? 'Kelola & Hapus Program Terdaftar'
                  : 'Excel Data ODP & Kapasitas Port'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveInfoModal(null)}
            aria-label="Tutup panduan upload"
            style={{
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
          {activeInfoModal === 'program' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Upload Program:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas yang diterima: <code>.jpg</code>, <code>.jpeg</code>, <code>.png</code>, atau <code>.webp</code> (maksimal 10MB).</li>
                  <li>Flyer promosi diunggah ke Cloudinary dan dipindai secara otomatis (*OCR*) untuk mendeteksi link detail promo (seperti <code>bit.ly/...</code> atau <code>s.id/...</code>).</li>
                  <li>Tentukan <b>Periode Bulan</b> dan <b>Nama Program</b> pada formulir.</li>
                  <li>Jika tautan detail tidak terdeteksi otomatis oleh OCR, gunakan input <b>Link Manual</b> opsional.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> mengunggah berkas non-gambar (seperti berkas <code>.pdf</code>, <code>.docx</code>, atau <code>.xlsx</code>).</li>
                  <li><b>Dilarang</b> mengunggah gambar yang terlalu buram atau beresolusi sangat rendah sehingga teks tidak dapat dibaca OCR.</li>
                  <li><b>Dilarang</b> mengosongkan nama program saat mengunggah flyer materi.</li>
                </ul>
              </div>
            </>
          ) : activeInfoModal === 'pairing' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Data Pairing:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> (maksimal 25MB).</li>
                  <li>Nama Sheet baku: <code>Unstacked_Pairing_Data</code> (atau sheet pertama berkas).</li>
                  <li>Baris Header tabel wajib memuat kolom utama: <code>bb_id</code>, <code>msisdn_parent</code>, <code>msisdn_child1</code>..<code>6</code>, <code>activation_date_*</code>, <code>city</code>, <code>sto</code>, dan <code>order_id</code>.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> menghapus atau merusak struktur nama kolom baku (<code>bb_id</code>, <code>msisdn_parent</code>, <code>order_id</code>).</li>
                  <li><b>Dilarang</b> menggabungkan sel (*merged cells*) pada area baris data pairing.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan *password protection*.</li>
                </ul>
              </div>
            </>
          ) : activeInfoModal === 'delete' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Ketentuan Penghapusan Program:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Pilih <b>Periode Bulan</b> untuk melihat daftar materi program yang tersimpan di sistem.</li>
                  <li>Pilih opsi: <b>Hapus Seluruh Program</b> pada periode tersebut, atau <b>Hapus 1 Program Spesifik</b>.</li>
                  <li>Sistem akan menampilkan pop-up konfirmasi sebelum proses penghapusan diproses.</li>
                </ul>
              </div>

              {/* Section 2: Warning */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Peringatan Penting:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Tindakan penghapusan bersifat <b>permanen</b> dan tidak dapat diurungkan (*irreversible*).</li>
                  <li>File gambar pada CDN Cloudinary dan data program pada database akan dihapus dari server.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Data ODP:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> (maksimal 25MB).</li>
                  <li>Baris Header tabel wajib memuat nama kolom baku: <code>Branch</code>, <code>Project</code>, <code>WOK</code>, <code>ODP</code>, <code>Avai</code>, <code>Used</code>, dan <code>Total</code>.</li>
                  <li>Nilai pada kolom <code>Avai</code>, <code>Used</code>, dan <code>Total</code> port wajib berupa bilangan bulat valid (≥ 0).</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> mengosongkan atau mengganti nama kolom <code>Branch</code>, <code>Project</code>, <code>WOK</code>, atau <code>ODP</code>.</li>
                  <li><b>Dilarang</b> mengisi nilai negatif atau karakter huruf pada kolom kapasitas port.</li>
                  <li><b>Dilarang</b> menggunakan *merged cells* (sel gabungan) pada area tabel data ODP.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan *password protection*.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
          <button
            type="button"
            onClick={() => setActiveInfoModal(null)}
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              border: 'none',
              background: '#800000',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(128, 0, 0, 0.2)'
            }}
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/Auth/LoginPage.jsx
```javascript
import { useRef, useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';
import TurnstileWidget, { TURNSTILE_SITE_KEY } from './TurnstileWidget';

export default function LoginPage({ onLoginSuccess, onBackToLanding }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);

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
        credentials: 'include', // server memasang cookie sesi HttpOnly
        body: JSON.stringify({ username, password, turnstileToken })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        if (onLoginSuccess) onLoginSuccess(data.user, data.expiresAt);
      } else {
        setError(data.message || 'Login gagal. Periksa kembali username dan password Anda.');
        turnstileRef.current?.reset(); // token captcha hanya berlaku sekali
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
      style={{
        display: 'flex',
        minHeight: '100dvh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: 'var(--font-body)',
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
              e.currentTarget.style.color = '#800000';
              e.currentTarget.style.borderColor = '#800000';
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
              fontFamily: 'var(--font-heading)'
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
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => { e.target.style.borderBottomColor = '#800000'; }}
                onBlur={(e) => { e.target.style.borderBottomColor = '#2B2B2B'; }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: TURNSTILE_SITE_KEY ? '28px' : '40px' }}>
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
                    fontFamily: 'var(--font-body)',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => { e.target.style.borderBottomColor = '#800000'; }}
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

            {/* Captcha Cloudflare Turnstile (lebar penuh, sejajar field di atasnya) */}
            {TURNSTILE_SITE_KEY && (
              <div style={{ marginBottom: '40px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#1F2937',
                    marginBottom: '8px'
                  }}
                >
                  Captcha
                </label>
                <TurnstileWidget
                  ref={turnstileRef}
                  action="login"
                  onToken={setTurnstileToken}
                  onError={() => setError('Captcha gagal dimuat. Periksa koneksi internet, lalu muat ulang halaman.')}
                />
              </div>
            )}

            {/* Interactive Login Button:
                - Width: 100% of container (542px)
                - Height: 54px
                - Unhovered: Background Putih, Border Merah, Teks Hitam
                - Hovered: Background Merah Solid (#800000), Border Merah, Teks Putih
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
                  fontFamily: 'var(--font-body)'
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
                border: '1.5px solid #800000',
                backgroundColor: isHovered ? '#800000' : '#FFFFFF',
                color: isHovered ? '#FFFFFF' : '#111827',
                fontSize: '15px',
                fontWeight: isHovered ? 600 : 500,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                fontFamily: 'var(--font-body)',
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
```

## File: src/components/Auth/TurnstileWidget.jsx
```javascript
import { useEffect, useImperativeHandle, useRef } from 'react';

// Site key publik (gtm-monitor-frontend/.env). Kosong = captcha tidak ditampilkan (backend juga tanpa secret key).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

// Script Turnstile dimuat sekali untuk seluruh aplikasi
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Script Turnstile gagal dimuat'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Widget Cloudflare Turnstile. onToken(token) saat lolos, onToken(null) saat kedaluwarsa/gagal.
// ref.reset() meminta token baru — wajib setelah percobaan login gagal karena token hanya berlaku sekali.
export default function TurnstileWidget({ action, onToken, onError, ref }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const callbacksRef = useRef({ onToken, onError });
  callbacksRef.current = { onToken, onError };

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.reset(widgetIdRef.current);
      callbacksRef.current.onToken(null);
    }
  }), []);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: 'light',
          size: 'flexible',
          language: 'id',
          callback: (token) => callbacksRef.current.onToken(token),
          'expired-callback': () => callbacksRef.current.onToken(null),
          'timeout-callback': () => callbacksRef.current.onToken(null),
          'error-callback': () => {
            callbacksRef.current.onToken(null);
            callbacksRef.current.onError?.();
          }
        });
      })
      .catch(() => callbacksRef.current.onError?.());

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [action]);

  // Tinggi widget Turnstile 65px: ruang dipesan agar form tidak bergeser saat widget muncul
  return <div ref={containerRef} className="cf-turnstile" style={{ width: '100%', minHeight: '65px' }} />;
}
```

## File: src/components/dashboard/BranchProjectsPieCard.jsx
```javascript
import { useState, useMemo, useEffect } from 'react';
import { BRANCH_COLORS } from '../../utils';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  // Clamp angle so it doesn't wrap around 360 awkwardly
  const safeEndAngle = endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
  const start = polarToCartesian(x, y, radius, safeEndAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = safeEndAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

export default function BranchProjectsPieCard({ ranking = [], branches = [], goBranch, isInView = true }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setIsAnimated(true), 60);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [isInView]);

  // Aggregate project count per branch & sort descending
  const branchData = useMemo(() => {
    const list = Array.isArray(ranking) && ranking.length > 0 ? ranking : branches;
    const mapped = list.map(b => {
      const count = b.projCount ?? (b.projects?.length || 0);
      const bUpper = b.name?.toString().trim().toUpperCase();
      const color = b.color || BRANCH_COLORS[bUpper] || '#64748B';

      return {
        name: b.name,
        count,
        color
      };
    }).sort((a, b) => b.count - a.count); // Largest share first

    return mapped;
  }, [ranking, branches]);

  const totalProjects = useMemo(() => {
    return branchData.reduce((acc, b) => acc + (b.count || 0), 0) || 1;
  }, [branchData]);


  // Compute angles for each pie slice
  const slices = useMemo(() => {
    let currentAngle = 0;
    return branchData.map((b) => {
      const share = b.count / totalProjects;
      const angle = share * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      const midAngle = (startAngle + endAngle) / 2;
      const rad = ((midAngle - 90) * Math.PI) / 180;
      const offsetX = Math.cos(rad) * 5;
      const offsetY = Math.sin(rad) * 5;

      return {
        ...b,
        startAngle,
        endAngle,
        midAngle,
        offsetX,
        offsetY,
        pct: Math.round(share * 1000) / 10,
        path: describeArc(100, 100, 80, startAngle, endAngle)
      };
    });
  }, [branchData, totalProjects]);

  return (
    <div
      className="saas-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '22px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '320px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── HEADER KARTU ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569', letterSpacing: '-0.1px' }}>
          Sebaran Volume Proyek per Branch
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#475569'
          }}
        >
          {slices.length} Branch
        </span>
      </div>

      {/* ─── KONTEN: PIE CHART SVG (KIRI) + LEGEND PER BRANCH (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Pie Chart (~50% diperbesar dari 170px ke 255px) */}
        <div style={{ position: 'relative', width: '255px', height: '255px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="255"
            height="255"
            viewBox="0 0 200 200"
            style={{
              overflow: 'visible',
              transform: isAnimated ? 'scale(1) rotate(0deg)' : 'scale(0.85) rotate(-15deg)',
              opacity: isAnimated ? 1 : 0,
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease'
            }}
          >
            {slices.map((slice, idx) => {
              const isHovered = hoveredIndex === idx;

              return (
                <path
                  key={slice.name}
                  d={slice.path}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  style={{
                    cursor: 'pointer',
                    transform: isHovered ? `translate(${slice.offsetX}px, ${slice.offsetY}px) scale(1.03)` : 'translate(0px, 0px) scale(1)',
                    transformOrigin: '100px 100px',
                    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.18s ease',
                    filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.22))' : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => {
                    if (goBranch) goBranch(slice.name);
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend Sisi Kanan (Ranking Volume Proyek) */}
        <div style={{ flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={slice.name}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  if (goBranch) goBranch(slice.name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                title={`Klik untuk melihat detail branch ${slice.name}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isHovered ? 600 : 500,
                      color: isHovered ? '#0F172A' : '#334155',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {slice.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count} <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>proj</span>
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '38px',
                      textAlign: 'right'
                    }}
                  >
                    {slice.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/BranchRankingCard.jsx
```javascript
import { useState, useCallback, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── SUB-COMPONENT: WOK SUB-ROW WITH IN-VIEW ANIMATION ───
function WokRowItem({ w, index, isMounted, isInView, goBranch, branchName }) {
  const isDecimal = Number(w.occRate) % 1 !== 0;
  const countOcc = useCountUp(w.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: 650, delay: index * 20 });
  const countProj = useCountUp(w.projCount, { enabled: isInView, duration: 600, delay: index * 20 });
  const countAct = useCountUp(w.actPct, { enabled: isInView, duration: 650, delay: index * 20 });

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (goBranch) goBranch(branchName);
      }}
      className="ranking-row-animated"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(85px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
        alignItems: 'center',
        gap: '12px',
        padding: '9px 16px',
        background: '#F8FAFC',
        borderBottom: '1px solid #F1F5F9',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        animationDelay: `${Math.min(index * 25, 200)}ms`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontWeight: 500, 
        fontSize: '12.5px', 
        color: '#334155', 
        minWidth: 0, 
        overflow: 'hidden',
        paddingLeft: '16px'
      }}>
        <span style={{ color: '#94A3B8' }}>└</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {w.name}
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
        <div 
          className="progress-bar-fill"
          style={{ 
            height: '100%', 
            width: isMounted && isInView ? `${Math.min(w.occRate, 100)}%` : '0%', 
            background: '#475569', 
            borderRadius: '999px'
          }} 
        />
      </div>

      {/* Occupancy % */}
      <div style={{ 
        fontSize: '12.5px', 
        fontWeight: 600, 
        color: '#334155', 
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {countOcc}%
      </div>

      {/* Gap WoW Badge */}
      <div style={{ textAlign: 'center' }}>
        <span className={w.delta > 0 ? 'gap-badge-pos' : w.delta < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
          {w.delta > 0 ? `+${w.delta}%` : `${w.delta}%`}
        </span>
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#64748B', 
        fontWeight: 500, 
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {countProj} proyek
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#64748B', 
        fontWeight: 500, 
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {countAct}%
      </div>

      <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
        →
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: BRANCH MAIN ROW WITH IN-VIEW ANIMATION ───
function BranchRowItem({ b, index, isMounted, isInView, isExpanded, hasWoks, onToggle, goBranch }) {
  const isDecimal = Number(b.occRate) % 1 !== 0;
  const countOcc = useCountUp(b.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: 750, delay: Math.min(index * 30, 250) });
  const countProj = useCountUp(b.projCount, { enabled: isInView, duration: 650, delay: Math.min(index * 30, 250) });
  const countAct = useCountUp(b.actPct, { enabled: isInView, duration: 750, delay: Math.min(index * 30, 250) });

  return (
    <div style={{ borderBottom: '1px solid #F1F5F9' }}>
      {/* Main Branch Row */}
      <div
        onClick={(e) => {
          if (hasWoks) onToggle(b.name, e);
          else if (goBranch) goBranch(b.name);
        }}
        className="ranking-row-animated"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(85px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: isExpanded ? '#F8FAFC' : '#FFFFFF',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
          animationDelay: `${Math.min(index * 35, 300)}ms`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = '#FFFFFF';
        }}
      >
        {/* Branch Name with Expansion Caret */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontWeight: 500, 
          fontSize: '13.5px', 
          color: '#0F172A',
          minWidth: 0, 
          overflow: 'hidden' 
        }}>
          {hasWoks && (
            <span style={{ 
              fontSize: '10px', 
              color: '#64748B', 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'inline-block',
              width: '12px'
            }}>
              ▶
            </span>
          )}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.name}
          </span>
        </div>

        {/* Mini Progress Bar */}
        <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
          <div 
            className="progress-bar-fill"
            style={{ 
              height: '100%', 
              width: isMounted && isInView ? `${Math.min(b.occRate, 100)}%` : '0%', 
              background: '#0F172A', 
              borderRadius: '999px'
            }} 
          />
        </div>

        {/* Occupancy % */}
        <div style={{ 
          fontSize: '13px', 
          fontWeight: 500, 
          color: '#0F172A', 
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countOcc}%
        </div>

        {/* Gap WoW Badge */}
        <div style={{ textAlign: 'center' }}>
          <span className={b.delta > 0 ? 'gap-badge-pos' : b.delta < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
            {b.delta > 0 ? `+${b.delta}%` : `${b.delta}%`}
          </span>
        </div>

        {/* Project Count */}
        <div style={{ 
          fontSize: '12.5px', 
          color: '#64748B', 
          fontWeight: 500, 
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countProj} proyek
        </div>

        {/* GTM Done % */}
        <div style={{ 
          fontSize: '12.5px', 
          color: '#64748B', 
          fontWeight: 500, 
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countAct}%
        </div>

        {/* Action Button Link */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (goBranch) goBranch(b.name);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F172A',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 6px',
              fontFamily: 'inherit',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#800000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#0F172A';
            }}
          >
            Detail →
          </button>
        </div>
      </div>

      {/* Sub-Rows for WOKs */}
      {isExpanded && hasWoks && (
        <div style={{ 
          background: '#F8FAFC',
          borderTop: '1px solid #F1F5F9'
        }}>
          {b.woks.map((w, wIdx) => (
            <WokRowItem
              key={w.name}
              w={w}
              index={wIdx}
              isMounted={isMounted}
              isInView={isInView}
              goBranch={goBranch}
              branchName={b.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECTION 2: RANKING BRANCH BERDASARKAN OCCUPANCY (ROUNDED CONTAINER) ───
export default function BranchRankingCard({ safeRanking, goBranch, isInView = true }) {
  const [expandedBranches, setExpandedBranches] = useState({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const toggleBranchExpand = useCallback((branchName, e) => {
    if (e) e.stopPropagation();
    setExpandedBranches(prev => ({ ...prev, [branchName]: !prev[branchName] }));
  }, []);

  return (
    <div className="ranking-card-container">
      {/* Header Container: px-6 py-4 border-b border-slate-100 flex items-center justify-between */}
      <div className="ranking-card-header">
        <h2 style={{ 
          fontSize: '15px', 
          fontWeight: 600, 
          color: '#475569', 
          margin: 0,
          letterSpacing: '-0.1px'
        }}>
          Ranking Branch Berdasarkan Occupancy
        </h2>
      </div>

      <div className="table-responsive-wrapper custom-table-scrollbar" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '820px' }}>
          {/* Table Column Headers: Dark Navy background (bg-slate-900) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(85px, 0.6fr) minmax(85px, 0.7fr) minmax(95px, 0.8fr) minmax(65px, 0.5fr)',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            <div>Branch / WOK</div>
            <div>Occupancy</div>
            <div style={{ textAlign: 'right' }}>Persentase</div>
            <div style={{ textAlign: 'center' }}>Gap WoW</div>
            <div style={{ textAlign: 'right' }}>Proyek</div>
            <div style={{ textAlign: 'right' }}>GTM Selesai</div>
            <div style={{ textAlign: 'center' }}>Aksi</div>
          </div>

          {/* Empty state when ranking is empty */}
          {safeRanking.length === 0 && (
            <div style={{ 
              padding: '36px 16px', 
              textAlign: 'center', 
              color: '#94A3B8', 
              fontSize: '13px',
              background: '#FAFAFC'
            }}>
              Belum ada data branch untuk filter yang dipilih.
            </div>
          )}

          {/* Branch Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {safeRanking.map((b, bIdx) => (
              <BranchRowItem
                key={b.name}
                b={b}
                index={bIdx}
                isMounted={isMounted}
                isInView={isInView}
                isExpanded={!!expandedBranches[b.name]}
                hasWoks={b.woks && b.woks.length > 0}
                onToggle={toggleBranchExpand}
                goBranch={goBranch}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/DashboardHeader.jsx
```javascript
export default function DashboardHeader({
  lastUpdateFormatted,
  typeDesignFilter = 'ALL',
  setTypeDesignFilter
}) {
  const options = [
    { id: 'ALL', label: 'Semua Tipe' },
    { id: 'Greenfield', label: 'Greenfield' },
    { id: 'Brownfield', label: 'Brownfield' }
  ];

  return (
    <div
      className="page-title-header dashboard-page-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '28px',
            fontWeight: 600,
            color: '#0F172A',
            margin: 0,
            letterSpacing: '-0.5px',
            lineHeight: 1.2
          }}
        >
          Dashboard
        </h1>
        {lastUpdateFormatted && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748B',
              marginTop: '6px'
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Pembaruan: {lastUpdateFormatted}</span>
          </div>
        )}
      </div>

      {setTypeDesignFilter && (
        <div
          role="radiogroup"
          aria-label="Filter Tipe Proyek"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
          }}
        >
          {options.map((f) => {
            const isActive = typeDesignFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setTypeDesignFilter(f.id)}
                style={{
                  minHeight: '38px',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#475569',
                  boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#0F172A';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

## File: src/components/dashboard/ExecutiveSummaryCard.jsx
```javascript
import { ACT_TYPES_ORDER } from '../../constants/dashboard';
import { useExecutiveSummary } from '../../hooks/useExecutiveSummary';
import { useExecutiveSummaryExport } from '../../hooks/useExecutiveSummaryExport';
import { useCountUp } from '../../hooks/useCountUp';

function AnimatedCounterText({ value, decimals = 0, duration = 800, enabled = true }) {
  const animated = useCountUp(value, { enabled, decimals, duration });
  return <>{animated}</>;
}

// ─── SECTION 3: EXECUTIVE SUMMARY (MATRIKS WOK & AKTIVITAS DENGAN ROWSPAN) ───
export default function ExecutiveSummaryCard({ branches, isInView = true }) {
  const executiveSummary = useExecutiveSummary(branches);
  const { isExportingPng, handleDownloadPNG } = useExecutiveSummaryExport();

  return (
    <div className="executive-summary-container">
      {/* Header Toolbar: Judul di kiri, tombol Ekspor PNG di kanan */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '20px', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}
      >
        <div>
          <h2 style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: '#475569', 
            margin: 0,
            letterSpacing: '-0.1px'
          }}>
            Executive Summary
          </h2>
        </div>

        {/* Tombol Ekspor PNG (Outline rapi dengan ikon unduh) */}
        <button
          type="button"
          onClick={handleDownloadPNG}
          disabled={isExportingPng}
          style={{
            cursor: isExportingPng ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontWeight: 600,
            fontSize: '12px',
            padding: '7px 14px',
            borderRadius: '8px',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
            opacity: isExportingPng ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
          }}
          onMouseEnter={(e) => {
            if (!isExportingPng) {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
              e.currentTarget.style.color = '#0F172A';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExportingPng) {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = '#334155';
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{isExportingPng ? 'Mengekspor...' : 'Ekspor PNG'}</span>
        </button>
      </div>

      {/* Corporate Multi-Tier Data Table Container */}
      <div 
        id="executive-summary-wrapper" 
        className="table-responsive-wrapper custom-table-scrollbar" 
        style={{ 
          overflowX: 'auto', 
          borderRadius: '8px', 
          border: '1px solid #E2E8F0', 
          position: 'relative', 
          background: '#FFFFFF' 
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center', minWidth: '1100px' }}>
          <thead>
            {/* Primary Header Row */}
            <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 500 }}>
              <th style={{ 
                padding: '12px 10px', 
                width: '130px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B',
                textAlign: 'left'
              }} rowSpan={2}>
                Branch
              </th>
              <th style={{ 
                padding: '12px 10px', 
                width: '160px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B',
                textAlign: 'left'
              }} rowSpan={2}>
                WOK
              </th>
              <th style={{ 
                padding: '12px 8px', 
                width: '85px', 
                verticalAlign: 'middle', 
                borderRight: '1px solid #1E293B',
                textAlign: 'right'
              }} rowSpan={2}>
                Jumlah LOP
              </th>

              {/* Group Header: DONE ACTIVITY (TERVERIFIKASI) */}
              <th style={{ 
                background: '#1E293B', 
                color: '#FFFFFF', 
                padding: '10px 10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                fontSize: '11px',
                borderRight: '1px solid #334155',
                borderBottom: '1px solid #334155' 
              }} colSpan={5}>
                Done Activity (Terverifikasi)
              </th>

              {/* Group Header: NOT YET ACTIVITY (BELUM) */}
              <th style={{ 
                background: '#334155', 
                color: '#FFFFFF', 
                padding: '10px 10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                fontSize: '11px',
                borderRight: '1px solid #1E293B',
                borderBottom: '1px solid #1E293B' 
              }} colSpan={5}>
                Not Yet Activity (Belum)
              </th>

              <th style={{ 
                padding: '12px 10px', 
                width: '95px', 
                verticalAlign: 'middle',
                textAlign: 'right' 
              }} rowSpan={2}>
                Progress
              </th>
            </tr>

            {/* Subheader Column Names */}
            <tr style={{ background: '#0F172A', color: '#CBD5E1', fontSize: '11px', fontWeight: 600 }}>
              {/* Subheaders Done Activity */}
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Tsel Menyapa</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Branding Outlet</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>BUMDES</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Rekrut SF</th>
              <th style={{ background: '#1E293B', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #334155' }}>Open Table</th>

              {/* Subheaders Not Yet Activity */}
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Tsel Menyapa</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Branding Outlet</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>BUMDES</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Rekrut SF</th>
              <th style={{ background: '#334155', color: '#E2E8F0', padding: '7px 4px', borderRight: '1px solid #475569' }}>Open Table</th>
            </tr>
          </thead>

          <tbody>
            {executiveSummary.rows.map((row, rIdx) => (
              <tr 
                key={`${row.branch}-${row.wok}`} 
                style={{ 
                  background: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                }}
              >
                {/* Grouped Branch Column with Strong Rowspan Separator */}
                {row.isFirstInBranch && (
                  <td 
                    rowSpan={row.branchRowSpan} 
                    style={{ 
                      padding: '10px 12px', 
                      fontWeight: 500, 
                      fontSize: '12.5px',
                      color: '#0F172A', 
                      borderRight: '1px solid #E2E8F0', 
                      borderBottom: '2px solid #CBD5E1',
                      background: '#FFFFFF',
                      verticalAlign: 'middle',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                      {row.branch}
                    </span>
                  </td>
                )}

                {/* WOK Name (Rata Kiri) */}
                <td style={{ 
                  padding: '9px 12px', 
                  fontWeight: 500, 
                  color: '#334155', 
                  textAlign: 'left', 
                  borderRight: '1px solid #E2E8F0', 
                  borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9' 
                }}>
                  {row.wok}
                </td>

                {/* LOP Count (Rata Kanan) */}
                <td style={{ 
                  padding: '9px 8px', 
                  fontWeight: 500, 
                  color: '#0F172A', 
                  textAlign: 'right',
                  borderRight: '1px solid #E2E8F0', 
                  borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                  fontVariantNumeric: 'tabular-nums' 
                }}>
                  {row.lopCount}
                </td>

                {/* 5 Done Values (Rata Kanan/Tengah) */}
                {ACT_TYPES_ORDER.map(item => {
                  const val = row.done[item.key];
                  return (
                    <td 
                      key={`done-${item.key}`} 
                      style={{ 
                        padding: '9px 6px', 
                        fontWeight: val > 0 ? 600 : 400, 
                        color: val > 0 ? '#0F172A' : '#94A3B8', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'center'
                      }}
                    >
                      {val > 0 ? val : '-'}
                    </td>
                  );
                })}

                {/* 5 Not Yet Values (Rata Kanan/Tengah) */}
                {ACT_TYPES_ORDER.map(item => {
                  const val = row.notYet[item.key];
                  return (
                    <td 
                      key={`notyet-${item.key}`} 
                      style={{ 
                        padding: '9px 6px', 
                        fontWeight: val > 0 ? 600 : 400, 
                        color: val > 0 ? '#475569' : '#94A3B8', 
                        borderRight: '1px solid #E2E8F0', 
                        borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'center'
                      }}
                    >
                      {val > 0 ? val : '-'}
                    </td>
                  );
                })}

                {/* Progress % (Rata Kanan) */}
                <td style={{ 
                  padding: '9px 10px', 
                  fontWeight: 500,
                  color: '#0F172A', 
                  textAlign: 'right',
                  borderBottom: row.isLastInBranch ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {row.progressPct}%
                </td>
              </tr>
            ))}
          </tbody>

          {/* Table Footer: Grand Totals Regional Jateng DIY */}
          <tfoot>
            <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 500, borderTop: '2px solid #0F172A' }}>
              <td colSpan={2} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11.5px', letterSpacing: '0.05em' }}>
                TOTAL REGIONAL JATENG DIY
              </td>
              <td style={{ padding: '12px 8px', fontSize: '12.5px', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                <AnimatedCounterText value={executiveSummary.grandTotalLop} duration={800} enabled={isInView} />
              </td>

              {/* Grand Total Done */}
              {ACT_TYPES_ORDER.map(item => (
                <td 
                  key={`gt-done-${item.key}`} 
                  style={{ 
                    padding: '12px 6px', 
                    color: '#FFFFFF', 
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center'
                  }}
                >
                  <AnimatedCounterText value={executiveSummary.grandTotalDone[item.key]} duration={800} enabled={isInView} />
                </td>
              ))}

              {/* Grand Total Not Yet */}
              {ACT_TYPES_ORDER.map(item => (
                <td 
                  key={`gt-notyet-${item.key}`} 
                  style={{ 
                    padding: '12px 6px', 
                    color: '#FFFFFF', 
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center'
                  }}
                >
                  <AnimatedCounterText value={executiveSummary.grandTotalNotYet[item.key]} duration={800} enabled={isInView} />
                </td>
              ))}

              {/* Grand Total Progress */}
              <td style={{ 
                padding: '12px 10px', 
                fontSize: '12.5px', 
                color: '#FFFFFF', 
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right' 
              }}>
                <AnimatedCounterText 
                  value={executiveSummary.grandProgressPct} 
                  decimals={executiveSummary.grandProgressPct % 1 !== 0 ? 1 : 0} 
                  duration={850} 
                  enabled={isInView} 
                />%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/ExecutiveSummarySection.jsx
```javascript
import { useMemo } from 'react';
import { ACT_TYPES_ORDER } from '../../constants/dashboard';
import { useExecutiveSummary } from '../../hooks/useExecutiveSummary';
import { useExecutiveSummaryExport } from '../../hooks/useExecutiveSummaryExport';
import { useCountUp } from '../../hooks/useCountUp';

function AnimatedNumber({ value, enabled = true, duration = 650 }) {
  const count = useCountUp(value, { enabled, duration });
  return <>{count}</>;
}

// ─── KOLOM KIRI: MATRIKS EXECUTIVE SUMMARY PER BRANCH & WOK ───
export default function ExecutiveSummarySection({
  branches,
  searchQuery = '',
  scopeFilter = 'ALL',
  onScopeChange,
  branchList = [],
  isInView = true
}) {
  const executiveSummary = useExecutiveSummary(branches);
  const { isExportingPng, handleDownloadPNG } = useExecutiveSummaryExport();

  // Filter rows based on search query & scope
  const filteredRows = useMemo(() => {
    if (!executiveSummary?.rows) return [];
    let list = executiveSummary.rows;

    if (scopeFilter !== 'ALL') {
      list = list.filter(r => (r.branch || '').toUpperCase() === scopeFilter.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.branch || '').toLowerCase().includes(q) ||
        (r.wok || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [executiveSummary?.rows, scopeFilter, searchQuery]);

  // Recalculate rowspans for filtered results to prevent broken tables
  const rowsWithComputedRowSpan = useMemo(() => {
    const branchCounts = {};
    filteredRows.forEach(r => {
      branchCounts[r.branch] = (branchCounts[r.branch] || 0) + 1;
    });

    const seenBranches = {};
    return filteredRows.map(r => {
      const isFirst = !seenBranches[r.branch];
      seenBranches[r.branch] = true;
      return {
        ...r,
        computedIsFirst: isFirst,
        computedRowSpan: branchCounts[r.branch] || 1
      };
    });
  }, [filteredRows]);

  return (
    <div
      className="saas-card executive-summary-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '20px 22px',
        overflow: 'hidden'
      }}
    >
      {/* ─── Header Card Toolbar (Clean Executive Hierarchy) ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#475569',
                margin: 0,
                letterSpacing: '-0.1px'
              }}
            >
              Executive Summary
            </h2>
          </div>
        </div>

        {/* Actions Toolbar (Scope Dropdown & Ekspor PNG) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onScopeChange && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={scopeFilter}
                onChange={(e) => onScopeChange(e.target.value)}
                aria-label="Pilih cakupan branch"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '6px 28px 6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <option value="ALL">Semua Cakupan</option>
                {branchList.map((b) => (
                  <option key={b.name || b} value={b.name || b}>
                    Branch {b.name || b}
                  </option>
                ))}
              </select>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '9px',
                  pointerEvents: 'none'
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}
          {/* Clean Outline Ekspor PNG Button with Download Icon */}
        <button
          id="btn-export-png"
          type="button"
          onClick={handleDownloadPNG}
          disabled={isExportingPng}
          style={{
            cursor: isExportingPng ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontWeight: 600,
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '8px',
            transition: 'all 0.15s ease',
            opacity: isExportingPng ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
          }}
          onMouseEnter={(e) => {
            if (!isExportingPng) {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
              e.currentTarget.style.color = '#0F172A';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExportingPng) {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = '#334155';
            }
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{isExportingPng ? 'Mengekspor...' : 'Ekspor PNG'}</span>
        </button>
        </div>
      </div>

      {/* ─── Body Data: Multi-Tier Table Container ─── */}
      <div
        id="executive-summary-wrapper"
        className="table-responsive-wrapper custom-table-scrollbar"
        style={{
          overflowX: 'auto',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          position: 'relative',
          background: '#FFFFFF'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'center', minWidth: '1120px' }}>
          <thead>
            {/* Row 1 Header (Telkomsel Red Branding) */}
            <tr style={{ background: '#800000', color: '#FFFFFF', fontWeight: 500 }}>
              <th
                rowSpan={2}
                style={{
                  padding: '11px 10px',
                  width: '120px',
                  verticalAlign: 'middle',
                  borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'left',
                  background: '#800000'
                }}
              >
                Branch
              </th>
              <th
                rowSpan={2}
                style={{
                  padding: '11px 10px',
                  width: '160px',
                  verticalAlign: 'middle',
                  borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'left',
                  background: '#800000'
                }}
              >
                WOK
              </th>
              <th
                rowSpan={2}
                style={{
                  padding: '11px 8px',
                  width: '75px',
                  verticalAlign: 'middle',
                  borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'right',
                  background: '#800000'
                }}
              >
                LOP
              </th>

              {/* Group Done Activity */}
              <th
                colSpan={5}
                style={{
                  background: '#800000',
                  color: '#FFFFFF',
                  padding: '9px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  borderRight: '1px solid rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  letterSpacing: '0.02em'
                }}
              >
                Done Activity (Terverifikasi)
              </th>

              {/* Group Not Yet Activity */}
              <th
                colSpan={5}
                style={{
                  background: '#800000',
                  color: '#FFFFFF',
                  padding: '9px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  borderRight: '1px solid rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  letterSpacing: '0.02em'
                }}
              >
                Not Yet Activity (Belum)
              </th>

              {/* Progress Kolom */}
              <th
                rowSpan={2}
                style={{
                  padding: '11px 10px',
                  width: '95px',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  background: '#800000',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                Progress
              </th>
            </tr>

            {/* Row 2 Header Sub-Columns (5 Kegiatan Prioritas) */}
            <tr style={{ background: '#800000', color: '#FFFFFF', fontSize: '10px', fontWeight: 500 }}>
              {ACT_TYPES_ORDER.map((item) => (
                <th
                  key={`done-${item.key}`}
                  style={{
                    padding: '8px 4px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    minWidth: '68px',
                    background: '#800000',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '1.25',
                    whiteSpace: 'normal'
                  }}
                >
                  {item.shortLabel || item.label}
                </th>
              ))}
              {ACT_TYPES_ORDER.map((item, idx) => (
                <th
                  key={`notyet-${item.key}`}
                  style={{
                    padding: '8px 4px',
                    borderRight: idx === ACT_TYPES_ORDER.length - 1 ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    minWidth: '68px',
                    background: '#800000',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '1.25',
                    whiteSpace: 'normal'
                  }}
                >
                  {item.shortLabel || item.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rowsWithComputedRowSpan.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ padding: '24px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC' }}>
                  Tidak ada data yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              rowsWithComputedRowSpan.map((r, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={`${r.branch}-${r.wok}-${idx}`}
                    style={{
                      background: isEven ? '#FFFFFF' : '#F8FAFC',
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isEven ? '#FFFFFF' : '#F8FAFC';
                    }}
                  >
                    {/* Branch Rowspan */}
                    {r.computedIsFirst && (
                      <td
                        rowSpan={r.computedRowSpan}
                        style={{
                          padding: '10px 10px',
                          textAlign: 'left',
                          fontWeight: 500,
                          color: '#0F172A',
                          verticalAlign: 'top',
                          borderRight: '1px solid #E2E8F0',
                          borderBottom: '1px solid #CBD5E1',
                          background: '#FFFFFF'
                        }}
                      >
                        {r.branch}
                      </td>
                    )}

                    {/* WOK Name */}
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#334155',
                        borderRight: '1px solid #F1F5F9'
                      }}
                    >
                      {r.wok}
                    </td>

                    {/* Jumlah LOP */}
                    <td
                      style={{
                        padding: '8px 8px',
                        textAlign: 'right',
                        fontWeight: 500,
                        color: '#0F172A',
                        borderRight: '1px solid #F1F5F9',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      <AnimatedNumber value={r.lopCount} enabled={isInView} />
                    </td>

                    {/* 5 Kolom DONE */}
                    {ACT_TYPES_ORDER.map((item) => {
                      const val = r.done[item.key] || 0;
                      return (
                        <td
                          key={`row-done-${item.key}`}
                          style={{
                            padding: '8px 4px',
                            fontWeight: 500,
                            color: '#334155',
                            borderRight: '1px solid #F1F5F9',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          <AnimatedNumber value={val} enabled={isInView} />
                        </td>
                      );
                    })}

                    {/* 5 Kolom NOT YET */}
                    {ACT_TYPES_ORDER.map((item, iIdx) => {
                      const val = r.notYet[item.key] || 0;
                      return (
                        <td
                          key={`row-notyet-${item.key}`}
                          style={{
                            padding: '8px 4px',
                            fontWeight: 500,
                            color: '#334155',
                            borderRight: iIdx === ACT_TYPES_ORDER.length - 1 ? '1px solid #E2E8F0' : '1px solid #F1F5F9',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          <AnimatedNumber value={val} enabled={isInView} />
                        </td>
                      );
                    })}

                    {/* Progress Bar Badge Persentase */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '5px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(r.progressPct, 100)}%`,
                              background: r.progressPct > 50 ? '#059669' : '#800000',
                              borderRadius: '999px',
                              transition: 'width 0.8s ease'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#334155', minWidth: '32px', textAlign: 'right' }}>
                          {r.progressPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer: Grand Totals Regional Jateng DIY */}
          {((executiveSummary?.grandTotals) || (executiveSummary?.grandTotalLop !== undefined)) && (
            <tfoot>
              <tr style={{ background: '#800000', color: '#FFFFFF', fontWeight: 600, borderTop: '2px solid #550000' }}>
                <td colSpan={2} style={{ padding: '11px 12px', textAlign: 'left', borderRight: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '11.5px', letterSpacing: '0.03em' }}>
                  GRAND TOTAL
                </td>
                <td style={{ padding: '11px 8px', textAlign: 'right', borderRight: '1px solid rgba(255, 255, 255, 0.2)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  <AnimatedNumber value={executiveSummary.grandTotals?.lop ?? executiveSummary.grandTotalLop} enabled={isInView} />
                </td>
                {ACT_TYPES_ORDER.map((item) => (
                  <td key={`grand-done-${item.key}`} style={{ padding: '11px 4px', borderRight: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
                    <AnimatedNumber value={(executiveSummary.grandTotals?.done?.[item.key]) ?? executiveSummary.grandTotalDone?.[item.key] ?? 0} enabled={isInView} />
                  </td>
                ))}
                {ACT_TYPES_ORDER.map((item, idx) => (
                  <td
                    key={`grand-notyet-${item.key}`}
                    style={{
                      padding: '11px 4px',
                      borderRight: idx === ACT_TYPES_ORDER.length - 1 ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'center'
                    }}
                  >
                    <AnimatedNumber value={(executiveSummary.grandTotals?.notYet?.[item.key]) ?? executiveSummary.grandTotalNotYet?.[item.key] ?? 0} enabled={isInView} />
                  </td>
                ))}
                <td style={{ padding: '11px 8px', textAlign: 'center', color: '#FFFFFF', fontWeight: 600 }}>
                  {(executiveSummary.grandTotals?.progressPct) ?? executiveSummary.grandProgressPct ?? 0}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/GtmExecutionInsightCard.jsx
```javascript
import { memo, useMemo } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── 5 PILAR AKTIVITAS GTM CARD (SEJAJAR VERTIKAL DENGAN EXECUTIVE SUMMARY) ───
const GtmExecutionInsightCard = memo(function GtmExecutionInsightCard({
  branches = [],
  isInView = true
}) {
  // Hitung progres real 5 pilar aktivitas GTM
  const pillarStats = useMemo(() => {
    const counts = {
      tsel_menyapa: { verified: 0, pending: 0, belum: 0, total: 0 },
      branding_outlet: { verified: 0, pending: 0, belum: 0, total: 0 },
      bumdes: { verified: 0, pending: 0, belum: 0, total: 0 },
      rekrutmen_sf: { verified: 0, pending: 0, belum: 0, total: 0 },
      open_table: { verified: 0, pending: 0, belum: 0, total: 0 }
    };

    (branches || []).forEach((b) => {
      (b.projects || []).forEach((p) => {
        const acts = p.activities || [];
        const keys = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];
        keys.forEach((key) => {
          counts[key].total++;
          const act = acts.find((a) => a.type === key);
          if (act?.status === 'verified') {
            counts[key].verified++;
          } else if (act?.status === 'upload' || act?.status === 'menunggu_verifikasi') {
            counts[key].pending++;
          } else {
            counts[key].belum++;
          }
        });
      });
    });

    return [
      { key: 'tsel_menyapa', label: 'Telkomsel Menyapa', desc: 'Edukasi & penetrasi warga cluster', ...counts.tsel_menyapa },
      { key: 'branding_outlet', label: 'Branding Outlet', desc: 'Visibilitas & promosi outlet mitra', ...counts.branding_outlet },
      { key: 'bumdes', label: 'Kerjasama BUMDes', desc: 'Kemitraan badan usaha desa', ...counts.bumdes },
      { key: 'rekrutmen_sf', label: 'Rekrutmen Sales Force', desc: 'Akuisisi armada sales lapangan', ...counts.rekrutmen_sf },
      { key: 'open_table', label: 'Open Table', desc: 'Penjualan langsung on-the-spot', ...counts.open_table }
    ];
  }, [branches]);

  const totalSlots = pillarStats.reduce((acc, p) => acc + p.total, 0);
  const animTotalSlots = useCountUp(totalSlots, { enabled: isInView, duration: 800 });

  return (
    <div
      className="saas-card gtm-insight-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        padding: '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      {/* Header 5 Pilar Aktivitas GTM */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '8px' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
          5 Pilar Aktivitas GTM
        </span>
        <span
          style={{
            fontSize: '12px',
            color: '#64748B',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          Total {animTotalSlots} Slot
        </span>
      </div>

      {/* 5 Pilar List terdistribusi rapi secara vertikal */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around', gap: '14px', padding: '6px 0' }}>
        {pillarStats.map((pillar) => {
          const pct = pillar.total > 0 ? Math.round((pillar.verified / pillar.total) * 100) : 0;
          return (
            <div key={pillar.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  {pillar.label}
                </span>
                <span style={{ color: '#0F172A', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  <span>
                    {pillar.verified}
                  </span>
                  /{pillar.total}{' '}
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
                    ({pct}%)
                  </span>
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '7px',
                  borderRadius: '9999px',
                  backgroundColor: '#F1F5F9',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: '100%',
                    backgroundColor: pct >= 80 ? '#16A34A' : pct > 0 ? '#F59E0B' : '#CBD5E1',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GtmExecutionInsightCard;
```

## File: src/components/dashboard/HeroOccupancyCard.jsx
```javascript
import { useCountUp } from '../../hooks/useCountUp';

// ─── HERO CARD (TELKOMSEL MAROON - CLEAN ARCHITECTURE) ───
export default function HeroOccupancyCard({ safeKpi, onReviewBranch, isAdmin, isInView = true }) {
  const isOccDecimal = Number(safeKpi.occRate) % 1 !== 0;
  const countOccRate = useCountUp(safeKpi.occRate, { enabled: isInView, decimals: isOccDecimal ? 1 : 0, duration: 800 });
  const countTotalUsed = useCountUp(safeKpi.totalUsed, { enabled: isInView, duration: 750 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 750 });

  return (
    <div
      className="hero-red-card saas-card"
      style={{
        width: '100%',
        maxWidth: '360px',
        backgroundColor: '#800000',
        backgroundImage: 'linear-gradient(160deg, #990000 0%, #660000 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: 'none',
        boxSizing: 'border-box',
        minHeight: '190px'
      }}
    >
      {/* Baris 1: Header (Judul & WoW Badge) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', height: '24px' }}>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#FFFFFF',
            letterSpacing: '-0.1px',
            whiteSpace: 'nowrap'
          }}
        >
          Okupansi Regional Jateng & DIY
        </span>

        {safeKpi.gapWoW != null && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {safeKpi.gapWoW > 0 ? `+${safeKpi.gapWoW}%` : `${safeKpi.gapWoW}%`} WoW
          </span>
        )}
      </div>

      {/* Baris 2: Primary Giant Metric (Sejajar sempurna dengan 3 metrik kanan) */}
      <div
        style={{
          fontSize: '48px',
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '-1.5px',
          margin: '18px 0 16px 0',
          fontVariantNumeric: 'tabular-nums',
          color: '#FFFFFF'
        }}
      >
        {countOccRate}%
      </div>

      {/* Baris 3: Metadata Ringkas + Tombol Aksi Kompak */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          height: '24px'
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{countTotalUsed}</span> dari{' '}
          <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{countTotalPort}</span> port
        </div>

        {isAdmin && onReviewBranch && (
          <button
            type="button"
            onClick={onReviewBranch}
            className="hero-review-btn"
            title="Review Branch Prioritas (Purwokerto)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FFFFFF',
              color: '#800000',
              fontWeight: 600,
              fontSize: '11.5px',
              padding: '3px 9px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFF5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <span>Review Prioritas</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/KpiCards.jsx
```javascript
import { useState, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── SECTION 1: 4 KPI CARDS (RESPONSIVE 1-ROW GRID, COMPACT & PURPOSEFUL) ───
export default function KpiCards({ safeKpi, safeStatusChips, isInView = true }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const mountTimer = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(mountTimer);
  }, []);

  // Animated numbers using useCountUp, only starting when isInView is true
  const isOccDecimal = Number(safeKpi.occRate) % 1 !== 0;
  const countOccRate = useCountUp(safeKpi.occRate, { enabled: isInView, decimals: isOccDecimal ? 1 : 0, duration: 800 });
  const countTotalUsed = useCountUp(safeKpi.totalUsed, { enabled: isInView, duration: 750 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 750 });
  const countTotalAvai = useCountUp(safeKpi.totalAvai, { enabled: isInView, duration: 850 });
  const countOdpCount = useCountUp(safeKpi.odpCount, { enabled: isInView, duration: 800 });
  const countActCompletionPct = useCountUp(safeKpi.actCompletionPct, { enabled: isInView, decimals: Number(safeKpi.actCompletionPct) % 1 !== 0 ? 1 : 0, duration: 850 });
  const countActVerified = useCountUp(safeKpi.actVerified, { enabled: isInView, duration: 750 });
  const countActUploaded = useCountUp(safeKpi.actUploaded, { enabled: isInView, duration: 750 });
  const pendingCount = safeKpi.actPending || safeKpi.actBelum || 0;
  const countActPending = useCountUp(pendingCount, { enabled: isInView, duration: 750 });

  return (
    <div className="kpi-grid-4">
      {/* ─── CARD 1: TOTAL OCCUPANCY RATE ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-1">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Total Occupancy Rate
          </span>
          {safeKpi.gapWoW != null && (
            <span className={safeKpi.gapWoW > 0 ? 'gap-badge-pos' : safeKpi.gapWoW < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
              {safeKpi.gapWoW > 0 ? `+${safeKpi.gapWoW}%` : `${safeKpi.gapWoW}%`} WoW
            </span>
          )}
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countOccRate}%
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView ? `${Math.min(safeKpi.occRate, 100)}%` : '0%', 
                background: '#0F172A', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          {countTotalUsed} dari {countTotalPort} port terpakai
        </div>
      </div>

      {/* ─── CARD 2: PORT TERSEDIA ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Port Tersedia
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Kapasitas
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countTotalAvai}
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView && safeKpi.totalPort > 0 ? `${Math.min((safeKpi.totalAvai / safeKpi.totalPort) * 100, 100)}%` : '0%', 
                background: '#64748B', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          Total kapasitas {countTotalPort} port di {countOdpCount} ODP
        </div>
      </div>

      {/* ─── CARD 3: TOTAL ODP TERPANTAU ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Total ODP Terpantau
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Cakupan
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countOdpCount}
          </div>

          {/* Multi-color stacked bar horizontal (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
            {safeKpi.odpCount > 0 ? (
              safeStatusChips.map(s => {
                const sharePct = (s.count / safeKpi.odpCount) * 100;
                if (sharePct <= 0) return null;
                return (
                  <div 
                    key={s.label}
                    title={`${s.label}: ${s.count}`}
                    className="progress-bar-fill"
                    style={{
                      height: '100%',
                      width: isMounted && isInView ? `${sharePct}%` : '0%',
                      background: s.color
                    }}
                  />
                );
              })
            ) : (
              <div style={{ height: '100%', width: '0%', background: '#64748B' }} />
            )}
          </div>
        </div>

        {/* Legenda titik warna inline (G, Y, O, R, B) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          {safeStatusChips.map(s => (
            <span 
              key={s.label} 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '3.5px', 
                fontSize: '11px', 
                color: '#475569', 
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, border: s.color?.toUpperCase() === '#FFFF00' ? '1px solid #CBD5E1' : 'none', boxSizing: 'border-box', display: 'inline-block' }} />
              <span>{s.label[0]}: {s.count.toLocaleString('id-ID')}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── CARD 4: AKTIVITAS GTM SELESAI ─── */}
      <div className="kpi-metric-card kpi-card-animated stagger-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '22px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Aktivitas GTM Selesai
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            background: '#F1F5F9', 
            color: '#475569', 
            borderRadius: '999px' 
          }}>
            Verifikasi
          </span>
        </div>

        <div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0F172A', 
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            margin: '8px 0 10px'
          }}>
            {countActCompletionPct}%
          </div>

          {/* Progress bar ramping (h-2) */}
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              className="progress-bar-fill"
              style={{ 
                height: '100%', 
                width: isMounted && isInView ? `${Math.min(safeKpi.actCompletionPct, 100)}%` : '0%', 
                background: '#0F172A', 
                borderRadius: '999px'
              }} 
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '10px' }}>
          {countActVerified} terverifikasi · {countActUploaded} diunggah · {countActPending} belum
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/OdpStatusDonutCard.jsx
```javascript
import { useState, useMemo, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// ─── STATUS DESCRIPTIONS & COLOR PALETTE ───
const STATUS_DESCRIPTIONS = {
  Green: 'Okupansi < 25% (Siap Jual)',
  Yellow: 'Okupansi 25% - 50% (Moderat)',
  Orange: 'Okupansi 50% - 75% (Tinggi)',
  Red: 'Okupansi > 75% (Kritis)',
  Black: '0 Port Terpakai (Idle / Kosong)'
};

export default function OdpStatusDonutCard({ statusChips = [], totalOdp = 0, isInView = true }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setIsAnimated(true), 60);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [isInView]);

  // Total count & anim counter
  const safeTotal = useMemo(() => {
    if (totalOdp > 0) return totalOdp;
    return statusChips.reduce((sum, s) => sum + (s.count || 0), 0) || 1;
  }, [totalOdp, statusChips]);

  const countTotalOdp = useCountUp(safeTotal, { enabled: isInView, duration: 800 });

  // Donut geometry: Center at (100, 100), Radius 66, Stroke 28
  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.69

  // Calculate arc slices
  const slices = useMemo(() => {
    let accumulatedOffset = 0;
    return statusChips.map((chip) => {
      const count = chip.count || 0;
      const pct = (count / safeTotal);
      const strokeLength = pct * circumference;
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      // Ensure Yellow strictly uses #FFFF00
      const color = chip.label?.toLowerCase() === 'yellow' ? '#FFFF00' : (chip.color || '#334155');

      return {
        ...chip,
        color,
        pct: Math.round(pct * 1000) / 10,
        strokeLength,
        offset,
        description: STATUS_DESCRIPTIONS[chip.label] || chip.label
      };
    });
  }, [statusChips, safeTotal, circumference]);

  const activeChip = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div
      className="saas-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '22px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '320px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── HEADER KARTU ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569', letterSpacing: '-0.1px' }}>
          Profil Status Utilisasi ODP
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#475569',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {safeTotal.toLocaleString('id-ID')} ODP
        </span>
      </div>

      {/* ─── KONTEN: DONUT SVG (KIRI) + INTERACTIVE LEGEND (KANAN) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* SVG Donut Chart (~50% diperbesar dari 170px ke 255px) */}
        <div style={{ position: 'relative', width: '255px', height: '255px', flexShrink: 0, margin: '0 auto' }}>
          <svg
            width="255"
            height="255"
            viewBox="0 0 200 200"
            style={{
              overflow: 'visible',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center'
            }}
          >
            {/* Background Track Circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="28"
            />

            {/* Slices */}
            {slices.map((slice, idx) => {
              const isHovered = hoveredIndex === idx;
              // Animated stroke: grow from 0 to full length
              const visibleLength = isAnimated ? slice.strokeLength : 0;
              const gapAdjustedLength = Math.max(visibleLength - 1.5, 0); // 1.5px gap between segments

              return (
                <circle
                  key={slice.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 34 : 28}
                  strokeDasharray={`${gapAdjustedLength} ${circumference - gapAdjustedLength}`}
                  strokeDashoffset={-slice.offset}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.18s ease, filter 0.18s ease, stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Donut Hub (Telemetry Center) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center'
            }}
          >
            {activeChip ? (
              <>
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: 600,
                    color: activeChip.label?.toLowerCase() === 'yellow' ? '#CA8A04' : activeChip.color,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {activeChip.count.toLocaleString('id-ID')}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#475569',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '3px'
                  }}
                >
                  {activeChip.label} ({activeChip.pct}%)
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 600,
                    color: '#0F172A',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1
                  }}
                >
                  {countTotalOdp}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#64748B',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    marginTop: '3px'
                  }}
                >
                  TOTAL ODP
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend Interaktif Sisi Kanan */}
        <div style={{ flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={slice.label}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      border: slice.color?.toUpperCase() === '#FFFF00' ? '1px solid #CBD5E1' : 'none',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isHovered ? 600 : 500,
                      color: isHovered ? '#0F172A' : '#334155',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {slice.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {slice.count.toLocaleString('id-ID')}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '38px',
                      textAlign: 'right'
                    }}
                  >
                    {slice.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/PortDistributionChartCard.jsx
```javascript
import { useState, useEffect } from 'react';

// Formatter nama WOK agar muat proporsional dan jelas pada x-axis histogram
function formatWokLabel(name) {
  if (!name) return '';
  const upper = name.trim().toUpperCase();
  if (upper.includes('WONOSOBO')) return 'WONOSOBO';
  if (upper.includes('CILACAP')) return 'CILACAP';
  if (upper.includes('PEMALANG')) return 'PEMALANG';
  if (upper.includes('TEGAL')) return 'TEGAL';
  if (upper.includes('MAGELANG')) return 'MAGELANG';
  if (upper.includes('JEPARA') || upper.includes('KUDUS') || upper.includes('PATI')) return 'KUDUS-PATI';
  if (upper === 'SEMARANG 1' || upper.includes('SEMARANG 1')) return 'SMG 1';
  if (upper === 'SEMARANG 2' || upper.includes('SEMARANG 2')) return 'SMG 2';
  if (upper === 'YOGYAKARTA 1' || upper.includes('YOGYA 1')) return 'YOGYA 1';
  if (upper === 'YOGYAKARTA 2' || upper.includes('YOGYA 2')) return 'YOGYA 2';
  if (upper.includes('BOYOLALI')) return 'BOYOLALI';
  if (upper.includes('SRAGEN')) return 'SRAGEN';
  if (upper.includes('SURAKARTA') || upper.includes('SOLO')) return 'SURAKARTA';
  if (upper.includes('BATANG')) return 'BATANG';
  if (upper.includes('KEBUMEN')) return 'KEBUMEN';
  if (upper.includes('DEMAK')) return 'DEMAK';

  const firstWord = upper.split(/[\s-]+/)[0];
  return firstWord.length <= 9 ? firstWord : upper.slice(0, 8);
}

// ─── SECTION 2: DISTRIBUSI UTILISASI PORT PER BRANCH & WOK ───
export default function PortDistributionChartCard({
  ranking = [],
  branches = [],
  isInView = true,
  onSelectBranch
}) {
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Trigger animasi pertumbuhan bar saat komponen masuk ke viewport
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  // Siapkan Histogram Bars dari data ranking dan branches asli
  const branchList = Array.isArray(ranking) && ranking.length > 0 ? ranking : branches;

  const histogramBars = [];
  branchList.forEach((b) => {
    // Cari data proyek lengkap dari cabang terkait untuk verifikasi kalkulasi port
    const rawBranch = branches.find(br => (br.name || '').toUpperCase() === (b.name || '').toUpperCase()) || b;
    const branchProjects = rawBranch.projects || [];

    if (b.woks && b.woks.length > 0) {
      b.woks.forEach((w) => {
        let portUsed = w.totalUsed;
        let portTotal = w.totalPort;

        // Fallback agregasi langsung dari proyek jika properti total belum terhitung
        if (portTotal === undefined || portTotal === null || portTotal === 0) {
          const cleanW = (w.name || '').toUpperCase().replace(/[\s-]/g, '');
          const matchingProjs = branchProjects.filter(p => {
            const pWok = (p.wok || '').toUpperCase().replace(/[\s-]/g, '');
            return pWok === cleanW || pWok.includes(cleanW) || cleanW.includes(pWok);
          });
          portUsed = matchingProjs.reduce((s, p) => s + (p.usedTotal ?? (p.odps || []).reduce((so, o) => so + (o.used || 0), 0)), 0);
          portTotal = matchingProjs.reduce((s, p) => s + (p.totalPort ?? (p.odps || []).reduce((so, o) => so + (o.total || 0), 0)), 0);
        }

        const safePortTotal = portTotal > 0 ? portTotal : 1;
        const occRate = w.occRate !== undefined && w.occRate !== null
          ? w.occRate
          : Math.round(((portUsed || 0) / safePortTotal) * 1000) / 10;

        histogramBars.push({
          id: `${b.name}-${w.name}`,
          branchName: b.name,
          displayName: w.name,
          shortWokLabel: formatWokLabel(w.name),
          occRate,
          portUsed: portUsed || 0,
          portTotal: portTotal || 0,
          portAvai: Math.max((portTotal || 0) - (portUsed || 0), 0),
          delta: w.delta ?? 0,
          branchCode: b.name.slice(0, 3).toUpperCase()
        });
      });
    } else {
      let portUsed = b.totalUsed;
      let portTotal = b.totalPort;

      if (portTotal === undefined || portTotal === null || portTotal === 0) {
        portUsed = branchProjects.reduce((s, p) => s + (p.usedTotal ?? (p.odps || []).reduce((so, o) => so + (o.used || 0), 0)), 0);
        portTotal = branchProjects.reduce((s, p) => s + (p.totalPort ?? (p.odps || []).reduce((so, o) => so + (o.total || 0), 0)), 0);
      }

      const safePortTotal = portTotal > 0 ? portTotal : 1;
      const occRate = b.occRate !== undefined && b.occRate !== null
        ? b.occRate
        : Math.round(((portUsed || 0) / safePortTotal) * 1000) / 10;

      histogramBars.push({
        id: b.name,
        branchName: b.name,
        displayName: b.name,
        shortWokLabel: formatWokLabel(b.name),
        occRate,
        portUsed: portUsed || 0,
        portTotal: portTotal || 0,
        portAvai: Math.max((portTotal || 0) - (portUsed || 0), 0),
        delta: b.delta ?? 0,
        branchCode: b.name.slice(0, 3).toUpperCase()
      });
    }
  });

  const activeBar = hoveredBarIndex !== null ? histogramBars[hoveredBarIndex] : null;
  const PERCENTAGE_TICKS = [100, 80, 60, 40, 20, 0];

  return (
    <div
      className="saas-card port-distribution-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* Header Baris Chart dengan Judul dan Legend / Inspector Slot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          minHeight: '30px',
          height: '30px',
          gap: '12px'
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            letterSpacing: '-0.1px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          Distribusi Utilisasi Kapasitas Port per Branch & WOK
        </div>

        {/* Active Inspector Info / Legend Slot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: '26px',
            minWidth: 0,
            flexShrink: 1
          }}
        >
          {activeBar ? (
            <div
              style={{
                fontSize: '11.5px',
                color: '#0F172A',
                fontWeight: 600,
                background: '#F8FAFC',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontVariantNumeric: 'tabular-nums',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                whiteSpace: 'nowrap',
                lineHeight: '18px',
                height: '26px',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <span style={{ color: '#800000', fontWeight: 600 }}>{activeBar.branchName}</span>&nbsp;({activeBar.displayName}):&nbsp;{activeBar.occRate}% ({activeBar.portUsed.toLocaleString('id-ID')} / {activeBar.portTotal.toLocaleString('id-ID')} port)
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '11px',
                color: '#64748B',
                fontWeight: 600,
                height: '26px',
                lineHeight: '18px',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#800000' }} />
                Utilisasi Port Terpakai
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kontainer Diagram Batang dengan Sumbu X, Sumbu Y Solid & Garis Kisi Solid */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '6px' }}>
        <div style={{ minWidth: '660px', width: '100%' }}>
          {histogramBars.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', width: '100%' }}>
              Belum ada data distribusi port untuk ditampilkan.
            </div>
          ) : (
            <>
              {/* ─── AREA PLOTTING (SUMBU Y DI KIRI + GRID SOLID & BOX PROGRESS DI KANAN) ─── */}
              <div
                style={{
                  display: 'flex',
                  height: '210px',
                  width: '100%',
                  position: 'relative',
                  paddingTop: '18px',
                  boxSizing: 'border-box'
                }}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {/* 1. Sumbu Y (Garis Vertikal di Kiri + Nilai Persentase, Tanpa Strip) */}
                <div
                  style={{
                    width: '46px',
                    height: '100%',
                    position: 'relative',
                    flexShrink: 0,
                    borderRight: '1.5px solid #94A3B8'
                  }}
                  aria-label="Garis Sumbu Y Kuantitas Persentase"
                >
                  {PERCENTAGE_TICKS.map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: 'absolute',
                        bottom: `${pct}%`,
                        right: 0,
                        transform: 'translateY(50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '8px',
                        zIndex: 2
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#64748B',
                          fontVariantNumeric: 'tabular-nums',
                          userSelect: 'none',
                          lineHeight: 1
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* 2. Area Plotting Canvas (Sumbu X Solid di Bawah + Garis Panduan Grid Solid + Box Progress) */}
                <div
                  style={{
                    flex: 1,
                    height: '100%',
                    position: 'relative',
                    borderBottom: '1.5px solid #94A3B8'
                  }}
                  aria-label="Area Diagram Batang dan Sumbu X"
                >
                  {/* Garis-Garis Solid Sumbu Y Penanda Persentase (Tidak Putus-Putus) */}
                  {PERCENTAGE_TICKS.filter(p => p > 0).map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: `${pct}%`,
                        borderTop: '1px solid #E2E8F0',
                        pointerEvents: 'none',
                        zIndex: 0
                      }}
                    />
                  ))}

                  {/* Kontainer Kolom Batang (Hanya Box Progress Saja) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '8px',
                      padding: '0 8px'
                    }}
                  >
                    {histogramBars.map((bar, idx) => {
                      const isHovered = hoveredBarIndex === idx;
                      const safeOcc = Math.min(Math.max(bar.occRate, 0), 100);
                      const currentHeight = hasAnimated ? safeOcc : 0;

                      return (
                        <div
                          key={bar.id}
                          onMouseEnter={() => setHoveredBarIndex(idx)}
                          onClick={() => {
                            if (onSelectBranch) onSelectBranch(bar.branchName);
                          }}
                          style={{
                            flex: 1,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            minWidth: 0
                          }}
                        >
                          {/* Box Progress Batang Port Terpakai Saja (Tanpa Outer Box & Tanpa Tanda Persen di Atasnya) */}
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '26px',
                              height: `${currentHeight}%`,
                              minHeight: safeOcc > 0 ? '3px' : '0',
                              backgroundColor: isHovered ? '#660000' : '#800000',
                              borderRadius: '4px 4px 0 0',
                              zIndex: 1,
                              transition: 'height 0.7s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                              transitionDelay: hasAnimated ? `${idx * 20}ms` : '0ms',
                              transform: isHovered ? 'translateY(-2px)' : 'none',
                              boxShadow: isHovered ? '0 4px 12px rgba(128, 0, 0, 0.25)' : 'none'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ─── LABEL SUMBU X (GARIS HORIZONTAL SOLID, NAMA WOK & BRANCH TANPA STRIP) ─── */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  marginTop: '0px'
                }}
              >
                {/* Spacer Menyesuaikan Lebar Sumbu Y */}
                <div style={{ width: '46px', flexShrink: 0 }} />

                {/* Kontainer Label WOK & Branch per Kolom Sumbu X */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    gap: '8px',
                    padding: '0 8px'
                  }}
                >
                  {histogramBars.map((bar, idx) => {
                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <div
                        key={bar.id}
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onClick={() => {
                          if (onSelectBranch) onSelectBranch(bar.branchName);
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          minWidth: 0,
                          paddingTop: '6px'
                        }}
                      >
                        {/* Label Singkat WOK (Tanpa Penanda Strip) */}
                        <span
                          title={`${bar.displayName} (${bar.branchName})`}
                          style={{
                            fontSize: '10px',
                            fontWeight: isHovered ? 600 : 500,
                            color: isHovered ? '#800000' : '#475569',
                            width: '100%',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            letterSpacing: '-0.1px',
                            lineHeight: '13px',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          {bar.shortWokLabel}
                        </span>

                        {/* Kode Branch */}
                        <span
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 500,
                            color: isHovered ? '#800000' : '#94A3B8',
                            lineHeight: '11px',
                            letterSpacing: '0.2px',
                            marginTop: '2px'
                          }}
                        >
                          {bar.branchCode}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/RegionalMetricsSummaryCard.jsx
```javascript
import { useCountUp } from '../../hooks/useCountUp';

// ─── SECTION 1: METRIK UTAMA REGIONAL (PORT TERSEDIA, TOTAL ODP, VERIFIKASI KEGIATAN) ───
export default function RegionalMetricsSummaryCard({
  safeKpi,
  safeStatusChips = [],
  isInView = true
}) {
  // Animated numbers
  const countTotalAvai = useCountUp(safeKpi.totalAvai, { enabled: isInView, duration: 800 });
  const countTotalPort = useCountUp(safeKpi.totalPort, { enabled: isInView, duration: 800 });
  const countOdpCount = useCountUp(safeKpi.odpCount, { enabled: isInView, duration: 800 });
  const countActVerified = useCountUp(safeKpi.actVerified, { enabled: isInView, duration: 750 });
  const pendingCount = safeKpi.actPending || 0;
  const countActPending = useCountUp(pendingCount, { enabled: isInView, duration: 750 });
  const countActBelum = useCountUp(safeKpi.actBelum || 0, { enabled: isInView, duration: 850 });
  const isActDecimal = Number(safeKpi.actCompletionPct) % 1 !== 0;
  const countActCompletionPct = useCountUp(safeKpi.actCompletionPct, { enabled: isInView, decimals: isActDecimal ? 1 : 0, duration: 850 });

  return (
    <div
      className="saas-card regional-metrics-card"
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px 28px',
        border: '1px solid #E2E8F0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        minHeight: '190px'
      }}
    >
      {/* Grid 3 Metrik Utama: Port Tersedia, Total ODP Terpantau, Verifikasi Kegiatan */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px',
          alignItems: 'flex-start',
          width: '100%'
        }}
      >
        {/* Metrik 1: Port Tersedia */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Port Tersedia
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countTotalAvai}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Kapasitas:{' '}
            <span
              style={{
                fontWeight: 600,
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginLeft: '4px'
              }}
            >
              {countTotalPort}
            </span>
          </div>
        </div>

        {/* Metrik 2: Total ODP Terpantau */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Total ODP Terpantau
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countOdpCount}
          </div>
          {/* 5-Color Status Breakdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              height: '24px'
            }}
          >
            {safeStatusChips.map((s) => (
              <span
                key={s.label}
                title={`${s.label}: ${s.count}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#475569',
                  fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum"',
                  whiteSpace: 'nowrap'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: s.color,
                    border: s.color?.toUpperCase() === '#FFFF00' ? '1px solid #CBD5E1' : 'none',
                    boxSizing: 'border-box',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
                <span>
                  {s.label[0]}:{s.count.toLocaleString('id-ID')}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Metrik 3: Verifikasi Kegiatan */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Verifikasi Kegiatan
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {countActCompletionPct}%
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span
              style={{
                color: '#1E293B',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActVerified}
            </span>
            <span>verif</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span
              style={{
                color: '#1E293B',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActPending}
            </span>
            <span>review</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span
              style={{
                color: '#1E293B',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {countActBelum}
            </span>
            <span>belum</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/dashboard/RightWidgetPanel.jsx
```javascript
import { memo } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

function MiniProgressItem({ b, index, isLast, goBranch, isInView }) {
  const isDecimal = Number(b.occRate) % 1 !== 0;
  const animDuration = 800;
  const animDelay = index * 40;
  const countOcc = useCountUp(b.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: animDuration, delay: animDelay });

  const isPositive = b.delta > 0;
  const isNegative = b.delta < 0;
  const deltaColor = isPositive ? '#16A34A' : isNegative ? '#DC2626' : '#64748B';
  const deltaFormatted = isPositive ? `+${b.delta}%` : `${b.delta}%`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (goBranch) goBranch(b.name);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (goBranch) goBranch(b.name);
        }
      }}
      aria-label={`Buka detail branch ${b.name}`}
      className="ranking-mini-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        padding: '12px 6px',
        borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        borderRadius: '6px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Baris 1: Rank, Nama Branch & Persentase + Trend Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', flexShrink: 0 }}>
            #{index + 1}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
            {countOcc}%
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11.5px',
              fontWeight: 500,
              color: deltaColor,
              fontVariantNumeric: 'tabular-nums',
              background: 'none',
              border: 'none',
              padding: 0
            }}
          >
            {isPositive ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            ) : isNegative ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <span>{deltaFormatted}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── RIGHT WIDGET PANEL (CLEAN RANKING BRANCH) ───
export default memo(function RightWidgetPanel({
  ranking = [],
  goBranch,
  isInView = true
}) {
  const sortedBranches = Array.isArray(ranking) && ranking.length > 0
    ? [...ranking].sort((a, b) => a.occRate - b.occRate)
    : [];

  return (
    <div
      className="saas-card right-widget-panel"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Ranking Branch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
          Ranking Branch
        </span>
        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
          OCC Terendah
        </span>
      </div>

      {/* List 6 Branch Terurut OCC Terendah */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sortedBranches.length > 0 ? (
          sortedBranches.slice(0, 6).map((b, idx, arr) => (
            <MiniProgressItem
              key={b.name}
              b={b}
              index={idx}
              isLast={idx === arr.length - 1}
              goBranch={goBranch}
              isInView={isInView}
            />
          ))
        ) : (
          <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC', borderRadius: '10px' }}>
            Belum ada data peringkat branch.
          </div>
        )}
      </div>
    </div>
  );
});
```

## File: src/components/dashboard/SearchFilterToolbar.jsx
```javascript
import { useState } from 'react';

// ─── TOOLBAR PENCARIAN & FILTER (HARMONIOUS PALETTE, NO ACCENT CLASH) ───
export default function SearchFilterToolbar({
  searchQuery,
  onSearchChange,
  scopeFilter,
  onScopeChange,
  branchList = []
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className="search-filter-toolbar"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${isFocused ? '#94A3B8' : '#E2E8F0'}`,
        boxShadow: 'none',
        padding: '5px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.15s ease',
        boxSizing: 'border-box'
      }}
    >
      {/* Dropdown Pemilih Cakupan Terintegrasi di Kiri */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          value={scopeFilter}
          onChange={(e) => onScopeChange(e.target.value)}
          aria-label="Pilih cakupan branch"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '7px 26px 7px 10px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            transition: 'border-color 0.15s ease'
          }}
        >
          <option value="ALL">Semua Cakupan</option>
          {branchList.map((b) => (
            <option key={b.name || b} value={b.name || b}>
              Branch {b.name || b}
            </option>
          ))}
        </select>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '9px',
            pointerEvents: 'none'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />

      {/* Input Teks Pencarian */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label="Cari Branch, WOK, atau Nama Proyek"
          placeholder="Cari Branch, WOK, atau Nama Proyek..."
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: '13px',
            color: '#0F172A',
            padding: '7px 0',
            fontWeight: 500
          }}
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Hapus kata kunci pencarian"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              marginRight: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Ikon Kaca Pembesar di Kanan (Harmonious neutral with subtle red active state) */}
      <div
        aria-hidden="true"
        style={{
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isFocused ? '#800000' : '#64748B',
          transition: 'color 0.15s ease'
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
    </div>
  );
}
```

## File: src/components/layout/AppSidebar.jsx
```javascript
import { useLocation } from 'react-router';
import CekPairingNavItem from './CekPairingNavItem';
import ProgramMenu from './ProgramMenu';
import { SHOW_PROGRAM_MENU } from '../../constants/programs';

export default function AppSidebar({
  user,
  isAdmin,
  activeSection = 'dashboard',
  goDashboard,
  goUpload,
  goAdmin,
  onLoginClick,
  setShowLoginModal,
  dynamicMonthsData,
  setActiveProgramModal,
  isMobileOpen,
  setIsMobileOpen,
  handleLogout
}) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isContinuous = currentPath === '/' || currentPath === '/dashboard';
  const isDashboardActive = isContinuous
    ? activeSection === 'dashboard'
    : currentPath === '/' || currentPath === '/dashboard' || currentPath.startsWith('/branch');
  const isActivityActive = isContinuous
    ? activeSection === 'activity'
    : currentPath === '/upload';
  const isControlActive = currentPath === '/admin';

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: '256px',
          background: '#021329',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          bottom: 0,
          height: '100vh',
          minHeight: '100dvh',
          maxHeight: '100dvh',
          zIndex: 999,
          padding: '24px 0 20px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            padding: '0 24px 28px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (goDashboard) goDashboard();
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className="sidebar-brand-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
              textAlign: 'left'
            }}
            title="Beranda GTM Activity Monitoring"
          >
            <img
              src="/telkomsel-symbol.png"
              alt=""
              aria-hidden="true"
              style={{
                height: '28px',
                width: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))'
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
          </button>
        </div>

        <div
          style={{
            padding: '0 24px',
            marginBottom: '10px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.55)',
            userSelect: 'none'
          }}
        >
          MENU
        </div>

        <nav
          aria-label="Menu Utama"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            width: '100%'
          }}
        >
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => {
              goDashboard();
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className={`sidebar-nav-item ${isDashboardActive ? 'active' : ''}`}
          >
            <span className="sidebar-left-indicator" aria-hidden="true" />
            <span className="sidebar-nav-box">
              <svg
                className="nav-icon-outline"
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
              <svg
                className="nav-icon-filled"
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
              <span className="sidebar-nav-label">Dashboard</span>
            </span>
          </button>

          {/* 2. Activity */}
          <button
            type="button"
            onClick={() => {
              goUpload();
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className={`sidebar-nav-item ${isActivityActive ? 'active' : ''}`}
          >
            <span className="sidebar-left-indicator" aria-hidden="true" />
            <span className="sidebar-nav-box">
              <svg
                className="nav-icon-outline"
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="3" width="16" height="18" rx="2.5" />
                <line x1="8" y1="8" x2="16" y2="8" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="8" y1="16" x2="13" y2="16" />
              </svg>
              <svg
                className="nav-icon-filled"
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6.5 2h11A3.5 3.5 0 0 1 21 5.5v13a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 18.5v-13A3.5 3.5 0 0 1 6.5 2zm1.5 5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 0 0 0 2h5a1 1 0 1 0 0-2H8z" />
              </svg>
              <span className="sidebar-nav-label">Activity</span>
            </span>
          </button>

          {/* 3. Cek Pairing */}
          <CekPairingNavItem
            user={user}
            setShowLoginModal={setShowLoginModal}
            customButton={({ onClick, isOpen, btnRef }) => (
              <button
                ref={btnRef}
                type="button"
                onClick={() => {
                  onClick();
                  if (setIsMobileOpen) setIsMobileOpen(false);
                }}
                className={`sidebar-nav-item ${isOpen ? 'active' : ''}`}
                title="Pencarian Data Telkomsel One Pairing"
              >
                <span className="sidebar-left-indicator" aria-hidden="true" />
                <span
                  className="sidebar-nav-box"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg
                      className="nav-icon-outline"
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <svg
                      className="nav-icon-filled"
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span className="sidebar-nav-label">Cek Pairing</span>
                  </span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      opacity: 0.5,
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
            )}
          />

          {/* 4. Program */}
          {SHOW_PROGRAM_MENU && (
            <ProgramMenu
              user={user}
              setShowLoginModal={setShowLoginModal}
              dynamicMonthsData={dynamicMonthsData}
              setActiveProgramModal={setActiveProgramModal}
              customButton={({ onClick, isOpen, btnRef }) => (
                <button
                  ref={btnRef}
                  type="button"
                  onClick={() => {
                    onClick();
                    if (setIsMobileOpen) setIsMobileOpen(false);
                  }}
                  className={`sidebar-nav-item ${isOpen ? 'active' : ''}`}
                  title="Daftar Program Marketing & Penjualan"
                >
                  <span className="sidebar-left-indicator" aria-hidden="true" />
                  <span
                    className="sidebar-nav-box"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <svg
                        className="nav-icon-outline"
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2.5" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <svg
                        className="nav-icon-filled"
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                      </svg>
                      <span className="sidebar-nav-label">Program</span>
                    </span>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        opacity: 0.5,
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </button>
              )}
            />
          )}

          {/* 5. Admin Panel */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                goAdmin();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              className={`sidebar-nav-item ${isControlActive ? 'active' : ''}`}
            >
              <span className="sidebar-left-indicator" aria-hidden="true" />
              <span className="sidebar-nav-box">
                <svg
                  className="nav-icon-outline"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <svg
                  className="nav-icon-filled"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21c0 .5.4.9.9.9h17.4c.5 0 .9-.4.9-.9v-1.8c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
                <span className="sidebar-nav-label">Admin</span>
              </span>
            </button>
          )}
        </nav>

        {user ? (
          <div
            style={{
              marginTop: 'auto',
              padding: '24px 14px 0 14px'
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (handleLogout) handleLogout();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              className="sidebar-logout-btn"
              title="Keluar dari akun (Logout)"
              style={{
                width: '100%',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 10px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#C8102E',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
                transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.16)';
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C8102E"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
                <polyline points="8 16 4 12 8 8" />
                <line x1="4" y1="12" x2="14" y2="12" />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#C8102E',
                  letterSpacing: '-0.1px',
                  whiteSpace: 'nowrap'
                }}
              >
                Logout
              </span>
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 'auto', padding: '16px 20px 0' }}>
            <button
              type="button"
              onClick={onLoginClick}
              className="sidebar-login-btn"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#FFFFFF',
                color: '#021329',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)'
              }}
            >
              Masuk Akun
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
```

## File: src/components/layout/CekPairingNavItem.jsx
```javascript
import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import CekPairingPopover from '../CekPairingPopover';

// Menu CEK PAIRING di navigasi (TopNav / Sidebar) + popover pencarian
export default function CekPairingNavItem({ user, setShowLoginModal, customButton }) {
  const cekPairingTabRef = useRef(null);
  // Tsel One Pairing Popover States
  const [isPairingDropdownOpen, setIsPairingDropdownOpen] = useState(false);
  const [pairingCoords, setPairingCoords] = useState({ top: 0, left: 0 });

  const updatePairingCoords = useCallback(() => {
    if (cekPairingTabRef.current) {
      const rect = cekPairingTabRef.current.getBoundingClientRect();
      if (rect.left < 280) {
        setPairingCoords({
          top: Math.min(Math.max(rect.top, 16), window.innerHeight - 440),
          left: Math.min(rect.right + 200, window.innerWidth - 200)
        });
        return;
      }
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
    <div ref={cekPairingTabRef} style={{ position: 'relative', width: '100%' }}>
      {customButton ? (
        customButton({
          onClick: () => {
            if (!user) {
              if (setShowLoginModal) setShowLoginModal(true);
              return;
            }
            if (!isPairingDropdownOpen) updatePairingCoords();
            setIsPairingDropdownOpen(!isPairingDropdownOpen);
          },
          isOpen: isPairingDropdownOpen,
          btnRef: cekPairingTabRef
        })
      ) : (
        <button
          type="button"
          className="nav-tab-btn"
          onClick={() => {
            if (!user) {
              if (setShowLoginModal) setShowLoginModal(true);
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
            color: isPairingDropdownOpen ? '#800000' : '#64748B',
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
      )}

      <CekPairingPopover
        isOpen={isPairingDropdownOpen}
        coords={pairingCoords}
        onClose={() => setIsPairingDropdownOpen(false)}
      />
    </div>
  );
}
```

## File: src/components/layout/LoadingScreen.jsx
```javascript
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
```

## File: src/components/layout/LogoutConfirmModal.jsx
```javascript
import { useEffect } from 'react';

// Custom Logout Confirmation Modal
export default function LogoutConfirmModal({ setShowLogoutConfirmModal, executeLogout }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowLogoutConfirmModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowLogoutConfirmModal]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi Keluar Akun"
      onClick={() => setShowLogoutConfirmModal(false)}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(15, 23, 42, 0.45)', 
        backdropFilter: 'blur(4px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 300, 
        padding: '20px', 
        animation: 'fadeIn 0.2s ease-in-out' 
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: '#FFFFFF', 
          borderRadius: '16px', 
          width: '100%', 
          maxWidth: '350px', 
          padding: '24px 22px 20px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)', 
          border: '1px solid #E2E8F0', 
          textAlign: 'center', 
          animation: 'flyoutSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'var(--font-body)'
        }}
      >
        <p 
          style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '14.5px', 
            fontWeight: 600, 
            color: '#0F172A', 
            margin: '0 0 22px', 
            lineHeight: 1.55,
            letterSpacing: '-0.1px'
          }}
        >
          Apakah Anda yakin ingin keluar dari Portal GTM Activity Monitor?
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#475569',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={executeLogout}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #DC2626',
              background: '#DC2626',
              color: '#FFFFFF',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.borderColor = '#B91C1C'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.borderColor = '#DC2626'; }}
          >
            Ya, Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/layout/ProfileMenu.jsx
```javascript
import { formatBranch } from '../../utils';

// User Profile Flyout Dropdown
export default function ProfileMenu({ user, isAdmin, setShowProfileModal, handleLogout }) {
  return (
    <>
      {/* Transparent Backdrop Overlay to close on outside click */}
      <div 
        onClick={() => setShowProfileModal(false)} 
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
      />

      <div className="profile-dropdown-card">
        {/* Header info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 14px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="profile-avatar-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <div style={{ overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.fullName || user.username}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>
              @{user.username}
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div style={{ padding: '12px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Branch</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {isAdmin ? 'Semua Branch' : formatBranch(user.branchName)}
            </span>
          </div>
        </div>

        {/* Action Items List */}
        <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Log Out Item with Red Door Icon */}
          <button
            type="button"
            onClick={() => {
              setShowProfileModal(false);
              handleLogout(true);
            }}
            className="profile-menu-item logout"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
```

## File: src/components/layout/ProgramMenu.jsx
```javascript
import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { SESSION_1_MONTHS, SESSION_2_MONTHS, PROGRAM_PLACEHOLDERS } from '../../constants/programs';

// Menu PROGRAM di navigasi: dropdown periode (level 1) + daftar program per bulan (level 2)
export default function ProgramMenu({ user, setShowLoginModal, dynamicMonthsData, setActiveProgramModal, customButton }) {
  const programTabRef = useRef(null);
  const programMenuRef = useRef(null);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [activeHoverMonth, setActiveHoverMonth] = useState('Agustus 2026');
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });

  const updateDropdownCoords = useCallback(() => {
    if (programTabRef.current) {
      const rect = programTabRef.current.getBoundingClientRect();
      if (rect.left < 280) {
        setDropdownCoords({
          top: Math.min(rect.top, window.innerHeight - 380),
          left: rect.right + 115
        });
        return;
      }
      const dropdownWidth = 220;
      let targetLeft = rect.left + rect.width / 2;
      const margin = 12;
      if (targetLeft - dropdownWidth / 2 < margin) {
        targetLeft = dropdownWidth / 2 + margin;
      } else if (targetLeft + dropdownWidth / 2 > window.innerWidth - margin) {
        targetLeft = window.innerWidth - dropdownWidth / 2 - margin;
      }
      setDropdownCoords({
        top: rect.bottom + 8,
        left: targetLeft
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isProgramDropdownOpen) {
      updateDropdownCoords();
      window.addEventListener('resize', updateDropdownCoords);
      window.addEventListener('scroll', updateDropdownCoords);
      return () => {
        window.removeEventListener('resize', updateDropdownCoords);
        window.removeEventListener('scroll', updateDropdownCoords);
      };
    }
  }, [isProgramDropdownOpen, updateDropdownCoords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        programMenuRef.current && !programMenuRef.current.contains(e.target) &&
        !e.target.closest('.program-fixed-dropdown')
      ) {
        setIsProgramDropdownOpen(false);
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
    <div ref={programMenuRef} style={{ position: 'relative' }}>
      {customButton ? (
        customButton({
          onClick: () => {
            if (!user) {
              setShowLoginModal(true);
              return;
            }
            if (!isProgramDropdownOpen) updateDropdownCoords();
            setIsProgramDropdownOpen(!isProgramDropdownOpen);
          },
          isOpen: isProgramDropdownOpen,
          btnRef: programTabRef
        })
      ) : (
      <button
        ref={programTabRef}
        type="button"
        className="nav-tab-btn"
        onClick={() => {
          if (!user) {
            setShowLoginModal(true);
            return;
          }
          if (!isProgramDropdownOpen) {
            updateDropdownCoords();
          }
          setIsProgramDropdownOpen(!isProgramDropdownOpen);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: isProgramDropdownOpen ? '#800000' : '#64748B',
          fontFamily: 'var(--font-heading)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.8px',
          cursor: 'pointer',
          transition: 'color 0.2s ease',
          padding: '6px 4px',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => { if (!isProgramDropdownOpen) e.currentTarget.style.color = '#0F172A'; }}
        onMouseLeave={(e) => { if (!isProgramDropdownOpen) e.currentTarget.style.color = '#64748B'; }}
      >
        <span>PROGRAM</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isProgramDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      )}

      {/* LEVEL 1 DROPDOWN (FIXED POSITIONING UNTUK MENGHINDARI OVERFLOW CLIPPING) */}
      {user && isProgramDropdownOpen && dropdownCoords.top > 0 && (
        <div
          className="program-fixed-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`,
            transform: 'translateX(-50%)',
            width: '210px',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.16)',
            padding: '8px 0',
            zIndex: 99999,
            animation: 'programDropdownFadeIn 0.15s ease-out',
            fontFamily: 'var(--font-body)',
            color: '#334155'
          }}
        >
          {(() => {
            const nowMonthIdx = new Date().getMonth();
            const isSession2 = nowMonthIdx >= 6;
            const activeMonths = isSession2 ? SESSION_2_MONTHS : SESSION_1_MONTHS;

            return (
              <>
                <div style={{ padding: '8px 16px 6px 16px', fontFamily: 'var(--font-heading)', fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.4px', borderBottom: '1px solid #F1F5F9' }}>
                  Periode Program
                </div>

                {activeMonths.map(m => {
                  const monthData = dynamicMonthsData[m.label];
                  const hasDynamicData = monthData && monthData.programs && monthData.programs.length > 0;
                  const hasPlaceholders = PROGRAM_PLACEHOLDERS[m.label] && PROGRAM_PLACEHOLDERS[m.label].length > 0;
                  const hasPrograms = hasDynamicData || hasPlaceholders;

                  const isHovered = activeHoverMonth === m.label;
                  const isCurrent = m.isCurrent;

                  return (
                    <div
                      key={m.id}
                      onMouseEnter={() => {
                        if (hasPrograms) {
                          setActiveHoverMonth(m.label);
                        } else {
                          setActiveHoverMonth(null);
                        }
                      }}
                      onClick={() => {
                        if (hasPrograms) {
                          setActiveHoverMonth(activeHoverMonth === m.label ? null : m.label);
                        }
                      }}
                      style={{
                        position: 'relative',
                        padding: '10px 16px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12.5px',
                        fontWeight: isCurrent ? 600 : 500,
                        letterSpacing: '-0.1px',
                        color: !hasPrograms ? '#94A3B8' : (isHovered ? '#800000' : isCurrent ? '#0F172A' : '#334155'),
                        background: isHovered && hasPrograms ? 'rgba(128, 0, 0, 0.04)' : 'transparent',
                        cursor: hasPrograms ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{m.label}</span>
                      </div>

                      {hasPrograms ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isHovered ? '#800000' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isHovered ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10.5px', color: '#CBD5E1', fontWeight: 500 }}>Belum ada</span>
                      )}

                      {/* LEVEL 2 SUBMENU (DESKTOP FLYOUT + MOBILE INLINE ACCORDION) */}
                      {isHovered && hasPrograms && (() => {
                        const programList = hasDynamicData
                          ? monthData.programs.map(p => ({ name: p.sheetName, data: p }))
                          : (PROGRAM_PLACEHOLDERS[m.label] || []).map(pName => ({ name: pName, data: null }));

                        return (
                          <>
                            {/* DESKTOP SIDE FLYOUT (Hidden on mobile via CSS) */}
                            <div
                              className="program-level2-flyout"
                              style={{
                                position: 'absolute',
                                top: '-8px',
                                left: '100%',
                                marginLeft: '8px',
                                width: '260px',
                                background: '#FFFFFF',
                                borderRadius: '16px',
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 16px 36px rgba(15, 23, 42, 0.18)',
                                padding: '8px 0',
                                zIndex: 100000,
                                animation: 'fadeIn 0.2s ease-in-out',
                                fontFamily: 'var(--font-body)'
                              }}
                            >
                              <div style={{ padding: '8px 16px 6px 16px', fontFamily: 'var(--font-heading)', fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.4px', borderBottom: '1px solid #F1F5F9' }}>
                                Program {m.label}
                              </div>
                              {programList.map((progItem, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsProgramDropdownOpen(false);
                                    const targetProg = progItem.data || { sheetName: progItem.name, detailUrl: null, imageUrl: null };
                                    setActiveProgramModal({
                                      program: targetProg,
                                      monthLabel: m.label
                                    });
                                  }}
                                  style={{
                                    padding: '10px 16px',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    letterSpacing: '-0.1px',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#800000';
                                    e.currentTarget.style.background = 'rgba(128, 0, 0, 0.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#334155';
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progItem.name}</span>
                                  {progItem.data?.images?.length > 1 && (
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        fontFamily: 'var(--font-body)',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: '#FF5E00',
                                        background: 'rgba(255, 94, 0, 0.08)',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255, 94, 0, 0.2)'
                                      }}
                                    >
                                      {progItem.data.images.length} Slide
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* MOBILE INLINE COLLAPSIBLE ACCORDION (Shown on mobile via CSS) */}
                            <div
                              className="program-level2-inline"
                              style={{
                                width: '100%',
                                background: '#F8FAFC',
                                borderRadius: '10px',
                                margin: '6px 0 2px 0',
                                padding: '4px 0',
                                borderLeft: '3px solid #800000',
                                boxSizing: 'border-box',
                                fontFamily: 'var(--font-body)'
                              }}
                            >
                              <div style={{ padding: '6px 12px 4px 12px', fontFamily: 'var(--font-heading)', fontSize: '10.5px', fontWeight: 600, color: '#800000', letterSpacing: '0.4px' }}>
                                Daftar Program {m.label}:
                              </div>
                              {programList.map((progItem, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsProgramDropdownOpen(false);
                                    const targetProg = progItem.data || { sheetName: progItem.name, detailUrl: null, imageUrl: null };
                                    setActiveProgramModal({
                                      program: targetProg,
                                      monthLabel: m.label
                                    });
                                  }}
                                  style={{
                                    padding: '8px 12px 8px 18px',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ color: '#FF5E00', fontWeight: '900', flexShrink: 0 }}>•</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progItem.name}</span>
                                  </div>
                                  {progItem.data?.images?.length > 1 && (
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        fontFamily: 'var(--font-body)',
                                        fontSize: '9.5px',
                                        fontWeight: 600,
                                        color: '#FF5E00',
                                        background: 'rgba(255, 94, 0, 0.08)',
                                        padding: '1px 5px',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      {progItem.data.images.length} Slide
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
```

## File: src/components/layout/SessionExpiredModal.jsx
```javascript
import { useEffect } from 'react';

// ─── SESSION EXPIRED (15 MIN INACTIVITY / SESI TIDAK SAH) POPUP MODAL ───
export default function SessionExpiredModal({ sessionExpiredNotice, setSessionExpiredNotice }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSessionExpiredNotice(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSessionExpiredNotice]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: '420px',
        background: '#FFFFFF', borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '28px 24px', boxSizing: 'border-box',
        textAlign: 'center', animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: '#FFF7ED', border: '1px solid #FFEDD5',
          color: '#F97316', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px auto'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h3 id="session-expired-title" style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', fontFamily: "var(--font-heading)" }}>
          {sessionExpiredNotice === 'invalid' ? 'Sesi Berakhir' : 'Sesi Berakhir (15 Menit)'}
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', fontWeight: 500 }}>
          {sessionExpiredNotice === 'invalid'
            ? 'Sesi login Anda sudah tidak berlaku atau telah kedaluwarsa. Anda telah ter-logout otomatis, silakan login kembali untuk melanjutkan.'
            : 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Anda telah ter-logout otomatis dan dikembalikan ke menu Overview.'}
        </p>

        <button
          type="button"
          onClick={() => setSessionExpiredNotice(false)}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            border: 'none', background: 'linear-gradient(135deg, #800000 0%, #FF5E00 100%)',
            color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(128, 0, 0, 0.35)',
            transition: 'all 0.2s'
          }}
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}
```

## File: src/components/layout/TopHeaderBar.jsx
```javascript
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { formatBranch } from '../../utils';

export default function TopHeaderBar({
  user,
  isAdmin,
  activeSection = 'dashboard',
  onLoginClick,
  pendingCount = 0,
  notifications = [],
  notificationCount = 0,
  onSelectNotification,
  onToggleMobileSidebar,
  typeDesignFilter = 'ALL',
  setTypeDesignFilter
}) {
  const displayCount = notificationCount || (notifications && notifications.length) || pendingCount || 0;
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
            title={displayCount > 0 ? `${displayCount} pemberitahuan baru` : 'Tidak ada pemberitahuan baru'}
            aria-label={displayCount > 0 ? `${displayCount} pemberitahuan baru` : 'Notifikasi aktivitas'}
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

            {displayCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  color: '#0F172A',
                  fontSize: '11px',
                  fontWeight: 700,
                  lineHeight: 1,
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              >
                {displayCount}
              </span>
            )}
          </button>

          {showNotificationDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '340px',
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
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  {isAdmin ? 'Pemberitahuan Upload' : 'Pemberitahuan Disetujui'}
                </span>
                {displayCount > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                    ({displayCount})
                  </span>
                )}
              </div>

              {notifications && notifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '2px' }}>
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        if (onSelectNotification) onSelectNotification(item);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setShowNotificationDropdown(false);
                          if (onSelectNotification) onSelectNotification(item);
                        }
                      }}
                      style={{
                        padding: '10px 12px',
                        background: '#FFFFFF',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>
                          {item.actLabel}
                        </span>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: item.status === 'verified' ? '#15803D' : '#B45309' }}>
                          {item.status === 'verified' ? 'Disetujui' : 'Upload'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.4, marginBottom: '5px' }}>
                        {isAdmin ? (
                          <>
                            Aktivitas diunggah di proyek <strong style={{ color: '#0F172A' }}>{item.projectName}</strong>
                          </>
                        ) : (
                          <>
                            Kegiatan di proyek <strong style={{ color: '#0F172A' }}>{item.projectName}</strong> telah disetujui admin
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                        <span>
                          Branch {formatBranch(item.branchName)}{item.wok ? ` · ${item.wok}` : ''}
                        </span>
                        <span style={{ color: '#0F172A', fontWeight: 600, fontSize: '11px' }}>
                          Buka di Activity →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 8px', color: '#64748B', fontSize: '12px' }}>
                  Tidak ada pemberitahuan baru
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
```

## File: src/components/layout/TopNav.jsx
```javascript
import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import CekPairingNavItem from './CekPairingNavItem';
import ProgramMenu from './ProgramMenu';
import { SHOW_PROGRAM_MENU } from '../../constants/programs';
import { formatBranch } from '../../utils';

// ─── SINGLE UNIFIED PERSISTENT TOP NAVIGATION BAR (SEAMLESS ACROSS ALL PAGES) ───
// layoutVersion: berubah saat data dimuat ulang → posisi garis indikator menu dihitung ulang
export default function TopNav({
  view, user, isAdmin, layoutVersion,
  goDashboard, goUpload, goAdmin, onLoginClick,
  setShowLoginModal, showProfileModal, setShowProfileModal,
  dynamicMonthsData, setActiveProgramModal
}) {
  const monitoringTabRef = useRef(null);
  const activityTabRef = useRef(null);
  const controlTabRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = useCallback((targetView = view) => {
    let target = null;
    if (targetView === 'dashboard' || targetView === 'branch') {
      target = monitoringTabRef.current;
    } else if (targetView === 'upload') {
      target = activityTabRef.current;
    } else if (targetView === 'admin') {
      target = controlTabRef.current;
    }

    if (target && target.offsetWidth > 0) {
      setIndicatorStyle({
        left: target.offsetLeft,
        width: target.offsetWidth,
        opacity: 1
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [view]);

  useLayoutEffect(() => {
    updateIndicator(view);
    const timer = setTimeout(() => { updateIndicator(view); }, 50);
    const timer2 = setTimeout(() => { updateIndicator(view); }, 200);
    const handleResize = () => { updateIndicator(view); };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [view, layoutVersion, user, updateIndicator]);

  return (
    <nav className="main-top-nav" style={{
      position: 'sticky',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #E2E8F0',
      padding: '16px 48px',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center'
    }}>
      {/* Left: LOGO TELKOMSEL (Pojok Kiri Bar Menu) */}
      <div 
        className="nav-logo-section"
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifySelf: 'start', flexShrink: 0 }} 
        onClick={goDashboard}
        title="Beranda Monitoring Telkomsel"
      >
        <img 
          src="/telkomsel-logo.png" 
          alt="Telkomsel" 
          style={{ 
            height: '24px', 
            width: 'auto', 
            display: 'block', 
            objectFit: 'contain' 
          }} 
        />
      </div>

      {/* Center: Nav Menu Options (Semua menu terlihat langsung tanpa scroll horizontal) */}
      <div className="nav-menu-section" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
        <div 
          className="nav-menu-items" 
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '32px', paddingBottom: '4px' }}
        >

          <button
            ref={monitoringTabRef}
            type="button"
            className="nav-tab-btn"
            onClick={goDashboard}
            style={{
              background: 'none',
              border: 'none',
              color: (view === 'dashboard' || view === 'branch') ? '#800000' : '#64748B',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              padding: '6px 4px',
              outline: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={(e) => { if (view !== 'dashboard' && view !== 'branch') e.currentTarget.style.color = '#64748B'; }}
          >
            MONITORING
          </button>

          <button
            ref={activityTabRef}
            type="button"
            className="nav-tab-btn"
            onClick={goUpload}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'upload' ? '#800000' : '#64748B',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              padding: '6px 4px',
              outline: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { if (view !== 'upload') e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={(e) => { if (view !== 'upload') e.currentTarget.style.color = '#64748B'; }}
          >
            ACTIVITY
          </button>

          <CekPairingNavItem user={user} setShowLoginModal={setShowLoginModal} />

          {isAdmin && (
            <button
              ref={controlTabRef}
              type="button"
              className="nav-tab-btn"
              onClick={goAdmin}
              style={{
                background: 'none',
                border: 'none',
                color: view === 'admin' ? '#800000' : '#64748B',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                padding: '6px 4px',
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => { if (view !== 'admin') e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { if (view !== 'admin') e.currentTarget.style.color = '#64748B'; }}
            >
              CONTROL
            </button>
          )}

          {/* MENU PROGRAM DENGAN 2-TIER SIDE POP-UP DROPDOWN (FLAG: SHOW_PROGRAM_MENU) */}
          {SHOW_PROGRAM_MENU && (
            <ProgramMenu user={user} setShowLoginModal={setShowLoginModal} dynamicMonthsData={dynamicMonthsData} setActiveProgramModal={setActiveProgramModal} />
          )}

          {/* Sliding Solid Telkomsel Red Line Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              height: '2.5px',
              background: '#800000',
              borderRadius: '2px 2px 0 0',
              opacity: indicatorStyle.opacity,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      {/* Right: User Profile Widget / Login Button */}
      <div className="nav-account-section" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="nav-profile-btn"
              onClick={() => setShowProfileModal(!showProfileModal)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: showProfileModal ? '#F1F5F9' : 'rgba(248, 250, 252, 0.8)',
                padding: '6px 14px 6px 6px',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { if (!showProfileModal) { e.currentTarget.style.background = 'transparent'; } }}
            >
              <div 
                className="nav-avatar-circle"
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
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="nav-profile-text-container" style={{ textAlign: 'left' }}>
                <div className="nav-profile-name" style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                  admin
                </div>
                <div className="nav-profile-role" style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                  admin 1
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showProfileModal ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', marginLeft: '4px', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="nav-login-btn"
            onClick={onLoginClick}
            style={{
              padding: '8px 20px',
              borderRadius: '50px',
              background: 'linear-gradient(135deg, #800000 0%, #FF5E00 100%)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(128, 0, 0, 0.3)',
              transition: 'all 0.25s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(128, 0, 0, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(128, 0, 0, 0.3)'; }}
          >
            Masuk / Login
          </button>
        )}
      </div>
    </nav>
  );
}
```

## File: src/components/ActivityStatus.jsx
```javascript
import { memo } from 'react';

/**
 * ActivityStatus Component
 * Komponen tunggal representasi status aktivitas GTM.
 * Varian:
 * - 'selesai': Ikon centang hijau sukses, tanpa tombol upload.
 * - 'belum': Ikon netral/abu, label singkat, tombol "Upload" sekunder/ghost netral (TIDAK merah).
 * - 'proses': Ikon spinner/progress circle.
 * - 'menunggu_verifikasi': Badge amber + tombol "Cek Status" (bukan Upload).
 * - 'gagal': Badge merah + tombol "Perbaiki/Ulang" (satu-satunya varian merah).
 */
const ActivityStatus = memo(function ActivityStatus({
  status = 'belum',
  label,
  count,
  onClick,
  onAction,
  title
}) {
  const handleAction = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onAction) onAction(e);
    else if (onClick) onClick(e);
  };

  // 1. Selesai (Verified) — Ikon centang, hijau sukses, tanpa tombol
  if (status === 'selesai' || status === 'verified') {
    const displayLabel = label || (count > 1 ? `Selesai (${count})` : 'Selesai');
    return (
      <div
        role="status"
        aria-label={title ? `${title}: Selesai dan terverifikasi` : 'Aktivitas selesai dan terverifikasi'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}
        title={title ? `${title}: Selesai & Terverifikasi` : 'Aktivitas telah selesai dan terverifikasi'}
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{displayLabel}</span>
      </div>
    );
  }

  // 2. Menunggu Verifikasi — Badge amber + tombol "Cek Status"
  if (status === 'menunggu_verifikasi' || status === 'upload') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <span
          role="status"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FDE68A',
            whiteSpace: 'nowrap'
          }}
        >
          {label || 'Menunggu Verif'}
        </span>
        <button
          type="button"
          onClick={handleAction}
          aria-label={title ? `Cek status verifikasi ${title}` : 'Cek status verifikasi'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            color: '#B45309',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '26px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF3C7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFBEB'; }}
          title={title ? `${title}: Menunggu verifikasi admin. Klik untuk cek status.` : 'Menunggu verifikasi admin. Klik untuk cek status.'}
        >
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Cek Status</span>
        </button>
      </div>
    );
  }

  // 3. Proses — Ikon spinner + indikator proses
  if (status === 'proses' || status === 'processing') {
    return (
      <div
        role="status"
        aria-label={title ? `${title}: Sedang diproses` : 'Sedang diproses'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
          border: '1px solid #BFDBFE',
          fontSize: '11px',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}
        title={title ? `${title}: Sedang diproses` : 'Sedang diproses'}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        <span>{label || 'Proses'}</span>
      </div>
    );
  }

  // 4. Gagal / Ditolak — Ikon merah + tombol "Perbaiki/Ulang" (Satu-satunya varian merah bahaya)
  if (status === 'gagal' || status === 'rejected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <span
          role="status"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            border: '1px solid #FECACA',
            whiteSpace: 'nowrap'
          }}
        >
          {label || 'Ditolak'}
        </span>
        <button
          type="button"
          onClick={handleAction}
          aria-label={title ? `Perbaiki data kegiatan ${title}` : 'Perbaiki data kegiatan'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#DC2626',
            border: '1px solid #B91C1C',
            color: '#FFFFFF',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '26px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; }}
          title={title ? `${title}: Kegiatan ditolak. Klik untuk perbaiki.` : 'Kegiatan ditolak. Klik untuk perbaiki.'}
        >
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span>Perbaiki</span>
        </button>
      </div>
    );
  }

  // 5. Belum (Default) — Ikon netral/abu, label singkat, tombol "Upload" sekunder/ghost netral (TIDAK merah)
  return (
    <button
      type="button"
      onClick={handleAction}
      aria-label={title ? `Unggah kegiatan ${title}` : 'Unggah kegiatan GTM'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        padding: '5px 10px',
        borderRadius: '6px',
        border: '1px solid #CBD5E1',
        backgroundColor: '#F8FAFC',
        color: '#475569',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        minHeight: '28px',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F1F5F9';
        e.currentTarget.style.color = '#0F172A';
        e.currentTarget.style.borderColor = '#94A3B8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
        e.currentTarget.style.color = '#475569';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      title={title ? `Upload kegiatan ${title}` : 'Klik untuk mengunggah kegiatan GTM'}
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span>Upload</span>
    </button>
  );
});

export default ActivityStatus;
```

## File: src/components/AdminPanel.jsx
```javascript
import { useState, memo } from 'react';
import ReviewModal from './ReviewModal';
import AdminKpiGrid from './admin/AdminKpiGrid';
import AdminActionHubCard from './admin/AdminActionHubCard';
import OdpImportModal from './admin/OdpImportModal';
import PairingImportModal from './admin/PairingImportModal';
import ProgramUploadModal from './admin/ProgramUploadModal';
import ProgramDeleteModal from './admin/ProgramDeleteModal';
import DeleteProgramConfirmModal from './admin/DeleteProgramConfirmModal';
import UploadGuideModal from './admin/UploadGuideModal';
import { useAdminMonitoring } from '../hooks/useAdminMonitoring';
import { useProjectReviewModal } from '../hooks/useProjectReviewModal';
import { useOdpImport } from '../hooks/useOdpImport';
import { usePairingImport } from '../hooks/usePairingImport';
import { useProgramUpload } from '../hooks/useProgramUpload';
import { useProgramDelete } from '../hooks/useProgramDelete';

// Control Panel Admin: KPI + Pusat Pembaruan Database 1 Segmen dengan Dialog Pop-up
const AdminPanel = memo(function AdminPanel({ branches = [], onUpdate, verifyActivity, rejectActivity, deletePhoto }) {
  const [activeModal, setActiveModal] = useState(null); // 'odp' | 'pairing' | 'program' | 'delete' | null
  const [activeInfoModal, setActiveInfoModal] = useState(null); // 'program' | 'odp' | 'pairing' | null

  const monitoring = useAdminMonitoring(branches);
  const { modalData, closeModal } = useProjectReviewModal(branches);
  const odpImport = useOdpImport({ onUpdate });
  const pairingImport = usePairingImport();
  const programUpload = useProgramUpload();
  const programDelete = useProgramDelete();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* 4 KPI Summary Cards matching Dashboard & Activity style */}
      <AdminKpiGrid priorityBranches={monitoring.priorityBranches} stats={monitoring.stats} totalProjects={monitoring.totalProjects} />

      {/* 1 Segmen Terpadu Pusat Pembaruan Database & Program */}
      <AdminActionHubCard
        onOpenModal={(type) => setActiveModal(type)}
      />

      {/* Dialog Pop-up Upload & Kelola Data */}
      <OdpImportModal
        isOpen={activeModal === 'odp'}
        onClose={() => setActiveModal(null)}
        {...odpImport}
        setActiveInfoModal={setActiveInfoModal}
      />

      <PairingImportModal
        isOpen={activeModal === 'pairing'}
        onClose={() => setActiveModal(null)}
        {...pairingImport}
        setActiveInfoModal={setActiveInfoModal}
      />

      <ProgramUploadModal
        isOpen={activeModal === 'program'}
        onClose={() => setActiveModal(null)}
        {...programUpload}
        setActiveInfoModal={setActiveInfoModal}
      />

      <ProgramDeleteModal
        isOpen={activeModal === 'delete'}
        onClose={() => setActiveModal(null)}
        {...programDelete}
      />

      {/* Dialog Konfirmasi Hapus Program */}
      {programDelete.showDeleteConfirmModal && (
        <DeleteProgramConfirmModal {...programDelete} />
      )}

      {/* Review Modal Kegiatan */}
      <ReviewModal
        modalData={modalData}
        closeModal={closeModal}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        deletePhoto={deletePhoto}
      />

      {/* Panduan Upload Modal */}
      {activeInfoModal && (
        <UploadGuideModal activeInfoModal={activeInfoModal} setActiveInfoModal={setActiveInfoModal} />
      )}
    </div>
  );
});

export default AdminPanel;
```

## File: src/components/BranchView.jsx
```javascript
import { useState, useMemo, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch, computeStats, exportProjectsToExcel } from '../utils';

// BranchView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const BranchView = memo(function BranchView({
  branches = [],
  activeBranch,
  goDashboard,
  verifyActivity,
  rejectActivity,
  uploadPhoto,
  deletePhoto
}) {
  const [search, setSearch] = useState('');
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Case-insensitive lookup for activeBranch
  const targetName = (activeBranch || '').toString().trim().toUpperCase();
  const branch = useMemo(() => {
    const list = Array.isArray(branches) ? branches : [];
    if (!targetName) return list[0] || null;
    return list.find(b => (b.name || '').toString().trim().toUpperCase() === targetName) || list[0] || null;
  }, [branches, targetName]);

  const priorityProjects = useMemo(() => {
    if (!branch || !branch.projects) return [];
    return branch.projects.filter(p => {
      const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
      const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
      return isPriority && isGreenfield;
    });
  }, [branch]);

  const priorityBranch = useMemo(() => {
    if (!branch) return null;
    return { ...branch, projects: priorityProjects };
  }, [branch, priorityProjects]);

  const stats = useMemo(() => {
    if (!priorityBranch) return { odpCount: 0, totalUsed: 0, totalPort: 0, occRate: 0, totalProjCount: 0, actVerified: 0, actUploaded: 0 };
    return computeStats([priorityBranch]);
  }, [priorityBranch]);

  // Filter projects by search (bisa cari nama proyek, WOK, atau nama ODP)
  const filteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return priorityProjects.filter(p => 
      !s || 
      p.name.toLowerCase().includes(s) || 
      (p.wok && p.wok.toLowerCase().includes(s)) ||
      (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
    );
  }, [priorityProjects, search]);

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey && branch) {
    const [, pName] = modalKey.split('||');
    const p = (branch.projects || []).find(x => x.name === pName);
    if (p) {
      const odps = p.odps || [];
      const totalAvai = odps.reduce((s, o) => s + (o.avai || 0), 0);
      const totalUsed = odps.reduce((s, o) => s + (o.used || 0), 0);
      const totalPort = odps.reduce((s, o) => s + (o.total || 0), 0);

      modalData = {
        bName: branch.name,
        pName: p.name,
        wok: p.wok,
        projectId: p.id,
        odps,
        totalAvai,
        totalUsed,
        totalPort,
        odpCount: odps.length,
        activities: p.activities || []
      };
    }
  }

  if (!branch) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', margin: '24px 0' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
          Data Branch "{activeBranch}" Tidak Ditemukan
        </div>
        <button
          type="button"
          onClick={goDashboard}
          style={{ padding: '8px 20px', borderRadius: '8px', background: '#800000', color: '#FFF', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: '12px', fontSize: '13px' }}
        >
          Kembali ke Monitoring
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Header Title */}
      <div className="page-title-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: '28px', fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          Branch {formatBranch(branch.name)}
        </h1>
      </div>

      {/* ─── KPI SUMMARY GRID (3 CARDS MATCHING ACTIVITY VIEW STYLE) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Total Proyek Greenfield */}
        <div
          className="saas-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: 'none',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Total Proyek Greenfield
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {priorityProjects.length.toLocaleString('id-ID')}
            <span
              style={{
                fontSize: '20px',
                fontWeight: 500,
                color: '#64748B',
                letterSpacing: '-0.2px',
                marginLeft: '6px'
              }}
            >
              Proyek
            </span>
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            OCC &lt; 35% &amp; ODP &gt; 1
          </div>
        </div>

        {/* Card 2: Total ODP & Kapasitas */}
        <div
          className="saas-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: 'none',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Total ODP &amp; Kapasitas
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {stats.odpCount.toLocaleString('id-ID')}
            <span
              style={{
                fontSize: '20px',
                fontWeight: 500,
                color: '#64748B',
                letterSpacing: '-0.2px',
                marginLeft: '6px'
              }}
            >
              ODP
            </span>
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginRight: '4px'
              }}
            >
              {stats.totalUsed.toLocaleString('id-ID')}
            </span>
            / {stats.totalPort.toLocaleString('id-ID')} port ({stats.occRate}%)
          </div>
        </div>

        {/* Card 3: Status Verifikasi Aktivitas */}
        <div
          className="saas-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: 'none',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Status Verifikasi Aktivitas
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {stats.actVerified.toLocaleString('id-ID')}
            <span
              style={{
                fontSize: '20px',
                fontWeight: 500,
                color: '#64748B',
                letterSpacing: '-0.2px',
                marginLeft: '6px'
              }}
            >
              Terverifikasi
            </span>
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: stats.actUploaded > 0 ? '#B45309' : '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginRight: '4px'
              }}
            >
              {stats.actUploaded.toLocaleString('id-ID')}
            </span>
            Menunggu Verifikasi
          </div>
        </div>
      </div>

      {/* ─── CONTROLS BAR (EXPORT EXCEL & SEARCH INPUT) ─── */}
      <div className="controls-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Tombol Export Excel */}
        <button
          type="button"
          className="control-btn-mobile"
          onClick={() => exportProjectsToExcel([branch], branch.name)}
          aria-label={`Ekspor data branch ${formatBranch(branch.name)} ke format file Excel (.xlsx)`}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#0F172A',
            fontWeight: 600,
            fontSize: '13px',
            padding: '0 18px',
            height: '42px',
            borderRadius: '10px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#94A3B8';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          title="Export Data Branch ke File Excel (.xlsx)"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Export Excel</span>
        </button>

        {/* Search Input with Icon */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            aria-hidden="true"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="search-input-field"
            placeholder={`Cari proyek, WOK, atau ODP di branch ${formatBranch(branch.name)}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: '42px',
              paddingLeft: '38px',
              paddingRight: search ? '36px' : '16px',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              fontSize: '13px',
              width: '100%',
              boxSizing: 'border-box'
            }}
            aria-label={`Cari proyek di branch ${formatBranch(branch.name)}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus kata kunci pencarian"
              style={{
                position: 'absolute',
                right: '10px',
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Project Table */}
      {filteredProjects.length > 0 ? (
        <ProjectTable
          projects={filteredProjects}
          branchName={branch.name}
          onReview={openModal}
          uploadPhoto={uploadPhoto}
          onResetSearch={() => setSearch('')}
        />
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
            Tidak ada proyek yang sesuai kriteria
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '420px', lineHeight: 1.5 }}>
            Tidak ditemukan proyek dengan kata kunci pencarian di branch {formatBranch(branch.name)}.
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                marginTop: '6px',
                padding: '8px 18px',
                background: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Reset Pencarian
            </button>
          )}
        </div>
      )}

      <ReviewModal
        modalData={modalData}
        closeModal={closeModal}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        deletePhoto={deletePhoto}
      />
    </div>
  );
});

export default BranchView;
```

## File: src/components/CekPairingPopover.jsx
```javascript
import { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { usePairingSearch } from '../hooks/usePairingSearch';

const CekPairingPopover = memo(function CekPairingPopover({ isOpen, coords, onClose }) {
  const [query, setQuery] = useState('');
  const pairingSearch = usePairingSearch();
  const loading = pairingSearch.isPending;
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!isOpen && !isModalOpen && !showGuide) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showGuide) {
          setShowGuide(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        } else if (isOpen) {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isModalOpen, showGuide, onClose]);

  // Klik di luar untuk menutup hint panduan penggunaan
  useEffect(() => {
    if (!showGuide) return;
    const handleClickOutsideGuide = (e) => {
      if (!e.target.closest('[data-pairing-hint]')) {
        setShowGuide(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideGuide);
    return () => document.removeEventListener('mousedown', handleClickOutsideGuide);
  }, [showGuide]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQ = query.trim();

    if (!cleanQ || cleanQ.length < 6) {
      setError('Kata kunci terlalu umum. Masukkan minimal 6 karakter yang akurat.');
      setResults([]);
      setIsModalOpen(false);
      return;
    }

    setError(null);

    try {
      const data = await pairingSearch.mutateAsync(cleanQ);

      if (!data.results || data.results.length === 0) {
        setError(`Data pairing tidak ditemukan untuk kata kunci "${cleanQ}". Pastikan penulisan ID atau nomor telepon sudah sesuai.`);
        setResults([]);
        setIsModalOpen(false);
      } else {
        const grouped = groupPairingRecordsByParent(data.results);
        setResults(grouped);
        setSelectedIdx(0);
        setIsModalOpen(true);
        onClose(); // Tutup dropdown popover saat modal hasil dibuka
      }
    } catch (err) {
      setError(err.message || 'Gagal melakukan pencarian.');
      setResults([]);
      setIsModalOpen(false);
    }
  };

  const formatSourcePerdana = (msisdn, sourceStr) => {
    if (!msisdn) return '-';
    const cleanMsisdn = String(msisdn).trim();
    if (!cleanMsisdn) return '-';

    if (!sourceStr || typeof sourceStr !== 'string') return cleanMsisdn;
    const cleanSource = sourceStr.trim();

    if (!cleanSource || /^(0|\\N|N\/A|-)$/i.test(cleanSource)) {
      return cleanMsisdn;
    }

    return `${cleanMsisdn} (${cleanSource})`;
  };

  const groupPairingRecordsByParent = (rawRecords) => {
    if (!rawRecords || rawRecords.length === 0) return [];

    const groupedMap = new Map();

    rawRecords.forEach(rec => {
      const key = (rec.bb_id || rec.msisdn_parent || rec.order_id || JSON.stringify(rec)).trim().toLowerCase();

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          bb_id: rec.bb_id,
          msisdn_parent: rec.msisdn_parent,
          source_perdana_parent: rec.source_perdana_parent,
          product_commercial_name: rec.product_commercial_name,
          activation_date_ih: rec.activation_date_ih,
          activation_date_parent: rec.activation_date_parent,
          city: rec.city,
          region: rec.region,
          area: rec.area,
          cluster: rec.cluster,
          sto: rec.sto,
          tsel_id_ih: rec.tsel_id_ih,
          tsel_id_mobile_parent: rec.tsel_id_mobile_parent,
          order_id: rec.order_id,
          children: []
        });
      }

      const group = groupedMap.get(key);

      for (let i = 1; i <= 6; i++) {
        const childNum = rec[`msisdn_child${i}`];
        const childDate = rec[`activation_date_child${i}`];
        const childTselId = rec[`tsel_id_mobile_child${i}`];
        const childSource = rec[`source_perdana_child${i}`];

        if (childNum) {
          const exists = group.children.some(c => c.msisdn === childNum);
          if (!exists) {
            group.children.push({
              msisdn: childNum,
              date: childDate || '',
              tselId: childTselId || '',
              sourcePerdana: childSource || ''
            });
          }
        }
      }
    });

    return Array.from(groupedMap.values());
  };

  const activeRecord = results[selectedIdx] || null;

  const buildTransposedFields = (rec) => {
    if (!rec) return [];

    const fields = [
      { label: 'bb_id', val: rec.bb_id },
      { label: 'msisdn_parent', val: formatSourcePerdana(rec.msisdn_parent, rec.source_perdana_parent) },
    ];

    if (rec.children && rec.children.length > 0) {
      rec.children.forEach((c, idx) => {
        fields.push({
          label: `msisdn_child${idx + 1}`,
          val: formatSourcePerdana(c.msisdn, c.sourcePerdana)
        });
      });
    } else {
      fields.push({ label: 'msisdn_child1', val: '-' });
    }

    fields.push({ label: 'activation_date_ih', val: rec.activation_date_ih });
    fields.push({ label: 'activation_date_parent', val: rec.activation_date_parent });

    if (rec.children && rec.children.length > 0) {
      rec.children.forEach((c, idx) => {
        fields.push({ label: `activation_date_child${idx + 1}`, val: c.date });
      });
    } else {
      fields.push({ label: 'activation_date_child1', val: '-' });
    }

    fields.push({ label: 'city', val: rec.city });
    fields.push({ label: 'sto', val: rec.sto });
    fields.push({ label: 'order_id', val: rec.order_id });

    return fields;
  };

  const transposedFields = buildTransposedFields(activeRecord);

  return (
    <>
      {/* ─── DROPDOWN SEARCH POPOVER (Mounted to document.body via createPortal) ─── */}
      {isOpen && coords && coords.top > 0 && createPortal(
        <div
          className="pairing-fixed-dropdown fade-in"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translateX(-50%)',
            width: '390px',
            maxWidth: 'calc(100vw - 24px)',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 8px 16px -4px rgba(15, 23, 42, 0.08)',
            padding: '20px 22px',
            zIndex: 999999,
            animation: 'programDropdownFadeIn 0.15s ease-out',
            fontFamily: 'var(--font-body)',
            color: '#334155'
          }}
        >
          {/* Header Popover */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>
                  Pencarian Data Pairing
                </h3>

                {/* Tanda Hint 'i' Panduan Penggunaan yang Disembunyikan */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} data-pairing-hint>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGuide((prev) => !prev);
                    }}
                    aria-label="Lihat panduan penggunaan pencarian pairing"
                    title="Panduan penggunaan pencarian"
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: showGuide ? '#EFF6FF' : '#FFFFFF',
                      color: showGuide ? '#1D4ED8' : '#64748B',
                      border: showGuide ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </button>

                  {/* Popover Panduan Penggunaan */}
                  {showGuide && (
                    <div
                      role="tooltip"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        zIndex: 60,
                        width: '320px',
                        maxWidth: 'calc(100vw - 36px)',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
                        padding: '14px 16px',
                        boxSizing: 'border-box',
                        fontFamily: 'var(--font-body)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '12.5px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                          Panduan Penggunaan
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowGuide(false);
                          }}
                          aria-label="Tutup panduan"
                          style={{
                            border: 'none',
                            background: '#F1F5F9',
                            color: '#64748B',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#E2E8F0';
                            e.currentTarget.style.color = '#0F172A';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F1F5F9';
                            e.currentTarget.style.color = '#64748B';
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#475569', lineHeight: 1.5 }}>
                        <li>Masukkan <strong style={{ color: '#0F172A' }}>bb_id</strong>, nomor HP (<strong style={{ color: '#0F172A' }}>08...</strong> / <strong style={{ color: '#0F172A' }}>62...</strong>), atau <strong style={{ color: '#0F172A' }}>order_id</strong> lengkap.</li>
                        <li>Penulisan harus akurat sesuai data (minimal 6 karakter).</li>
                        <li>Tekan <strong style={{ color: '#0F172A' }}>Enter</strong> atau klik tombol <strong style={{ color: '#800000' }}>Cari Data Pairing</strong>.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                Cek relasi pelanggan Telkomsel One
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu pencarian pairing"
              style={{
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E2E8F0';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                aria-label="Kata kunci pencarian pairing"
                placeholder="Cari bb_id, msisdn, atau order_id..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError(null);
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, background 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#800000';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
              />
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '12px', fontWeight: 500, lineHeight: 1.45 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: 'none',
                background: loading || !query.trim() ? '#E2E8F0' : '#800000',
                color: loading || !query.trim() ? '#94A3B8' : '#FFFFFF',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading || !query.trim() ? 'none' : '0 1px 2px rgba(128, 0, 0, 0.2)',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!loading && query.trim()) {
                  e.currentTarget.style.background = '#990000';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && query.trim()) {
                  e.currentTarget.style.background = '#800000';
                }
              }}
            >
              {loading ? 'Mencari Data Pairing...' : 'Cari Data Pairing'}
            </button>
          </form>
        </div>,
        document.body
      )}

      {/* ─── TRANSPOSED TELKOMSEL RESULT POP-UP MODAL (Mounted to document.body via createPortal) ─── */}
      {isModalOpen && activeRecord && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pairing-modal-title"
          className="pairing-transposed-modal"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
        >
          <div
            className="pairing-transposed-modal-card fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              margin: 'auto',
              fontFamily: 'var(--font-body)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
              <div>
                <h3 id="pairing-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>
                  Hasil Deteksi Pairing
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Detail data relasi pelanggan Telkomsel One
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup dialog hasil pairing"
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  color: '#64748B',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E2E8F0';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                ✕
              </button>
            </div>

            {/* Multiple Results Selector (if results count > 1) */}
            {results.length > 1 && (
              <div style={{ padding: '10px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>
                  Ditemukan {results.length} data cocok ({selectedIdx + 1} dari {results.length}):
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={selectedIdx === 0}
                    onClick={() => setSelectedIdx(prev => prev - 1)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: selectedIdx === 0 ? 'not-allowed' : 'pointer',
                      opacity: selectedIdx === 0 ? 0.5 : 1
                    }}
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={selectedIdx === results.length - 1}
                    onClick={() => setSelectedIdx(prev => prev + 1)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: selectedIdx === results.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: selectedIdx === results.length - 1 ? 0.5 : 1
                    }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Transposed Table Telkomsel Style */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', fontSize: '12.5px' }}>
                <tbody>
                  {transposedFields.map((f, i) => (
                    <tr key={i}>
                      {/* Left Header Column - Maroon Telkomsel */}
                      <td
                        style={{
                          width: '40%',
                          padding: '10px 14px',
                          background: '#800000',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '12px',
                          fontFamily: 'var(--font-body)',
                          letterSpacing: '-0.1px',
                          borderTopLeftRadius: '8px',
                          borderBottomLeftRadius: '8px',
                          verticalAlign: 'middle'
                        }}
                      >
                        {f.label}
                      </td>

                      {/* Right Value Column - Clean Crisp Card */}
                      <td
                        style={{
                          padding: '10px 14px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderLeft: 'none',
                          borderTopRightRadius: '8px',
                          borderBottomRightRadius: '8px',
                          color: '#0F172A',
                          fontWeight: 500,
                          wordBreak: 'break-all',
                          verticalAlign: 'middle',
                          fontFamily: 'var(--font-body)'
                        }}
                      >
                        {f.val || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '8px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#800000',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(128, 0, 0, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#990000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#800000';
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

export default CekPairingPopover;
```

## File: src/components/ConfirmDeleteModal.jsx
```javascript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDeleteModal({ isOpen, data, onConfirm, onCancel, isDeleting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !data) return null;

  const projectName = data.projectName || data.pName;
  const actLabel = data.actLabel;
  const photoIndex = data.photoIndex;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={(e) => { e.stopPropagation(); if (!isDeleting) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100006,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          boxSizing: 'border-box',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Trash / Delete Icon Badge */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#FFE4E6',
            border: '1px solid #FDA4AF',
            color: '#E11D48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.12)'
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h3
          id="confirm-delete-title"
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#0F172A',
            margin: '0 0 10px 0',
            fontFamily: "var(--font-heading)"
          }}
        >
          Hapus Kegiatan Ini?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
            fontWeight: 500
          }}
        >
          {data.actKey === 'rekrutmen_sf'
            ? 'Apakah Anda yakin ingin menghapus data kegiatan ini? Data Kode SF ini akan terhapus permanen dari sistem.'
            : 'Apakah Anda yakin ingin menghapus data/foto kegiatan ini? Kegiatan yang terhapus akan terhapus permanen dari sistem.'
          }
        </p>

        {/* Info Card */}
        {(projectName || actLabel) && (
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '22px',
              border: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {projectName && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Proyek:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{projectName}</strong>
              </div>
            )}
            {actLabel && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Kegiatan:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{actLabel}</strong>
                {typeof photoIndex === 'number' && data.actKey !== 'rekrutmen_sf' && ` (Foto #${photoIndex + 1})`}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #BE123C',
              background: '#E11D48',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)',
              opacity: isDeleting ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

## File: src/components/ConfirmRejectModal.jsx
```javascript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmRejectModal({ isOpen, data, onConfirm, onCancel, isRejecting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRejecting) {
        onCancel?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRejecting, onCancel]);

  if (!isOpen || !data) return null;

  const projectName = data.projectName || data.pName;
  const actLabel = data.actLabel;
  const photoIndex = data.photoIndex;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-reject-title"
      onClick={(e) => { e.stopPropagation(); if (!isRejecting) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100005,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          boxSizing: 'border-box',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Warning Badge Icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.12)'
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h3
          id="confirm-reject-title"
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#0F172A',
            margin: '0 0 10px 0',
            fontFamily: "var(--font-heading)"
          }}
        >
          Tolak Verifikasi Kegiatan?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
            fontWeight: 500
          }}
        >
          {data.actKey === 'rekrutmen_sf'
            ? 'Apakah Anda yakin ingin menolak verifikasi ini? Data Kode SF tersebut akan dihapus dan user perlu memasukkan data ulang.'
            : 'Apakah Anda yakin ingin menolak verifikasi ini? Foto tersebut akan dihapus dan user perlu melakukan upload ulang.'
          }
        </p>

        {/* Info card */}
        {(projectName || actLabel) && (
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '22px',
              border: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {projectName && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Proyek:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{projectName}</strong>
              </div>
            )}
            {actLabel && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Kegiatan:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{actLabel}</strong>
                {typeof photoIndex === 'number' && data.actKey !== 'rekrutmen_sf' && ` (Foto #${photoIndex + 1})`}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRejecting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isRejecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRejecting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #B91C1C',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isRejecting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              opacity: isRejecting ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            {isRejecting ? 'Menolak...' : 'Ya, Tolak'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

## File: src/components/ConfirmSubmitModal.jsx
```javascript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmSubmitModal({ data, onConfirm, onCancel, isSubmitting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!data) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, isSubmitting, onCancel]);

  if (!data) return null;
  const { projectName, actLabel } = data;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-submit-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', boxSizing: 'border-box'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'relative', width: '100%', maxWidth: '420px',
          background: '#FFFFFF', borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '28px 24px', boxSizing: 'border-box',
          textAlign: 'center', animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Badge Icon */}
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: '#FFF7ED',
          border: '1px solid #FED7AA', color: '#FF5E00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h3 id="confirm-submit-title" style={{ fontSize: '19px', fontWeight: 600, color: '#0F172A', margin: '0 0 10px 0', fontFamily: "var(--font-heading)" }}>
          Konfirmasi Pengiriman
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px 0', fontWeight: 500 }}>
          Apakah Anda ingin menambahkan foto di <strong style={{ color: '#0F172A' }}>{actLabel}</strong> pada proyek <strong style={{ color: '#0F172A' }}>"{projectName}"</strong>?
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid #E2E8F0', background: '#F8FAFC',
              color: '#475569', fontSize: '13.5px', fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid #991B1B', background: '#800000',
              color: '#FFFFFF', fontSize: '13.5px', fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(128, 0, 0, 0.25)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

## File: src/components/Dashboard.jsx
```javascript
import { memo, useState } from 'react';
import HeroOccupancyCard from './dashboard/HeroOccupancyCard';
import RegionalMetricsSummaryCard from './dashboard/RegionalMetricsSummaryCard';
import PortDistributionChartCard from './dashboard/PortDistributionChartCard';
import OdpStatusDonutCard from './dashboard/OdpStatusDonutCard';
import BranchProjectsPieCard from './dashboard/BranchProjectsPieCard';
import ExecutiveSummarySection from './dashboard/ExecutiveSummarySection';
import RightWidgetPanel from './dashboard/RightWidgetPanel';
import GtmExecutionInsightCard from './dashboard/GtmExecutionInsightCard';
import { useInView } from '../hooks/useInView';

// ─── HALAMAN MONITORING (DASHBOARD) SAAS TOTAL REDESIGN ───
const Dashboard = memo(function Dashboard({
  branches,
  goBranch,
  kpi,
  statusChips,
  ranking,
  isAdmin
}) {
  // In-view observer triggers for smooth entry animations
  const [refTopRow, inViewTopRow] = useInView({ threshold: 0.1, triggerOnce: true });
  const [refChartsRow, inViewChartsRow] = useInView({ threshold: 0.08, triggerOnce: true });
  const [refBottomGrid, inViewBottomGrid] = useInView({ threshold: 0.08, triggerOnce: true });

  // Search & Scope Filter State
  const [scopeFilter, setScopeFilter] = useState('ALL');

  const safeKpi = kpi || {
    occRate: 0,
    totalUsed: 0,
    totalPort: 0,
    totalAvai: 0,
    odpCount: 0,
    actCompletionPct: 0,
    actVerified: 0,
    actUploaded: 0,
    actPending: 0,
    actBelum: 0,
    gapWoW: null
  };
  const safeStatusChips = statusChips || [];
  const safeRanking = ranking || [];

  // Handle Review Branch priority action
  const handleReviewPriority = () => {
    // Purwokerto is lowest occupancy branch in Jateng & DIY
    if (goBranch) {
      goBranch('Purwokerto');
    }
  };

  return (
    <div
      className="dashboard-saas-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        padding: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* ─── BARIS ATAS (ROW 1): HERO OKUPANSI + SECTION 1 (METRIK UTAMA REGIONAL) ─── */}
      <section
        ref={refTopRow}
        id="top-analytics-row"
        aria-label="Overview Metrik Regional"
        className="dashboard-top-row"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          alignItems: 'stretch',
          width: '100%'
        }}
      >
        {/* A. Hero Card Kiri (Okupansi Regional Jateng & DIY) */}
        <HeroOccupancyCard
          safeKpi={safeKpi}
          onReviewBranch={handleReviewPriority}
          isAdmin={isAdmin}
          isInView={inViewTopRow}
        />

        {/* B. Section 1: Port Tersedia, Total ODP Terpantau, Verifikasi Kegiatan */}
        <RegionalMetricsSummaryCard
          safeKpi={safeKpi}
          safeStatusChips={safeStatusChips}
          isInView={inViewTopRow}
        />
      </section>

      {/* ─── BARIS TENGAH (ROW 2): SECTION 2 (DISTRIBUSI UTILISASI PORT PER BRANCH & WOK) ─── */}
      <section
        id="port-distribution-row"
        aria-label="Distribusi Utilisasi Kapasitas Port per Branch dan WOK"
        style={{ width: '100%' }}
      >
        <PortDistributionChartCard
          ranking={safeRanking}
          branches={branches}
          isInView={inViewTopRow}
          onSelectBranch={(branchName) => {
            if (goBranch) goBranch(branchName);
          }}
        />
      </section>

      {/* ─── BARIS ANALITIK PROPORSI (ROW 3: DONUT STATUS ODP & PIE SEBARAN PROYEK) ─── */}
      <section
        ref={refChartsRow}
        id="distribution-charts-row"
        aria-label="Distribusi Kategori ODP dan Sebaran Proyek per Branch"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          width: '100%'
        }}
      >
        <OdpStatusDonutCard
          statusChips={safeStatusChips}
          totalOdp={safeKpi.odpCount}
          isInView={inViewChartsRow}
        />
        <BranchProjectsPieCard
          ranking={safeRanking}
          branches={branches}
          goBranch={goBranch}
          isInView={inViewChartsRow}
        />
      </section>

      {/* ─── GRID BAWAH TERBAGI DUA KOLOM (ROW 4: MAIN CONTENT VS SIDEBAR WIDGET) ─── */}
      <section
        ref={refBottomGrid}
        id="bottom-content-grid"
        aria-label="Matriks Executive Summary dan Ranking Branch"
        className="dashboard-bottom-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '20px',
          alignItems: 'stretch',
          width: '100%'
        }}
      >
        {/* Kolom Kiri (~68%): Matriks Executive Summary */}
        <div style={{ minWidth: 0, height: '100%' }}>
          <ExecutiveSummarySection
            branches={branches}
            scopeFilter={scopeFilter}
            onScopeChange={setScopeFilter}
            branchList={safeRanking}
            isInView={inViewBottomGrid}
          />
        </div>

        {/* Kolom Kanan (~32%): Ranking Branch + 5 Pilar Aktivitas GTM */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          <RightWidgetPanel
            ranking={safeRanking}
            goBranch={goBranch}
            isInView={inViewBottomGrid}
          />
          <GtmExecutionInsightCard
            branches={branches}
            isInView={inViewBottomGrid}
          />
        </div>
      </section>
    </div>
  );
});

export default Dashboard;
```

## File: src/components/LandingPage.jsx
```javascript
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
        minHeight: '100dvh',
        height: '100dvh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundImage: "url('/landing-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'var(--font-body)',
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
            fontFamily: 'var(--font-heading)',
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
            backgroundColor: '#800000',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '11px 44px',
            fontSize: '17px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'none', // Strictly no glow effect
            fontFamily: 'var(--font-body)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease, transform 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#660000';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#800000';
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
```

## File: src/components/ProgramViewerModal.jsx
```javascript
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { API_BASE_URL, authFetch } from '../apiConfig';

export default function ProgramViewerModal({ program, monthLabel, onClose, isAdmin, onDeleteSuccess }) {
  // Normalize multi-image slides from program.images or fallback to single imageUrl
  const initialSlides = (Array.isArray(program?.images) && program.images.length > 0)
    ? program.images
    : (program?.imageUrl ? [{ id: 'legacy_0', imageUrl: program.imageUrl, detailUrl: program.detailUrl || '', scannedLink: program.scannedLink || null }] : []);

  const [slides, setSlides] = useState(initialSlides);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Sync if program prop updates
  useEffect(() => {
    const updated = (Array.isArray(program?.images) && program.images.length > 0)
      ? program.images
      : (program?.imageUrl ? [{ id: 'legacy_0', imageUrl: program.imageUrl, detailUrl: program.detailUrl || '', scannedLink: program.scannedLink || null }] : []);
    setSlides(updated);
    setCurrentSlideIndex(0);
  }, [program]);

  const currentSlide = slides[currentSlideIndex] || slides[0] || {};
  const activeImageUrl = currentSlide.imageUrl || program?.imageUrl || null;
  const activeDetailUrl = currentSlide.detailUrl !== undefined ? currentSlide.detailUrl : (program?.detailUrl || '');

  // Viewport Zoom and Pan States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Program / Slide Delete States
  const [deleteTargetType, setDeleteTargetType] = useState('PROGRAM'); // 'PROGRAM' or 'SLIDE'
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Option Dropdown State (Titik Tiga)
  const [isOptionOpen, setIsOptionOpen] = useState(false);
  const optionMenuRef = useRef(null);

  // Close option dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionMenuRef.current && !optionMenuRef.current.contains(e.target)) {
        setIsOptionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Slide navigation handlers
  const handleSlideChange = (newIdx) => {
    if (newIdx >= 0 && newIdx < slides.length) {
      setCurrentSlideIndex(newIdx);
      // Reset zoom & pan position on slide change
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    const newIdx = currentSlideIndex > 0 ? currentSlideIndex - 1 : slides.length - 1;
    handleSlideChange(newIdx);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    const newIdx = currentSlideIndex < slides.length - 1 ? currentSlideIndex + 1 : 0;
    handleSlideChange(newIdx);
  };

  // Keyboard navigation: Escape to close, ArrowLeft / ArrowRight to switch slides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showConfirmDelete) {
          setShowConfirmDelete(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (slides.length > 1) handlePrevSlide();
      } else if (e.key === 'ArrowRight') {
        if (slides.length > 1) handleNextSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, slides.length, currentSlideIndex, showConfirmDelete]);

  // Handle Delete (Entire Program or Current Slide)
  const handleExecuteDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const targetProgramName = program?.sheetName || program?.name || '';
      const payload = {
        monthLabel: monthLabel || 'Agustus 2026',
        programName: targetProgramName
      };

      if (deleteTargetType === 'SLIDE' && currentSlide?.id) {
        payload.imageId = currentSlide.id;
      }

      const res = await authFetch(`${API_BASE_URL}/api/admin/programs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        throw new Error(`Server error (${res.status}): ${textErr.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Gagal memproses penghapusan.');
      }

      if (deleteTargetType === 'SLIDE' && slides.length > 1) {
        const newSlides = slides.filter((_, idx) => idx !== currentSlideIndex);
        setSlides(newSlides);
        setCurrentSlideIndex(prev => (prev >= newSlides.length ? newSlides.length - 1 : prev));
        setShowConfirmDelete(false);
        setIsDeleting(false);
        if (onDeleteSuccess) onDeleteSuccess();
      } else {
        if (onDeleteSuccess) {
          onDeleteSuccess();
        } else if (onClose) {
          onClose();
        }
      }
    } catch (err) {
      console.error('Delete error in modal:', err);
      setDeleteError(err.message || 'Gagal menghapus data.');
      setIsDeleting(false);
    }
  };

  const containerRef = useRef(null);
  const tableRef = useRef(null);

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.1, 2.5));
    } else {
      setScale(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  // Drag / Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Export to PNG Image or direct image download
  const handleDownloadPNG = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (activeImageUrl) {
        const res = await fetch(activeImageUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const slideSuffix = slides.length > 1 ? `_slide_${currentSlideIndex + 1}` : '';
        const filename = `${(program.sheetName || 'Program').replace(/\s+/g, '_')}${slideSuffix}_${(monthLabel || '').replace(/\s+/g, '_')}.png`;
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else if (tableRef.current) {
        const currentScale = scale;
        const currentPos = { ...position };

        setScale(1);
        setPosition({ x: 0, y: 0 });

        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(tableRef.current, {
          backgroundColor: '#FFFFFF',
          scale: 2,
          useCORS: true,
          logging: false
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const filename = `${(program.sheetName || 'Program').replace(/\s+/g, '_')}_${(monthLabel || '').replace(/\s+/g, '_')}.png`;

        link.href = image;
        link.download = filename;
        link.click();

        setScale(currentScale);
        setPosition(currentPos);
      }
    } catch (err) {
      console.error('Failed to export program image:', err);
      alert('Gagal mendownload gambar program. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!program) return null;

  const headers = program.headers || [];
  const rows = program.rows || [];
  const summaryRow = program.summaryRow;

  // Format cell value smartly for Excel tables
  const formatCellValue = (headerName, val) => {
    if (val === null || val === undefined || val === '') return '-';

    const header = String(headerName || '').toUpperCase();
    const strVal = String(val).trim();

    if (strVal === 'PASS') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '50px', background: '#DCFCE7', color: '#166534', fontWeight: 800, fontSize: '11px' }}>
          PASS
        </span>
      );
    }
    if (strVal === 'NOT PASS') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '50px', background: '#FEE2E2', color: '#991B1B', fontWeight: 800, fontSize: '11px' }}>
          NOT PASS
        </span>
      );
    }

    if (
      header.includes('%') ||
      header.includes('ACH') ||
      header.includes('MOM') ||
      header.includes('OCC')
    ) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const pct = num <= 1 && num >= -1 ? Math.round(num * 1000) / 10 : Math.round(num * 10) / 10;
        const color = pct > 0 && (header.includes('MOM') || header.includes('ACH')) ? '#16A34A' : pct < 0 && header.includes('MOM') ? '#DC2626' : 'inherit';
        return <span style={{ color, fontWeight: 700 }}>{pct > 0 && header.includes('MOM') ? `+${pct}%` : `${pct}%`}</span>;
      }
    }

    if (header.includes('INSENTIF')) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        return `Rp ${num.toLocaleString('id-ID')}`;
      }
    }

    const num = parseFloat(val);
    if (!isNaN(num) && typeof val === 'number') {
      return Number.isInteger(num) ? num.toLocaleString('id-ID') : num.toFixed(2);
    }

    return strVal;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-in-out',
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* TOP FLOATING BAR: Left (Program Name & Slide Badge) & Right (Actions) */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '24px',
          right: '24px',
          zIndex: 100002,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none'
        }}
      >
        {/* Left: Program Info Badge */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '50px',
            padding: '8px 18px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FF5E00',
              boxShadow: '0 0 10px #FF5E00'
            }}
          />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '13.5px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.1px' }}>
            {program.sheetName || 'Program Tracking'}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>
            • {monthLabel || 'Agustus 2026'}
          </span>
          {slides.length > 1 && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                color: '#60A5FA',
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '2px 8px',
                borderRadius: '20px',
                border: '1px solid rgba(96, 165, 250, 0.3)'
              }}
            >
              Slide {currentSlideIndex + 1}/{slides.length}
            </span>
          )}
        </div>

        {/* Right: Three Dots Menu + Close Button */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* THREE-DOT OPTION BUTTON */}
          <div ref={optionMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOptionOpen(prev => !prev);
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)'}
              title="Opsi Program"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </button>

            {/* Option Dropdown Menu */}
            {isOptionOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '52px',
                  right: '0',
                  width: '240px',
                  background: 'rgba(15, 23, 42, 0.94)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.55)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeIn 0.15s ease-out',
                  fontFamily: 'var(--font-body)',
                  zIndex: 100010
                }}
              >
                {/* Opsi 1: Link Detail Program (Spesifik per Slide) */}
                {activeDetailUrl ? (
                  <a
                    href={activeDetailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOptionOpen(false)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#60A5FA',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>Link Detail Program</span>
                      {slides.length > 1 && (
                        <span style={{ fontSize: '10.5px', color: '#93C5FD', fontWeight: 600 }}>
                          (Slide {currentSlideIndex + 1})
                        </span>
                      )}
                    </div>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionOpen(false);
                      const slideInfo = slides.length > 1 ? `untuk slide ke-${currentSlideIndex + 1}` : '';
                      alert(`📌 Link detail resmi ${slideInfo} pada program "${program.sheetName || program.name || 'ini'}" belum dikonfigurasi.`);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#94A3B8',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>Link Detail Program</span>
                      {slides.length > 1 && (
                        <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                          (Slide {currentSlideIndex + 1} - Tidak Ada)
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* Opsi 2: Download Gambar */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOptionOpen(false);
                    handleDownloadPNG();
                  }}
                  disabled={isDownloading}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>
                    {isDownloading
                      ? 'Memproses...'
                      : slides.length > 1
                      ? `Download Gambar (Slide ${currentSlideIndex + 1})`
                      : 'Download Gambar'}
                  </span>
                </button>

                {/* Opsi Admin: Hapus Slide Ini (hanya jika multi-slide) */}
                {isAdmin && slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionOpen(false);
                      setDeleteTargetType('SLIDE');
                      setShowConfirmDelete(true);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#FB7185',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      width: '100%',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Hapus Slide Ini ({currentSlideIndex + 1})</span>
                  </button>
                )}

                {/* Opsi Admin: Hapus Seluruh Program */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionOpen(false);
                      setDeleteTargetType('PROGRAM');
                      setShowConfirmDelete(true);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#EF4444',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      width: '100%',
                      borderTop: slides.length <= 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Hapus Seluruh Program</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CLOSE BUTTON (✕) */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#800000';
              e.currentTarget.style.borderColor = '#800000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            title="Tutup (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* MULTI-SLIDE NAVIGATION CONTROLS (LEFT / RIGHT BUTTONS & BOTTOM DOTS) */}
      {slides.length > 1 && (
        <>
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevSlide();
            }}
            style={{
              position: 'fixed',
              left: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 100003,
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(128, 0, 0, 0.95)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            title="Slide Sebelumnya (Panah Kiri)"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNextSlide();
            }}
            style={{
              position: 'fixed',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 100003,
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(128, 0, 0, 0.95)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            title="Slide Berikutnya (Panah Kanan)"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Bottom Floating Pagination Dots Pill */}
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100003,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50px',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
              userSelect: 'none'
            }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#F8FAFC', letterSpacing: '0.3px' }}>
              Slide {currentSlideIndex + 1} dari {slides.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlideChange(idx);
                  }}
                  style={{
                    width: idx === currentSlideIndex ? '22px' : '8px',
                    height: '8px',
                    borderRadius: '50px',
                    background: idx === currentSlideIndex ? 'linear-gradient(135deg, #FF5E00, #800000)' : 'rgba(255, 255, 255, 0.35)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  title={`Lompat ke Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* FULLSCREEN CANVAS VIEWPORT FOR THE PROGRAM IMAGE */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          background: 'transparent',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        {activeImageUrl ? (
          <div
            ref={tableRef}
            key={`slide-view-${currentSlideIndex}`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0, 0, 0.2, 1)',
              willChange: 'transform',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '98vw',
              maxHeight: '96vh',
              animation: 'fadeIn 0.2s ease-in-out',
              fontFamily: 'var(--font-body)'
            }}
          >
            <img
              src={activeImageUrl}
              alt={`${program.sheetName || 'Gambar Program'} - Slide ${currentSlideIndex + 1}`}
              style={{
                maxWidth: '96vw',
                maxHeight: '94vh',
                objectFit: 'contain',
                borderRadius: '16px',
                userSelect: 'none',
                pointerEvents: 'none',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
        ) : (
          <div
            ref={tableRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0, 0, 0.2, 1)',
              willChange: 'transform',
              background: '#FFFFFF',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
              padding: '28px',
              border: '1px solid #E2E8F0',
              maxHeight: '85vh',
              maxWidth: '92vw',
              overflow: 'auto'
            }}
          >
            <div style={{ marginBottom: '16px', borderBottom: '2px solid #800000', paddingBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, color: '#800000', letterSpacing: '0.4px' }}>
                  TELKOMSEL GTM ACTIVITY MONITORING
                </h4>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {program.sheetName} · {monthLabel || 'Agustus 2026'}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: '#64748B', background: '#F8FAFC', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                Total {rows.length} Baris Data
              </div>
            </div>

            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '12px',
                color: '#334155',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{ background: '#800000', color: '#FFFFFF' }}>
                  {headers.map((h, colIdx) => (
                    <th
                      key={colIdx}
                      style={{
                        padding: '12px 14px',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        border: '1px solid #A80C25',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, rowIdx) => (
                  <tr
                    key={rowIdx}
                    style={{
                      background: rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {headers.map((h, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          padding: '10px 14px',
                          border: '1px solid #E2E8F0',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatCellValue(h, r[h])}
                      </td>
                    ))}
                  </tr>
                ))}

                {summaryRow && (
                  <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}>
                    {headers.map((h, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          padding: '12px 14px',
                          border: '1px solid #1E293B',
                          whiteSpace: 'nowrap',
                          color: '#FFFFFF'
                        }}
                      >
                        {formatCellValue(h, summaryRow[h])}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Program / Slide */}
      {showConfirmDelete && (
        <div
          onClick={() => !isDeleting && setShowConfirmDelete(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100005,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              background: '#FFFFFF',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '28px 24px',
              textAlign: 'center',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
                border: '1px solid #FDA4AF',
                color: '#E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 6px 16px rgba(225, 29, 72, 0.15)'
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>
              {deleteTargetType === 'SLIDE' ? 'Konfirmasi Hapus Slide' : 'Konfirmasi Hapus Program'}
            </h3>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 18px 0', fontWeight: 500 }}>
              {deleteTargetType === 'SLIDE' ? (
                <>
                  Apakah Anda yakin ingin menghapus <strong>Slide {currentSlideIndex + 1}</strong> dari program <strong>"{program.sheetName}"</strong>?
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin menghapus seluruh program <strong>"{program.sheetName}"</strong> pada periode <strong>{monthLabel || 'Agustus 2026'}</strong>?
                </>
              )}
            </p>

            {deleteError && (
              <div style={{ fontFamily: 'var(--font-body)', padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
                }}
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: src/components/ProjectTable.jsx
```javascript
import { useState, useMemo, memo, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ACT_TYPES, actMeta, formatBranch } from '../utils';
import ActivityStatus from './ActivityStatus';
import UploadModal from './UploadModal';
import ConfirmSubmitModal from './ConfirmSubmitModal';

// Pilihan "Semua proyek" pada jumlah per halaman: seluruh baris ditampilkan dengan virtual scroll
// (hanya baris yang terlihat di layar yang dirender) agar ribuan proyek tetap ringan.
const PAGE_SIZE_ALL = 'all';
const PAGE_SIZE_OPTIONS = [15, 25, 50, PAGE_SIZE_ALL];
const ESTIMATED_ROW_HEIGHT = 64;

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const SortIcon = ({ sort }) => {
  if (sort === 'asc') {
    return (
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="18 15 12 9 6 15" />
      </svg>
    );
  }
  if (sort === 'desc') {
    return (
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
      <polyline points="8 9 12 5 16 9" />
      <polyline points="16 15 12 19 8 15" />
    </svg>
  );
};

// ─── OPTIMASI 3: ON-DEMAND LOADING & MEMOIZED ODP ROW ───
const OdpRow = memo(({ o, odpGrid }) => {
  const occRate = o.total > 0 ? Math.round((o.used / o.total) * 100) : 0;
  const badgeBg = o.used === 0 ? '#e2e8f0' : occRate < 50 ? '#dcfce7' : occRate < 75 ? '#fef3c7' : '#fee2e2';
  const badgeColor = o.used === 0 ? '#334155' : occRate < 50 ? '#16a34a' : occRate < 75 ? '#B45309' : '#dc2626';

  return (
    <div
      className="table-row"
      style={{ gridTemplateColumns: odpGrid, backgroundColor: '#fafbfc', borderTop: '1px solid #f8fafc', minHeight: '44px' }}
    >
      <div></div>
      <div style={{ fontSize: '13px', fontWeight: 600, paddingLeft: '14px', textAlign: 'left' }}>{o.odp}</div>

      <div style={{
        fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px',
        display: 'inline-block',
        backgroundColor: badgeBg,
        color: badgeColor,
        textAlign: 'center'
      }}>
        {o.total > 0 ? `${occRate}%` : '-'}
      </div>

      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.used || 0).toLocaleString('id-ID')}</div>
      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.avai || 0).toLocaleString('id-ID')}</div>
      <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(o.total || 0).toLocaleString('id-ID')}</div>
    </div>
  );
});

// ─── OPTIMASI 2: REACT RENDER OPTIMIZATION (MEMOIZED PROJECT ROW) ───
const ProjectRow = memo(({ p, branchName, isExpanded, toggleProject, onReview, onOpenUploadModal, tableGrid, odpGrid, isEven = false }) => {
  const pOdps = p.odps || [];
  const usedTotal = p.usedTotal;
  const avaiTotal = p.avaiTotal;
  const totalPort = p.totalPort;
  const bName = p.branchName || branchName;
  const projectActivities = p.activities || [];

  return (
    <div>
      {/* Project row with activity status & action buttons */}
      <div
        className={`table-row ${isEven ? 'table-row-even' : ''}`}
        style={{ gridTemplateColumns: tableGrid }}
      >
        <button
          type="button"
          aria-label={isExpanded ? `Ciutkan detail proyek ${p.name}` : `Perluas detail proyek ${p.name}`}
          aria-expanded={isExpanded}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', background: 'transparent', border: 'none', padding: 0 }}
          onClick={() => toggleProject(p.name)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Toggle detail proyek ${p.name}`}
          style={{
            fontSize: '13.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left',
            color: '#0F172A', display: 'block', width: '100%'
          }}
          onClick={() => toggleProject(p.name)}
        >
          {p.name}
        </button>
        <button
          type="button"
          aria-label={`Toggle detail WOK ${p.wok}`}
          style={{
            fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left',
            display: 'block', width: '100%', fontWeight: 500
          }}
          onClick={() => toggleProject(p.name)}
        >
          {formatBranch(bName)} · {p.wok}
        </button>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(usedTotal || 0).toLocaleString('id-ID')}</div>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(avaiTotal || 0).toLocaleString('id-ID')}</div>
        <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', height: '100%', fontVariantNumeric: 'tabular-nums' }}>{Number(totalPort || 0).toLocaleString('id-ID')}</div>

        {/* Activity cells using unified ActivityStatus component */}
        {ACT_TYPES.map(actType => {
          const a = projectActivities.find(x => x.type === actType.key);
          const rawStatus = a?.status || 'belum';
          const photos = a?.photos || [];
          const verifiedPhotos = photos.filter(ph => ph.status === 'verified');
          const pendingPhotos = photos.filter(ph => ph.status === 'upload');
          const rejectedPhotos = photos.filter(ph => ph.status === 'rejected' || ph.status === 'gagal');

          let status = 'belum';
          if (rawStatus === 'verified' || verifiedPhotos.length > 0) {
            status = 'selesai';
          } else if (rawStatus === 'upload' || pendingPhotos.length > 0) {
            status = 'menunggu_verifikasi';
          } else if (rawStatus === 'gagal' || rawStatus === 'rejected' || rejectedPhotos.length > 0) {
            status = 'gagal';
          } else if (rawStatus === 'proses' || rawStatus === 'processing') {
            status = 'proses';
          }

          const verifiedCount = verifiedPhotos.length > 0 ? verifiedPhotos.length : (status === 'selesai' ? 1 : 0);
          const label = status === 'selesai' && verifiedCount > 1 ? `Selesai (${verifiedCount})` : undefined;

          const handleAction = () => {
            if (status === 'menunggu_verifikasi') {
              onReview && onReview(bName, p.name);
            } else {
              onOpenUploadModal && onOpenUploadModal({ branchName: bName, projectName: p.name, actTypeObj: actType });
            }
          };

          return (
            <div
              key={actType.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 4px',
                alignSelf: 'center'
              }}
            >
              <ActivityStatus
                status={status}
                label={label}
                count={verifiedCount}
                onAction={handleAction}
                onClick={handleAction}
                title={actType.label}
              />
            </div>
          );
        })}

        {/* Kolom ringkasan progres per proyek (badge + mini progress bar) */}
        {(() => {
          const completedCount = ACT_TYPES.reduce((count, actType) => {
            const a = projectActivities.find(x => x.type === actType.key);
            const isVerified = a?.status === 'verified' || (a?.photos && a.photos.some(ph => ph.status === 'verified'));
            return count + (isVerified ? 1 : 0);
          }, 0);
          const progressPct = Math.round((completedCount / ACT_TYPES.length) * 100);

          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0 6px',
                alignSelf: 'center'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: completedCount === ACT_TYPES.length ? '#15803D' : completedCount > 0 ? '#B45309' : '#64748B',
                  whiteSpace: 'nowrap'
                }}
              >
                {completedCount}/{ACT_TYPES.length} Selesai
              </span>
              <div
                style={{
                  width: '64px',
                  height: '5px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '9999px',
                  overflow: 'hidden'
                }}
                title={`Progres kegiatan GTM: ${completedCount} dari ${ACT_TYPES.length} selesai (${progressPct}%)`}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    backgroundColor: completedCount === ACT_TYPES.length ? '#16A34A' : completedCount > 0 ? '#D97706' : '#94A3B8',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* Kolom Detail / Review sejajar dan tidak terpotong di tepi kanan */}
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReview && onReview(bName, p.name); }}
            aria-label={`Buka detail dan review proyek ${p.name}`}
            title={`Lihat detail & review foto proyek ${p.name}`}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '32px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            Review
          </button>
        </div>
      </div>

      {/* ODP rows on-demand loading */}
      {isExpanded && pOdps.map((o) => (
        <OdpRow key={o.odp} o={o} odpGrid={odpGrid} />
      ))}
    </div>
  );
});

export default function ProjectTable({ projects, branchName, onReview, uploadPhoto, isLoading = false, onResetSearch }) {
  const [expanded, setExpanded] = useState({});
  const [filterPopup, setFilterPopup] = useState(null);
  const [filters, setFilters] = useState({
    name: { sort: null, search: '', unchecked: [] },
    wok: { sort: null, search: '', unchecked: [] },
    usedTotal: { sort: null, search: '', unchecked: [] },
    avaiTotal: { sort: null, search: '', unchecked: [] },
    totalPort: { sort: null, search: '', unchecked: [] }
  });

  // ─── FILTER POPUP REF & CLICK OUTSIDE LISTENER ───
  const popupRef = useRef(null);

  useEffect(() => {
    if (!filterPopup) return;
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setFilterPopup(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFilterPopup(null);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterPopup]);

  // ─── OPTIMASI 1: PAGINATION STATE ───
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const pageSizeRef = useRef(null);

  // Keyboard Escape and click-outside listener for page size dropdown (R-32)
  useEffect(() => {
    if (!isPageSizeOpen) return;
    const handleClickOutside = (e) => {
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target)) {
        setIsPageSizeOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPageSizeOpen]);

  // ─── UPLOAD MODAL STATE ───
  const [activeUploadData, setActiveUploadData] = useState(null);
  const [confirmSubmitData, setConfirmSubmitData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleProject = useCallback((projectName) => {
    setExpanded(prev => ({ ...prev, [projectName]: !prev[projectName] }));
  }, []);

  // ─── OPTIMASI 2: GUNAKAN NILAI PRE-COMPUTED DARI SERVER ───
  // usedTotal, avaiTotal, totalPort, occRate sudah dihitung di server.js — tidak perlu reduce() di sini.
  const projectsWithTotals = useMemo(() => {
    return (Array.isArray(projects) ? projects : []).map(p => {
      const odps = Array.isArray(p.odps) ? p.odps : [];
      return {
        ...p,
        wok: p.wok || '-',
        usedTotal: p.usedTotal ?? odps.reduce((s, o) => s + (o.used || 0), 0),
        avaiTotal: p.avaiTotal ?? odps.reduce((s, o) => s + (o.avai || 0), 0),
        totalPort: p.totalPort ?? odps.reduce((s, o) => s + (o.total || 0), 0),
      };
    });
  }, [projects]);

  const displayProjects = useMemo(() => {
    let list = [...projectsWithTotals];

    // Apply filtering
    ['wok', 'usedTotal', 'avaiTotal', 'totalPort'].forEach(col => {
      const f = filters[col];
      if (f && f.unchecked && f.unchecked.length > 0) {
        const uncheckedStr = f.unchecked.map(String);
        list = list.filter(p => !uncheckedStr.includes(String(p[col] ?? '-')));
      }
    });

    // Apply sorting
    const sortCol = ['name', 'wok', 'usedTotal', 'avaiTotal', 'totalPort'].find(col => filters[col]?.sort);
    if (sortCol) {
      const sortDir = filters[sortCol].sort;
      if (sortCol === 'name' || sortCol === 'wok') {
        list.sort((a, b) => {
          const valA = String(a[sortCol] || '');
          const valB = String(b[sortCol] || '');
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      } else {
        list.sort((a, b) => {
          const numA = Number(a[sortCol]) || 0;
          const numB = Number(b[sortCol]) || 0;
          return sortDir === 'asc' ? numA - numB : numB - numA;
        });
      }
    }

    return list;
  }, [projectsWithTotals, filters]);

  // Reset page ke 1 jika filter berubah atau daftar proyek berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [displayProjects.length, filters]);

  const isShowAll = pageSize === PAGE_SIZE_ALL;
  const totalPages = isShowAll ? 1 : (Math.ceil(displayProjects.length / pageSize) || 1);
  const paginatedProjects = useMemo(() => {
    if (isShowAll) return displayProjects;
    const start = (currentPage - 1) * pageSize;
    return displayProjects.slice(start, start + pageSize);
  }, [displayProjects, currentPage, pageSize, isShowAll]);
  const rangeStart = displayProjects.length > 0 ? (isShowAll ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const rangeEnd = isShowAll ? displayProjects.length : Math.min(currentPage * pageSize, displayProjects.length);

  // ─── OPTIMASI 4: VIRTUALISASI BARIS (mode "Semua proyek") ───
  // Tinggi tiap baris diukur otomatis (baris yang di-expand menampilkan daftar ODP sehingga lebih tinggi)
  const scrollRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: isShowAll ? displayProjects.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => displayProjects[index]?.name ?? index,
    overscan: 10,
    enabled: isShowAll
  });
  const virtualRows = isShowAll ? rowVirtualizer.getVirtualItems() : [];
  const virtualPaddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const virtualPaddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

  const renderProjectRow = (p, idx) => (
    <ProjectRow
      key={p.name}
      p={p}
      branchName={branchName}
      isExpanded={Boolean(expanded[p.name])}
      toggleProject={toggleProject}
      onReview={onReview}
      onOpenUploadModal={setActiveUploadData}
      tableGrid={tableGrid}
      odpGrid={odpGrid}
      isEven={idx % 2 === 1}
    />
  );

  const updateFilter = (col, key, val) => {
    setFilters(prev => {
      const newState = { ...prev };
      if (key === 'sort' && val !== null) {
        ['name', 'wok', 'usedTotal', 'avaiTotal', 'totalPort'].forEach(c => {
          if (c !== col) newState[c].sort = null;
        });
      }
      newState[col] = { ...newState[col], [key]: val };
      return newState;
    });
  };

  const handleSortCycle = (col) => {
    const current = filters[col]?.sort;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';
    updateFilter(col, 'sort', next);
  };

  const renderSortableHeader = (label, col, align = 'left', hasFilter = false) => {
    const isFiltered = (filters[col]?.unchecked?.length > 0) || Boolean(filters[col]?.search);
    const sort = filters[col]?.sort;

    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: '4px',
          paddingRight: align === 'right' ? '6px' : '0',
          paddingLeft: align === 'left' ? '2px' : '0',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={() => handleSortCycle(col)}
          aria-label={`Urutkan kolom ${label} (${sort === 'asc' ? 'naik' : sort === 'desc' ? 'turun' : 'belum diurutkan'})`}
          title={`Klik untuk mengurutkan ${label}`}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            font: 'inherit',
            color: sort ? '#0F172A' : '#475569',
            fontWeight: 600,
            textTransform: 'inherit',
            letterSpacing: 'inherit',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <span>{label}</span>
          <SortIcon sort={sort} />
        </button>

        {hasFilter && (
          <button
            type="button"
            aria-label={`Filter kolom ${label}`}
            onClick={(e) => { e.stopPropagation(); setFilterPopup(filterPopup === col ? null : col); }}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: isFiltered ? '#800000' : '#94A3B8',
              padding: '2px',
              borderRadius: '4px',
              marginLeft: '2px',
              flexShrink: 0
            }}
            title={`Filter kolom ${label}`}
          >
            <FilterIcon />
          </button>
        )}

        {hasFilter && renderFilterPopup(col)}
      </div>
    );
  };

  const renderFilterPopup = (col) => {
    if (filterPopup !== col) return null;

    const valueCounts = {};
    projectsWithTotals.forEach(p => {
      const v = p[col] ?? '-';
      valueCounts[v] = (valueCounts[v] || 0) + 1;
    });

    const isStringCol = col === 'wok';
    const allValues = isStringCol
      ? Object.keys(valueCounts).sort((a, b) => a.localeCompare(b))
      : Object.keys(valueCounts).map(Number).sort((a, b) => a - b);

    const searchLower = (filters[col].search || '').toLowerCase();
    const visibleValues = allValues.filter(v => v.toString().toLowerCase().includes(searchLower));
    const currentUncheckedStr = (filters[col].unchecked || []).map(String);

    return (
      <div
        ref={popupRef}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '6px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.22)',
          zIndex: 99999,
          width: '210px',
          padding: '12px',
          fontSize: '12px',
          color: '#334155',
          fontWeight: 500,
          textAlign: 'left',
          textTransform: 'none',
          letterSpacing: 'normal'
        }}
      >
        <button
          type="button"
          onClick={() => { updateFilter(col, 'sort', filters[col].sort === 'asc' ? null : 'asc'); setFilterPopup(null); }}
          style={{ width: '100%', border: 'none', padding: '6px 10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: filters[col].sort === 'asc' ? '#F1F5F9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: filters[col].sort === 'asc' ? '#800000' : '#334155', textAlign: 'left' }}
        >
          <span style={{ fontSize: '14px' }}>↓</span> {isStringCol ? 'Sort A to Z' : 'Sort Kecil ke Besar'}
        </button>
        <button
          type="button"
          onClick={() => { updateFilter(col, 'sort', filters[col].sort === 'desc' ? null : 'desc'); setFilterPopup(null); }}
          style={{ width: '100%', border: 'none', padding: '6px 10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: filters[col].sort === 'desc' ? '#F1F5F9' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: filters[col].sort === 'desc' ? '#800000' : '#334155', textAlign: 'left' }}
        >
          <span style={{ fontSize: '14px' }}>↑</span> {isStringCol ? 'Sort Z to A' : 'Sort Besar ke Kecil'}
        </button>

        <div style={{ height: '1px', background: '#E2E8F0', margin: '8px 0' }} />

        <input
          type="text"
          placeholder={`Cari ${col === 'wok' ? 'WOK' : 'nilai'}...`}
          aria-label={`Cari filter ${col}`}
          value={filters[col].search}
          onChange={e => updateFilter(col, 'search', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', marginBottom: '8px', fontSize: '11.5px' }}
        />

        <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '2px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer', fontWeight: 600, borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
            <input
              type="checkbox"
              checked={currentUncheckedStr.length === 0}
              onChange={(e) => {
                if (e.target.checked) updateFilter(col, 'unchecked', []);
                else updateFilter(col, 'unchecked', allValues.map(String));
              }}
            />
            (Pilih Semua)
          </label>
          {visibleValues.map(v => {
            const strVal = String(v);
            const isChecked = !currentUncheckedStr.includes(strVal);
            return (
              <label key={strVal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ flexShrink: 0 }}
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilter(col, 'unchecked', currentUncheckedStr.filter(x => x !== strVal));
                    } else {
                      updateFilter(col, 'unchecked', [...currentUncheckedStr, strVal]);
                    }
                  }}
                />
                <span style={{ lineHeight: '1.3', fontSize: '11.5px', color: '#0F172A' }}>
                  {strVal} <span style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 600 }}>({valueCounts[v]})</span>
                </span>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={() => {
              updateFilter(col, 'unchecked', []);
              updateFilter(col, 'search', '');
              updateFilter(col, 'sort', null);
            }}
            style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setFilterPopup(null)}
            style={{ padding: '4px 12px', border: 'none', borderRadius: '6px', background: '#0F172A', color: '#FFFFFF', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
          >
            Terapkan
          </button>
        </div>
      </div>
    );
  };

  const tableGrid = '34px 210px 130px 90px 120px 85px 120px 120px 120px 120px 120px 115px 85px';
  const odpGrid = '34px 210px 130px 90px 120px 85px';

  return (
    <div className="card" style={{ position: 'relative', overflow: filterPopup ? 'visible' : 'hidden' }}>
      <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: filterPopup ? 'visible' : 'auto', maxHeight: '75vh' }}>
        <div style={{ minWidth: 'max-content', paddingBottom: filterPopup ? '400px' : '0' }}>
          {/* Header */}
          <div
            className="table-header"
            style={{
              gridTemplateColumns: tableGrid,
              position: 'sticky',
              top: 0,
              zIndex: 20,
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div></div>
            {renderSortableHeader('Nama Proyek', 'name', 'left', false)}
            {renderSortableHeader('Branch / WOK', 'wok', 'left', true)}
            {renderSortableHeader('Used', 'usedTotal', 'right', true)}
            {renderSortableHeader('Available', 'avaiTotal', 'right', true)}
            {renderSortableHeader('Total', 'totalPort', 'right', true)}
            {ACT_TYPES.map(t => (
              <div key={t.key} className="activity-col-header">{t.label}</div>
            ))}
            <div style={{ textAlign: 'center', padding: '0 4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Progres</div>
            <div style={{ textAlign: 'center', padding: '0 4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Detail</div>
          </div>

          {/* Rows / Skeleton / Empty State */}
          {isLoading ? (
            <div style={{ padding: '4px 0' }}>
              {[1, 2, 3, 4, 5].map(idx => (
                <div
                  key={idx}
                  className="table-row"
                  style={{ gridTemplateColumns: tableGrid, minHeight: '52px' }}
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '150px', height: '14px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '90px', height: '12px', borderRadius: '4px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '36px', height: '12px', borderRadius: '4px', background: '#E2E8F0', justifySelf: 'end', animation: 'pulse 1.5s infinite' }} />
                  {[1, 2, 3, 4, 5].map(actIdx => (
                    <div key={actIdx} style={{ width: '68px', height: '24px', borderRadius: '6px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                  ))}
                  <div style={{ width: '64px', height: '14px', borderRadius: '4px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '56px', height: '28px', borderRadius: '8px', background: '#F1F5F9', justifySelf: 'center', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          ) : isShowAll ? (
            <>
              <div style={{ height: `${virtualPaddingTop}px` }} />
              {virtualRows.map(virtualRow => (
                <div key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement}>
                  {renderProjectRow(displayProjects[virtualRow.index], virtualRow.index)}
                </div>
              ))}
              <div style={{ height: `${virtualPaddingBottom}px` }} />
            </>
          ) : (
            paginatedProjects.map((p, idx) => renderProjectRow(p, idx))
          )}

          {paginatedProjects.length === 0 && !isLoading && (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Tidak ada proyek yang sesuai dengan filter
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '420px', lineHeight: 1.5 }}>
                Hasil tidak ditemukan untuk filter atau kata kunci saat ini. Silakan atur ulang filter kolom untuk melihat seluruh data.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    name: { sort: null, search: '', unchecked: [] },
                    wok: { sort: null, search: '', unchecked: [] },
                    usedTotal: { sort: null, search: '', unchecked: [] },
                    avaiTotal: { sort: null, search: '', unchecked: [] },
                    totalPort: { sort: null, search: '', unchecked: [] }
                  });
                  if (onResetSearch) onResetSearch();
                }}
                aria-label="Reset semua filter tabel"
                style={{
                  marginTop: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset Filter</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {activeUploadData && (
        <UploadModal
          data={activeUploadData}
          onClose={() => setActiveUploadData(null)}
          onSubmit={(payload) => {
            setConfirmSubmitData({
              ...activeUploadData,
              actLabel: activeUploadData.actTypeObj.label,
              payload
            });
          }}
        />
      )}

      {/* Confirm Submit Modal */}
      {confirmSubmitData && (
        <ConfirmSubmitModal
          data={confirmSubmitData}
          isSubmitting={isSubmitting}
          onCancel={() => setConfirmSubmitData(null)}
          onConfirm={async () => {
            setIsSubmitting(true);
            try {
              let result = null;
              if (uploadPhoto) {
                result = await uploadPhoto(
                  confirmSubmitData.branchName,
                  confirmSubmitData.projectName,
                  confirmSubmitData.actTypeObj.key,
                  confirmSubmitData.payload
                );
              }
              setConfirmSubmitData(null);
              // Jika gagal, form upload tetap terbuka agar data yang sudah diisi tidak hilang
              if (!result || result.success !== false) {
                setActiveUploadData(null);
              }
            } catch (err) {
              console.error('Submit error:', err);
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      )}

      {/* Pagination Footer */}
      <div className="table-pagination-footer">
        <div className="tabular-nums" style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          Menampilkan <span style={{ color: '#0f172a', fontWeight: 600 }}>{rangeStart}</span> - <span style={{ color: '#0f172a', fontWeight: 600 }}>{rangeEnd}</span> dari <span style={{ color: '#0f172a', fontWeight: 600 }}>{displayProjects.length}</span> proyek
        </div>

        <div className="table-pagination-controls">
          {/* Custom Capsule Dropup for Page Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            <span>Per halaman:</span>
            <div ref={pageSizeRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                aria-haspopup="listbox"
                aria-expanded={isPageSizeOpen}
                aria-label="Pilih jumlah data per halaman"
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                <span>{isShowAll ? 'Semua' : pageSize} proyek</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isPageSizeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isPageSizeOpen && (
                <div 
                  role="listbox"
                  aria-label="Daftar pilihan baris per halaman"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: '6px',
                    width: '120px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    overflow: 'hidden'
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={pageSize === size}
                      className={`dropdown-item ${pageSize === size ? 'active' : ''}`}
                      onClick={() => { setPageSize(size); setCurrentPage(1); setIsPageSizeOpen(false); }}
                      style={{
                        width: '100%',
                        border: 'none',
                        textAlign: 'left',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: pageSize === size ? 600 : 500,
                        color: pageSize === size ? '#800000' : '#334155',
                        background: pageSize === size ? '#FEF2F2' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {size === PAGE_SIZE_ALL ? 'Semua' : size} proyek
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Capsule Arrow Buttons for Prev / Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              aria-label="Halaman Sebelumnya"
              title="Halaman Sebelumnya"
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f1f5f9' : '#fff',
                color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>

            <span className="tabular-nums" style={{ padding: '0 6px', fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              aria-label="Halaman Selanjutnya"
              title="Halaman Selanjutnya"
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: currentPage === totalPages ? '#f1f5f9' : '#fff',
                color: currentPage === totalPages ? '#94a3b8' : '#0f172a',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: src/components/ReviewModal.jsx
```javascript
import { useState, useEffect, useRef } from 'react';
import { ACT_TYPES, actMeta } from '../utils';
import ConfirmRejectModal from './ConfirmRejectModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function ReviewModal({ modalData, closeModal, verifyActivity, rejectActivity, deletePhoto }) {
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [localActivities, setLocalActivities] = useState(modalData?.activities || []);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  const modalRef = useRef(null);

  useEffect(() => {
    if (modalData?.activities) {
      setLocalActivities(modalData.activities);
    }
  }, [modalData]);

  // Focus trap & Escape listener for dialog and lightbox (R-32 & R-39)
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;
    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    if (!previewPhoto) {
      firstEl?.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewPhoto) {
          setPreviewPhoto(null);
        } else {
          closeModal();
        }
        return;
      }
      if (e.key === 'Tab' && !previewPhoto) {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, previewPhoto]);

  if (!modalData) return null;

  const handleVerify = async (actKey, photoId) => {
    if (verifyActivity && !verifyingId) {
      setVerifyingId(photoId);
      try {
        const resOk = await verifyActivity(modalData.bName, modalData.pName, actKey, photoId, modalData.projectId);
        if (resOk === false) return;
        setLocalActivities(prev => prev.map(a => {
          if (a.type !== actKey) return a;
          const updatedPhotos = (a.photos || []).map(ph => ph.id === photoId ? { ...ph, status: 'verified' } : ph);
          const allVerified = updatedPhotos.length > 0 && updatedPhotos.every(ph => ph.status === 'verified');
          return { ...a, status: allVerified ? 'verified' : 'upload', photos: updatedPhotos };
        }));
      } catch (err) {
        console.error('Error verifying activity:', err);
      } finally {
        setVerifyingId(null);
      }
    }
  };

  const triggerRejectConfirm = (actKey, photoId, actLabel, photoIndex) => {
    setRejectTarget({
      actKey,
      photoId,
      actLabel,
      photoIndex,
      pName: modalData.pName,
      bName: modalData.bName,
      projectId: modalData.projectId
    });
  };

  const handleExecuteReject = async () => {
    if (!rejectTarget || !rejectActivity) return;
    setIsRejecting(true);
    try {
      const { actKey, photoId, bName, pName, projectId } = rejectTarget;
      const resOk = await rejectActivity(bName, pName, actKey, photoId, projectId);
      if (resOk !== false) {
        setLocalActivities(prev => prev.map(a => {
          if (a.type !== actKey) return a;
          const updatedPhotos = photoId
            ? (a.photos || []).filter(ph => ph.id !== photoId)
            : [];
          const hasRemainingUpload = updatedPhotos.some(ph => ph.status === 'upload');
          const hasRemainingVerified = updatedPhotos.some(ph => ph.status === 'verified');
          const newStatus = hasRemainingUpload ? 'upload' : hasRemainingVerified ? 'verified' : 'belum';
          const isCleared = updatedPhotos.length === 0;
          const latest = updatedPhotos[updatedPhotos.length - 1];
          return {
            ...a,
            status: isCleared ? 'belum' : newStatus,
            photos: isCleared ? [] : updatedPhotos,
            photoUrl: isCleared ? null : latest?.photoUrl || null,
            planDate: isCleared ? null : latest?.planDate || null,
            keterangan: isCleared ? null : latest?.keterangan || null,
            namaOutlet: isCleared ? null : latest?.namaOutlet || null,
            namaBumdes: isCleared ? null : latest?.namaBumdes || null,
            kodeSf: isCleared ? null : latest?.kodeSf || null
          };
        }));
      }
      setRejectTarget(null);
    } catch (err) {
      console.error('Error rejecting activity:', err);
    } finally {
      setIsRejecting(false);
    }
  };

  const triggerDeleteConfirm = (actKey, photoId, actLabel, photoIndex) => {
    setDeleteTarget({
      actKey,
      photoId,
      actLabel,
      photoIndex,
      pName: modalData.pName,
      bName: modalData.bName,
      projectId: modalData.projectId
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { actKey, photoId, bName, pName, projectId } = deleteTarget;
      let resOk = false;
      if (deletePhoto) {
        resOk = await deletePhoto(bName, pName, actKey, photoId, projectId);
      } else if (rejectActivity) {
        resOk = await rejectActivity(bName, pName, actKey, photoId, projectId);
      }
      if (resOk !== false) {
        setLocalActivities(prev => prev.map(a => {
          if (a.type !== actKey) return a;
          const updatedPhotos = (a.photos || []).filter(ph => ph.id !== photoId);
          const hasRemainingUpload = updatedPhotos.some(ph => ph.status === 'upload');
          const hasRemainingVerified = updatedPhotos.some(ph => ph.status === 'verified');
          const newStatus = hasRemainingUpload ? 'upload' : hasRemainingVerified ? 'verified' : 'belum';
          const isCleared = updatedPhotos.length === 0;
          return {
            ...a,
            status: isCleared ? 'belum' : newStatus,
            photos: isCleared ? [] : updatedPhotos,
            ...(isCleared ? { keterangan: null, kodeSf: null, namaOutlet: null, namaBumdes: null, planDate: null, photoUrl: null } : {})
          };
        }));
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={closeModal}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '24px' }}
    >
      <div 
        ref={modalRef}
        onClick={e => e.stopPropagation()} 
        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' }}
      >
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div id="review-modal-title" style={{ fontFamily: "var(--font-heading)", fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{modalData.pName}</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>{modalData.wok} · {modalData.bName}</div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Tutup dialog review proyek"
            style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ padding: '20px 26px' }}>
          {/* Project Stats Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '22px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Available</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.totalAvai}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Used</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.totalUsed}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Port</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.totalPort}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Jumlah ODP</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.odpCount}</div>
            </div>
          </div>

          {/* ODP List */}
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Daftar ODP dalam Proyek</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {modalData.odps.map(o => (
              <span key={o.odp} style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                background: o.used === 0 ? '#e2e8f0' : '#dcfce7',
                color: o.used === 0 ? '#334155' : '#16a34a'
              }}>
                {o.odp} ({o.used}/{o.total})
              </span>
            ))}
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Detail Activity GTM</div>
          
          {ACT_TYPES.map(actType => {
            const a = localActivities.find(x => x.type === actType.key);

            // Foto / kegiatan yang ditolak (status 'belum') dihapus dari tampilan — user perlu upload ulang
            const allPhotos = a?.photos && a.photos.length > 0
              ? a.photos
              : (a && a.status && a.status !== 'belum' ? [{ id: a.id, photoUrl: a.photoUrl, status: a.status, planDate: a.planDate, keterangan: a.keterangan, namaOutlet: a.namaOutlet, namaBumdes: a.namaBumdes, kodeSf: a.kodeSf }] : []);
            const photoList = allPhotos.filter(ph => ph.status !== 'belum');

            // Hitung status dari foto yang valid saja
            const effectiveStatus = photoList.length === 0
              ? 'belum'
              : photoList.some(ph => ph.status === 'upload')
                ? 'upload'
                : 'verified';
            const meta = actMeta(effectiveStatus);

            return (
              <div key={actType.key} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{actType.label}</div>
                  <div style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: meta.bg, color: meta.color }}>
                    {meta.label} {photoList.length > 0 && (actType.key === 'rekrutmen_sf' ? '' : `(${photoList.length} Foto)`)}
                  </div>
                </div>

                {photoList.length === 0 ? (
                  <div style={{ fontSize: '12.5px', color: '#64748B', fontStyle: 'italic' }}>
                    {actType.key === 'rekrutmen_sf' ? 'Belum ada data kegiatan' : 'Belum ada data / foto kegiatan'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {photoList.map((ph, idx) => {
                      const phMeta = actMeta(ph.status);
                      return (
                        <div key={ph.id || idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {actType.key !== 'rekrutmen_sf' && (
                            ph.photoUrl && ph.photoUrl !== 'uploading...' ? (
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto({ url: ph.photoUrl, title: `${actType.label} (${idx + 1}) - ${modalData.pName}` })}
                                aria-label={`Lihat foto bukti ${actType.label} #${idx + 1}`}
                                style={{ position: 'relative', width: '90px', height: '65px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', flexShrink: 0, padding: 0, background: 'none' }}
                                title="Klik untuk melihat foto lebih besar"
                              >
                                <img src={ph.photoUrl} alt={`Foto Bukti ${actType.label}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                <div style={{ position: 'absolute', bottom: 0, inset: 'auto 0 0 0', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '9px', fontWeight: 700, textAlign: 'center', padding: '2px 0' }}>
                                  Lihat
                                </div>
                              </button>
                            ) : (
                              <div style={{ width: '90px', height: '65px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>
                                Tanpa Foto
                              </div>
                            )
                          )}

                          <div style={{ flex: 1, minWidth: '160px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: phMeta.bg, color: phMeta.color }}>
                                {actType.key === 'rekrutmen_sf' ? phMeta.label : `Foto #${idx + 1}: ${phMeta.label}`}
                              </span>
                            </div>
                            {ph.namaOutlet && <div><b>Nama Outlet:</b> {ph.namaOutlet}</div>}
                            {(ph.namaBumdes || (actType.key === 'bumdes' && ph.keterangan)) && (
                              <div><b>Nama BUMDES:</b> {ph.namaBumdes || ph.keterangan}</div>
                            )}
                            {ph.planDate && <div><b>Tanggal:</b> {new Date(ph.planDate).toLocaleDateString('id-ID')}</div>}
                            {(ph.kodeSf || ph.keterangan) && <div><b>{actType.key === 'rekrutmen_sf' ? 'Kode SF' : 'Kode SF/Ket'}:</b> {ph.kodeSf || ph.keterangan}</div>}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                            {ph.status === 'upload' && (
                              <>
                                {rejectActivity && (
                                  <button
                                    type="button"
                                    onClick={() => triggerRejectConfirm(actType.key, ph.id, actType.label, idx)}
                                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Tolak
                                  </button>
                                )}
                                {verifyActivity && (
                                  <button
                                    type="button"
                                    disabled={verifyingId === ph.id}
                                    onClick={() => handleVerify(actType.key, ph.id)}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: verifyingId === ph.id ? '#15803d' : '#16a34a',
                                      color: '#fff',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: verifyingId === ph.id ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                                      opacity: verifyingId === ph.id ? 0.85 : 1,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {verifyingId === ph.id ? (
                                      <>
                                        <svg
                                          width="13"
                                          height="13"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{ animation: 'spin 0.75s linear infinite' }}
                                        >
                                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                        <span>Memverifikasi...</span>
                                      </>
                                    ) : (
                                      <span>Verifikasi</span>
                                    )}
                                  </button>
                                )}
                              </>
                            )}

                            {(deletePhoto || rejectActivity) && (
                              <button
                                type="button"
                                onClick={() => triggerDeleteConfirm(actType.key, ph.id, actType.label, idx)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #fca5a5',
                                  background: '#fff1f2',
                                  color: '#e11d48',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Hapus data / foto kegiatan ini"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.85)', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100000, 
            padding: '20px' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              position: 'relative', 
              maxWidth: '90vw', 
              maxHeight: '85vh', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              background: '#fff', 
              borderRadius: '16px', 
              padding: '18px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' 
            }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '16px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a' }}>{previewPhoto.title}</div>
              <button 
                type="button"
                onClick={() => setPreviewPhoto(null)} 
                aria-label="Tutup pratinjau foto"
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
            <img 
              src={previewPhoto.url} 
              alt={previewPhoto.title} 
              style={{ maxWidth: '100%', maxHeight: '68vh', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0' }} 
            />
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <a 
                href={previewPhoto.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ fontSize: '13px', color: '#2563EB', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>Buka Foto Ukuran Asli di Tab Baru</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reject Confirmation Modal */}
      <ConfirmRejectModal
        isOpen={!!rejectTarget}
        data={rejectTarget}
        onConfirm={handleExecuteReject}
        onCancel={() => setRejectTarget(null)}
        isRejecting={isRejecting}
      />

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        data={deleteTarget}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
```

## File: src/components/UploadModal.jsx
```javascript
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function UploadModal({ data, onClose, onSubmit }) {
  if (!data) return null;
  const { branchName, projectName, actTypeObj } = data;

  const actKey = actTypeObj.key;
  const actLabel = actTypeObj.label;

  const [planDate, setPlanDate] = useState('');
  const [namaOutlet, setNamaOutlet] = useState('');
  const [namaBumdes, setNamaBumdes] = useState('');
  const [kodeSf, setKodeSf] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;
    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('File harus berupa gambar (JPG, PNG, WEBP, dll).');
        return;
      }
      setSelectedFile(file);
      setErrorMsg('');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmitAttempt = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validasi aturan input per activity
    if (actKey === 'branding_outlet') {
      if (!namaOutlet.trim()) {
        setErrorMsg('Nama Outlet wajib diisi.');
        return;
      }
      if (!selectedFile) {
        setErrorMsg('Foto bukti kegiatan wajib diunggah.');
        return;
      }
    } else if (actKey === 'open_table' || actKey === 'tsel_menyapa') {
      if (!planDate) {
        setErrorMsg('Tanggal wajib dipilih.');
        return;
      }
      if (!selectedFile) {
        setErrorMsg('Foto bukti kegiatan wajib diunggah.');
        return;
      }
    } else if (actKey === 'bumdes') {
      if (!namaBumdes.trim()) {
        setErrorMsg('Nama BUMDES wajib diisi.');
        return;
      }
      if (!selectedFile) {
        setErrorMsg('Foto bukti kegiatan wajib diunggah.');
        return;
      }
    } else if (actKey === 'rekrutmen_sf') {
      if (!kodeSf.trim()) {
        setErrorMsg('Kode SF wajib diisi.');
        return;
      }
    }

    // Panggil trigger konfirmasi
    onSubmit({
      file: selectedFile,
      planDate,
      namaOutlet: namaOutlet.trim(),
      namaBumdes: namaBumdes.trim(),
      kodeSf: kodeSf.trim(),
      keterangan: kodeSf.trim() || namaOutlet.trim() || namaBumdes.trim()
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', boxSizing: 'border-box'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'relative', width: '100%', maxWidth: '480px',
          background: '#FFFFFF', borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '26px 28px', boxSizing: 'border-box',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#FF5E00', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Upload Kegiatan GTM
            </div>
            <h3 id="upload-modal-title" style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: '4px 0 2px 0', fontFamily: "var(--font-heading)" }}>
              {actLabel}
            </h3>
            <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
              {projectName} · <span style={{ color: '#0F172A' }}>{branchName}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form upload kegiatan"
            style={{
              width: '32px', height: '32px', borderRadius: '50%', border: 'none',
              background: '#F1F5F9', color: '#64748B', fontSize: '15px',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
            padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 600,
            marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitAttempt} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Form Input: Branding Outlet -> Nama Outlet */}
          {actKey === 'branding_outlet' && (
            <div>
              <label htmlFor="upload-nama-outlet" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nama Outlet <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-nama-outlet"
                type="text"
                placeholder="Masukkan Nama Outlet..."
                value={namaOutlet}
                onChange={(e) => setNamaOutlet(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Form Input: Kerjasama BUMDES -> Nama BUMDES */}
          {actKey === 'bumdes' && (
            <div>
              <label htmlFor="upload-nama-bumdes" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nama BUMDES <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-nama-bumdes"
                type="text"
                placeholder="Masukkan Nama BUMDES..."
                value={namaBumdes}
                onChange={(e) => setNamaBumdes(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Form Input: Always Open Table & Tsel Menyapa -> Tanggal */}
          {(actKey === 'open_table' || actKey === 'tsel_menyapa') && (
            <div>
              <label htmlFor="upload-plan-date" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tanggal Kegiatan <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-plan-date"
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Form Input: Rekrutmen SF -> Kode SF (wajib, satu-satunya input) */}
          {actKey === 'rekrutmen_sf' && (
            <div>
              <label htmlFor="upload-kode-sf" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Kode SF <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-kode-sf"
                type="text"
                placeholder="Contoh: SF 09812..."
                value={kodeSf}
                onChange={(e) => setKodeSf(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Upload Foto Dropzone — disembunyikan untuk Rekrutmen SF */}
          {actKey !== 'rekrutmen_sf' && (
            <div>
              <label htmlFor="upload-modal-file-input" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Foto Bukti Kegiatan {['branding_outlet', 'open_table', 'tsel_menyapa', 'bumdes'].includes(actKey) && <span style={{ color: '#DC2626' }}>*</span>}
              </label>

              {previewUrl ? (
                <div style={{
                  position: 'relative', width: '100%', height: '180px', borderRadius: '12px',
                  overflow: 'hidden', border: '2px solid #10B981', background: '#0F172A'
                }}>
                  <img src={previewUrl} alt="Preview Bukti Unggahan" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      padding: '4px 10px', borderRadius: '8px', border: 'none',
                      background: 'rgba(220, 38, 38, 0.9)', color: '#FFF', fontSize: '11px',
                      fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label 
                  htmlFor="upload-modal-file-input"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '140px', borderRadius: '12px', border: '2px dashed #CBD5E1',
                    background: '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s', padding: '16px'
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Pilih File Foto Bukti</span>
                  <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Format JPG, PNG (Max 5MB)</span>
                  <input
                    id="upload-modal-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 20px', borderRadius: '10px',
                border: '1px solid #E2E8F0', background: '#F8FAFC',
                color: '#475569', fontSize: '13.5px', fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                padding: '11px 22px', borderRadius: '10px', border: '1px solid #991B1B',
                background: '#800000',
                color: '#FFFFFF', fontSize: '13.5px', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(128, 0, 0, 0.25)'
              }}
            >
              Kirim
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
```

## File: src/components/UploadView.jsx
```javascript
import { useState, useEffect, useMemo, useRef, memo } from 'react';
import ProjectTable from './ProjectTable';
import ReviewModal from './ReviewModal';
import { formatBranch, computeStats, exportProjectsToExcel } from '../utils';

const STATUS_OPTIONS = ['Belum Ada', 'Review', 'Selesai'];

// Helper: Cek apakah sebuah proyek memenuhi kriteria status tertentu
const projectMatchesStatus = (p, statusKey) => {
  const acts = p.activities || [];
  if (statusKey === 'Review') {
    return acts.some(a => 
      a.status === 'upload' || 
      a.status === 'need_review' || 
      a.status === 'pending' ||
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'upload' || ph.status === 'need_review'))
    );
  }
  if (statusKey === 'Selesai') {
    return acts.some(a => 
      a.status === 'verified' || 
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'verified'))
    );
  }
  if (statusKey === 'Belum Ada') {
    const hasReview = acts.some(a => 
      a.status === 'upload' || 
      a.status === 'need_review' || 
      a.status === 'pending' ||
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'upload' || ph.status === 'need_review'))
    );
    const hasVerified = acts.some(a => 
      a.status === 'verified' || 
      (Array.isArray(a.photos) && a.photos.some(ph => ph.status === 'verified'))
    );
    return !hasReview && !hasVerified;
  }
  return false;
};

// UploadView dibungkus React.memo agar TIDAK re-render saat menu profile di header dibuka/ditutup.
const UploadView = memo(function UploadView({ branches, initialBranch, verifyActivity, rejectActivity, uploadPhoto, deletePhoto, isAdmin = false }) {
  // Halaman Upload Activity Wajib difilter: OCC < 35%, ODP > 1, DAN Type Design === Greenfield
  const priorityBranches = useMemo(() => {
    return (Array.isArray(branches) ? branches : []).map(b => ({
      ...b,
      projects: (b.projects || []).filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      })
    })).filter(b => b.projects && b.projects.length > 0);
  }, [branches]);

  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (priorityBranches?.length === 1) return priorityBranches[0].name;
    return initialBranch || 'Semua Branch';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(STATUS_OPTIONS);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  // Jika akun user biasa hanya memiliki akses 1 branch, kunci selectedBranch ke branch tersebut
  useEffect(() => {
    if (priorityBranches?.length === 1 && selectedBranch !== priorityBranches[0].name) {
      setSelectedBranch(priorityBranches[0].name);
    }
  }, [priorityBranches, selectedBranch]);

  // ─── FOCUS PROJECT DARI NOTIFIKASI TOP BAR ───
  useEffect(() => {
    const focusTargetProject = (targetProject, targetBranch) => {
      if (!targetProject) return;
      if (targetBranch && (!initialBranch || priorityBranches?.length > 1)) {
        setSelectedBranch(targetBranch);
      }
      setSearch(targetProject);
      setSelectedStatuses(STATUS_OPTIONS);
      const el = document.getElementById('activity-section');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    };

    const handleFocusEvent = (e) => {
      const { projectName, branchName } = e.detail || {};
      focusTargetProject(projectName, branchName);
    };

    window.addEventListener('gtm-focus-project', handleFocusEvent);

    try {
      const params = new URLSearchParams(window.location.search);
      const qProject = params.get('project');
      if (qProject) {
        focusTargetProject(qProject);
      }
    } catch {
      // ignore
    }

    return () => window.removeEventListener('gtm-focus-project', handleFocusEvent);
  }, [initialBranch, priorityBranches]);

  // 1. Filter Branches based on dropdown
  const totalProjects = useMemo(() => priorityBranches.reduce((s, b) => s + (b.projects?.length || 0), 0), [priorityBranches]);

  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return priorityBranches;
    return priorityBranches.filter(b => b.name === selectedBranch);
  }, [priorityBranches, selectedBranch]);

  // 2. Compute dynamic stats (KPI) for the selected branch filter
  const stats = useMemo(() => computeStats(filteredBranches), [filteredBranches]);
  const totalProjectsInFilter = useMemo(() => {
    return filteredBranches.reduce((s, b) => s + (b.projects?.length || 0), 0);
  }, [filteredBranches]);

  // Hitung jumlah proyek per status pada branch yang sedang terpilih
  const statusCounts = useMemo(() => {
    let belumAda = 0;
    let review = 0;
    let selesai = 0;

    filteredBranches.forEach(b => {
      (b.projects || []).forEach(p => {
        if (projectMatchesStatus(p, 'Belum Ada')) belumAda++;
        if (projectMatchesStatus(p, 'Review')) review++;
        if (projectMatchesStatus(p, 'Selesai')) selesai++;
      });
    });

    return {
      'Belum Ada': belumAda,
      'Review': review,
      'Selesai': selesai
    };
  }, [filteredBranches]);

  const isStatusFiltered = isAdmin && selectedStatuses.length < STATUS_OPTIONS.length;

  // Hitung jumlah proyek yang memenuhi filter status pada branch yang sedang terpilih
  const statusMatchingProjectsCount = useMemo(() => {
    if (!isStatusFiltered) return totalProjectsInFilter;
    if (selectedStatuses.length === 0) return 0;
    return filteredBranches.reduce((count, b) => {
      return count + (b.projects || []).filter(p => selectedStatuses.some(st => projectMatchesStatus(p, st))).length;
    }, 0);
  }, [filteredBranches, isStatusFiltered, selectedStatuses, totalProjectsInFilter]);

  // 3. Filter Projects within those branches based on search text & status checkbox
  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      let projs = b.projects.filter(p => 
        !s || 
        p.name.toLowerCase().includes(s) || 
        (p.wok && p.wok.toLowerCase().includes(s)) ||
        (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
      );

      // Filter khusus Admin berdasarkan checkbox status
      if (isStatusFiltered) {
        projs = projs.filter(p => {
          if (selectedStatuses.length === 0) return false;
          return selectedStatuses.some(st => projectMatchesStatus(p, st));
        });
      }

      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search, isStatusFiltered, selectedStatuses]);

  // 4. Memoize multi-branch flatMap so a new array reference isn't created on every render
  const allProjectsMultiBranch = useMemo(() => {
    return branchesWithFilteredProjects.flatMap(b => b.projects.map(p => ({ ...p, branchName: b.name })));
  }, [branchesWithFilteredProjects]);

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey) {
    const [bName, pName] = modalKey.split('||');
    const b = branches.find(x => x.name === bName);
    const p = b?.projects.find(x => x.name === pName);
    if (p) {
      const totalAvai = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalUsed = p.odps.reduce((s, o) => s + o.used, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);

      modalData = {
        bName, pName, wok: p.wok,
        projectId: p.id,
        odps: p.odps,
        totalAvai, totalUsed, totalPort,
        odpCount: p.odps.length,
        activities: p.activities || []
      };
    }
  }

  const branchDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  // Keyboard Escape and click-outside listener for branch dropdown (R-32)
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Keyboard Escape and click-outside listener for status filter dropdown
  useEffect(() => {
    if (!isStatusDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStatusDropdownOpen]);

  const usedPct = useMemo(() => {
    return stats.totalPort > 0 ? (stats.totalUsed / stats.totalPort) * 100 : 0;
  }, [stats.totalUsed, stats.totalPort]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      

      {/* ─── 2. KPI SUMMARY GRID (3 CARDS MATCHING DASHBOARD METRICS STYLE) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Port Tersedia */}
        <div
          className="saas-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: 'none',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Port Tersedia
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {stats.totalAvai.toLocaleString('id-ID')}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Kapasitas:{' '}
            <span
              style={{
                fontWeight: 600,
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginLeft: '4px'
              }}
            >
              {stats.totalPort.toLocaleString('id-ID')}
            </span>
            <span style={{ marginLeft: '6px', color: '#64748B' }}>
              ({stats.totalUsed.toLocaleString('id-ID')} terpakai • {usedPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
            </span>
          </div>
        </div>

        {/* Card 2: Cakupan Proyek & ODP */}
        <div
          className="saas-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: 'none',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Cakupan Proyek & ODP
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {totalProjectsInFilter.toLocaleString('id-ID')}
            <span
              style={{
                fontSize: '20px',
                fontWeight: 500,
                color: '#64748B',
                letterSpacing: '-0.2px',
                marginLeft: '6px'
              }}
            >
              Proyek
            </span>
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Mencakup{' '}
            <span
              style={{
                fontWeight: 600,
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                margin: '0 4px'
              }}
            >
              {stats.odpCount.toLocaleString('id-ID')}
            </span>{' '}
            total titik ODP prioritas
          </div>
        </div>

        {/* Card 3: Aktivitas GTM Selesai */}
        <div
          className="saas-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: 'none',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Aktivitas GTM Selesai
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              margin: '18px 0 16px 0',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {stats.actCompletionPct.toLocaleString('id-ID')}%
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              height: '24px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Terverifikasi:{' '}
            <span
              style={{
                fontWeight: 600,
                color: '#1E293B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                marginLeft: '4px'
              }}
            >
              {stats.actVerified.toLocaleString('id-ID')}
            </span>
            <span style={{ marginLeft: '4px', color: '#64748B' }}>
              dari {stats.totalActivitySlots.toLocaleString('id-ID')} aktivitas
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. CONTROLS BAR (FILTER BRANCH, SEARCH, & EXPORT EXCEL) ─── */}
      <div className="controls-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Branch Dropdown */}
        {branches.length === 1 ? (
          <div className="branch-filter-capsule" style={{ height: '42px', minWidth: 'auto', border: '1px solid #CBD5E1', color: '#0F172A', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', background: '#FFFFFF', boxSizing: 'border-box' }}>
            <span className="branch-text-label" style={{ fontWeight: 600, fontSize: '13px' }}>Branch: {formatBranch(branches[0].name)}</span>
          </div>
        ) : (
          <div ref={branchDropdownRef} style={{ position: 'relative' }}>
            <button 
              type="button"
              className="branch-filter-capsule"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              aria-label="Pilih filter branch"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                height: '42px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderRadius: '10px',
                minWidth: '220px',
                gap: '10px',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
            >
              <span className="branch-text-label" style={{ flex: 1, fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                {selectedBranch === 'Semua Branch' 
                  ? `Semua Branch (${totalProjects})` 
                  : `${formatBranch(selectedBranch)} (${priorityBranches.find(x => x.name === selectedBranch)?.projects?.length || 0})`}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div role="listbox" aria-label="Daftar pilihan branch" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', width: '240px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)', zIndex: 1000, overflow: 'hidden' }}>
                <button 
                  type="button"
                  role="option"
                  aria-selected={selectedBranch === 'Semua Branch'}
                  className={`dropdown-item ${selectedBranch === 'Semua Branch' ? 'active' : ''}`}
                  onClick={() => { setSelectedBranch('Semua Branch'); setIsDropdownOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === 'Semua Branch' ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', fontWeight: selectedBranch === 'Semua Branch' ? 600 : 500, color: '#0F172A', cursor: 'pointer' }}
                >
                  Semua Branch ({totalProjects})
                </button>
                {priorityBranches.map(b => (
                  <button 
                    key={b.name}
                    type="button"
                    role="option"
                    aria-selected={selectedBranch === b.name}
                    className={`dropdown-item ${selectedBranch === b.name ? 'active' : ''}`}
                    onClick={() => { setSelectedBranch(b.name); setIsDropdownOpen(false); }}
                    style={{ width: '100%', textAlign: 'left', border: 'none', background: selectedBranch === b.name ? '#F1F5F9' : 'transparent', padding: '10px 16px', fontSize: '13px', fontWeight: selectedBranch === b.name ? 600 : 500, color: '#0F172A', cursor: 'pointer' }}
                  >
                    {formatBranch(b.name)} ({b.projects?.length || 0})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter Dropdown Status: Belum Ada, Review, Selesai (Khusus Admin) */}
        {isAdmin && (
          <div ref={statusDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="control-btn-mobile"
              aria-haspopup="true"
              aria-expanded={isStatusDropdownOpen}
              aria-label="Filter status proyek"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              style={{
                height: '42px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                flexShrink: 0,
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
                border: isStatusFiltered ? '1.5px solid #800000' : '1px solid #CBD5E1',
                backgroundColor: isStatusFiltered ? '#FFF5F5' : '#FFFFFF',
                color: isStatusFiltered ? '#800000' : '#0F172A',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isStatusFiltered) {
                  e.currentTarget.style.borderColor = '#94A3B8';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (!isStatusFiltered) {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              <span className="status-text-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                Status ({statusMatchingProjectsCount})
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isStatusFiltered ? '#800000' : '#64748B'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  flexShrink: 0
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isStatusDropdownOpen && (
              <div
                role="dialog"
                aria-label="Pilihan filter status proyek"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.18)',
                  zIndex: 1000,
                  width: '210px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#334155',
                  fontWeight: 500,
                  textAlign: 'left'
                }}
              >
                {/* Opsi Pilih Semua */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 2px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    borderBottom: '1px solid #F1F5F9',
                    marginBottom: '6px',
                    fontSize: '12px',
                    color: '#0F172A'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.length === STATUS_OPTIONS.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatuses(STATUS_OPTIONS);
                      } else {
                        setSelectedStatuses([]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>(Pilih Semua)</span>
                  <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                    ({totalProjectsInFilter})
                  </span>
                </label>

                {/* List Status Checkbox */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {STATUS_OPTIONS.map((st) => {
                    const isChecked = selectedStatuses.includes(st);
                    const count = statusCounts[st] || 0;
                    return (
                      <label
                        key={st}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 4px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          transition: 'background-color 0.1s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStatuses(prev => [...prev, st]);
                            } else {
                              setSelectedStatuses(prev => prev.filter(x => x !== st));
                            }
                          }}
                          style={{ cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: isChecked ? 600 : 500 }}>
                          {st}
                        </span>
                        <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                          ({count})
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Footer Actions (Reset & Terapkan) mirip ProjectTable */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #F1F5F9'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses(STATUS_OPTIONS)}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#64748B',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: 600
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(false)}
                    style={{
                      padding: '5px 14px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: 600
                    }}
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Input with Icon */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            aria-hidden="true"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="search-input-field"
            placeholder="Cari nama proyek, WOK, atau ODP..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ height: '42px', paddingLeft: '38px', paddingRight: search ? '36px' : '16px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px' }}
            aria-label="Cari proyek, WOK, atau ODP"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus kata kunci pencarian"
              style={{ position: 'absolute', right: '10px', border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        
        {/* Tombol Export Excel */}
        <button
          type="button"
          className="control-btn-mobile"
          onClick={() => exportProjectsToExcel(branches, selectedBranch)}
          aria-label="Ekspor data rekap proyek ke format file Excel (.xlsx)"
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#0F172A',
            fontWeight: 600,
            fontSize: '13px',
            padding: '0 18px',
            height: '42px',
            borderRadius: '10px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#94A3B8';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          title="Export Data Rekap Excel (.xlsx)"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Export Excel</span>
        </button>
      </div>

      {/* ─── BANNER FEEDBACK FILTER KHUSUS ADMIN ─── */}
      {isAdmin && isStatusFiltered && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            color: '#92400E',
            fontSize: '13.5px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>
              Menampilkan <strong>{allProjectsMultiBranch.length} proyek</strong> dengan filter status:{' '}
              <strong>{selectedStatuses.length === 0 ? 'Tidak ada status dipilih' : selectedStatuses.join(', ')}</strong>
              {selectedBranch !== 'Semua Branch' ? ` pada Branch ${formatBranch(selectedBranch)}.` : ' di seluruh branch.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStatuses(STATUS_OPTIONS)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCD34D',
              color: '#B45309',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF3C7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Reset Filter</span>
          </button>
        </div>
      )}

      {/* ─── 4. PROJECT TABLES & ACTIVITY CARDS ─── */}
      {selectedBranch === 'Semua Branch' ? (
        branchesWithFilteredProjects.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <ProjectTable 
              projects={allProjectsMultiBranch} 
              branchName="Multi Branch" 
              uploadPhoto={uploadPhoto}
              onReview={openModal}
              onResetSearch={() => setSearch('')}
            />
          </div>
        )
      ) : (
        branchesWithFilteredProjects.map(b => (
          <div key={b.name} style={{ marginBottom: '32px' }}>
            <ProjectTable 
              projects={b.projects} 
              branchName={b.name} 
              uploadPhoto={uploadPhoto}
              onReview={openModal}
              onResetSearch={() => setSearch('')}
            />
          </div>
        ))
      )}
      
      {branchesWithFilteredProjects.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
            {isAdmin && isStatusFiltered 
              ? 'Tidak ada proyek dengan status terpilih' 
              : 'Tidak ada proyek yang sesuai kriteria'}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '420px', lineHeight: 1.5 }}>
            {isAdmin && isStatusFiltered
              ? `Tidak ditemukan proyek Greenfield dengan status ${selectedStatuses.join(', ')} pada branch ini.`
              : 'Tidak ditemukan proyek Greenfield dengan kata kunci pencarian atau filter branch yang dipilih.'}
          </p>
          {(search || selectedBranch !== 'Semua Branch' || (isAdmin && isStatusFiltered)) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedBranch('Semua Branch');
                if (isAdmin) setSelectedStatuses(STATUS_OPTIONS);
              }}
              style={{
                marginTop: '6px',
                padding: '8px 18px',
                background: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Reset Pencarian & Filter
            </button>
          )}
        </div>
      )}

      {/* Reusing the Review Modal and passing verifyActivity & rejectActivity */}
      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} rejectActivity={rejectActivity} deletePhoto={deletePhoto} />
    </div>
  );
});

export default UploadView;
```

## File: src/constants/dashboard.js
```javascript
// Struktur Branch → WOK & urutan jenis kegiatan pada tabel Executive Summary Dashboard
export const BRANCH_WOK_MATRIX = [
  {
    branch: 'MAGELANG',
    woks: ['KEBUMEN', 'MAGELANG TEMANGGUNG']
  },
  {
    branch: 'PEKALONGAN',
    woks: ['BATANG', 'PEMALANG PURBALINGGA', 'TEGAL BREBES']
  },
  {
    branch: 'PURWOKERTO',
    woks: ['CILACAP BANYUMAS', 'WONOSOBO BANJARNEGARA']
  },
  {
    branch: 'SEMARANG',
    woks: ['DEMAK', 'JEPARA KUDUS - PATI', 'SEMARANG 1', 'SEMARANG 2']
  },
  {
    branch: 'SURAKARTA',
    woks: ['BOYOLALI', 'SRAGEN', 'SURAKARTA']
  },
  {
    branch: 'YOGYAKARTA',
    woks: ['YOGYA 1', 'YOGYA 2']
  }
];

export const ACT_TYPES_ORDER = [
  { key: 'tsel_menyapa', shortLabel: 'Tsel Menyapa', label: 'Tsel Menyapa' },
  { key: 'branding_outlet', shortLabel: 'Branding Outlet', label: 'Branding Outlet' },
  { key: 'bumdes', shortLabel: 'BUMDES', label: 'BUMDES' },
  { key: 'rekrutmen_sf', shortLabel: 'Rekrut SF', label: 'Rekrut SF' },
  { key: 'open_table', shortLabel: 'Open Table', label: 'Open Table' }
];
```

## File: src/constants/gapWow.js
```javascript
// Nilai Gap WoW cadangan per branch & per WOK (dipakai ranking bila nilai dari Excel tidak tersedia)
export const GAP_WOW_MAP_BY_FILTER = {
  ALL: {
    MAGELANG: -0.0024,  // -0.24% (▼ -0.2%)
    PEKALONGAN: 0.0055, // +0.55% (▲ +0.5%)
    PURWOKERTO: -0.0034,// -0.34% (▼ -0.3%)
    SEMARANG: 0.0024,   // +0.24% (▲ +0.2%)
    SURAKARTA: 0.0016,  // +0.16% (▲ +0.2%)
    YOGYAKARTA: 0.0062  // +0.62% (▲ +0.6%)
  },
  Greenfield: {
    MAGELANG: 0.0067,   // +0.67% (▲ +0.7%)
    PEKALONGAN: 0.0084, // +0.84% (▲ +0.8%)
    PURWOKERTO: 0.0005, // +0.05% (▲ +0.1%)
    SEMARANG: 0.0049,   // +0.49% (▲ +0.5%)
    SURAKARTA: 0.0056,  // +0.56% (▲ +0.6%)
    YOGYAKARTA: -0.0004 // -0.04% (▼ -0.0%)
  },
  Brownfield: {
    MAGELANG: -0.0116,  // -1.16% (▼ -1.2%)
    PEKALONGAN: 0.0018, // +0.18% (▲ +0.2%)
    PURWOKERTO: -0.0039,// -0.39% (▼ -0.4%)
    SEMARANG: -0.0008,  // -0.08% (▼ -0.1%)
    SURAKARTA: -0.0022, // -0.22% (▼ -0.2%)
    YOGYAKARTA: 0.0100  // +1.00% (▲ +1.0%)
  }
};

export const WOK_GAP_WOW_MAP = {
  ALL: {
    'MAGELANG||KEBUMEN': 0.0085,
    'MAGELANG||MAGELANG TEMANGGUNG': -0.0117,
    'PEKALONGAN||BATANG': 0.0047,
    'PEKALONGAN||PEMALANG PURBALINGGA': 0.0095,
    'PEKALONGAN||TEGAL BREBES': 0.0046,
    'PURWOKERTO||CILACAP BANYUMAS': 0.0061,
    'PURWOKERTO||WONOSOBO BANJARNEGARA': -0.0064,
    'SEMARANG||DEMAK': 0.0032,
    'SEMARANG||JEPARA KUDUS - PATI': 0.0043,
    'SEMARANG||SEMARANG 1': -0.0025,
    'SEMARANG||SEMARANG 2': 0.0053,
    'SURAKARTA||BOYOLALI': 0.0003,
    'SURAKARTA||SRAGEN': -0.0014,
    'SURAKARTA||SURAKARTA': 0.0132,
    'YOGYAKARTA||YOGYA 1': 0.0047,
    'YOGYAKARTA||YOGYA 2': 0.0074
  },
  Greenfield: {
    'MAGELANG||KEBUMEN': 0.0091,
    'MAGELANG||MAGELANG TEMANGGUNG': 0.0036,
    'PEKALONGAN||BATANG': 0.0083,
    'PEKALONGAN||PEMALANG PURBALINGGA': 0.0139,
    'PEKALONGAN||TEGAL BREBES': 0.0066,
    'PURWOKERTO||CILACAP BANYUMAS': 0.0037,
    'PURWOKERTO||WONOSOBO BANJARNEGARA': 0.0008,
    'SEMARANG||DEMAK': 0.0064,
    'SEMARANG||JEPARA KUDUS - PATI': 0.0027,
    'SEMARANG||SEMARANG 1': 0.0037,
    'SEMARANG||SEMARANG 2': 0.0067,
    'SURAKARTA||BOYOLALI': 0.0018,
    'SURAKARTA||SRAGEN': 0.0000,
    'SURAKARTA||SURAKARTA': 0.0227,
    'YOGYAKARTA||YOGYA 1': 0.0012,
    'YOGYAKARTA||YOGYA 2': -0.0028
  },
  Brownfield: {
    'MAGELANG||KEBUMEN': 0.0077,
    'MAGELANG||MAGELANG TEMANGGUNG': -0.0228,
    'PEKALONGAN||BATANG': -0.0009,
    'PEKALONGAN||PEMALANG PURBALINGGA': 0.0025,
    'PEKALONGAN||TEGAL BREBES': 0.0027,
    'PURWOKERTO||CILACAP BANYUMAS': 0.0069,
    'PURWOKERTO||WONOSOBO BANJARNEGARA': -0.0147,
    'SEMARANG||DEMAK': -0.0058,
    'SEMARANG||JEPARA KUDUS - PATI': 0.0076,
    'SEMARANG||SEMARANG 1': -0.0053,
    'SEMARANG||SEMARANG 2': 0.0048,
    'SURAKARTA||BOYOLALI': -0.0026,
    'SURAKARTA||SRAGEN': -0.0018,
    'SURAKARTA||SURAKARTA': 0.0000,
    'YOGYAKARTA||YOGYA 1': 0.0082,
    'YOGYAKARTA||YOGYA 2': 0.0110
  }
};
```

## File: src/constants/programs.js
```javascript
export const SHOW_PROGRAM_MENU = true; // Feature flag to toggle PROGRAM menu visibility

export const SESSION_1_MONTHS = [
  { id: '2026-01', label: 'Januari 2026' },
  { id: '2026-02', label: 'Februari 2026' },
  { id: '2026-03', label: 'Maret 2026' },
  { id: '2026-04', label: 'April 2026' },
  { id: '2026-05', label: 'Mei 2026' },
  { id: '2026-06', label: 'Juni 2026' }
];

export const SESSION_2_MONTHS = [
  { id: '2026-07', label: 'Juli 2026' },
  { id: '2026-08', label: 'Agustus 2026', isCurrent: true },
  { id: '2026-09', label: 'September 2026' },
  { id: '2026-10', label: 'Oktober 2026' },
  { id: '2026-11', label: 'November 2026' },
  { id: '2026-12', label: 'Desember 2026' }
];

export const PROGRAM_PLACEHOLDERS = {
  'Agustus 2026': [
    'Program GTM Tsel Menyapa Warga',
    'Program Branding Outlet Priority',
    'Program Insentif BUMDes & SF',
    'Program Open Table Tematik'
  ]
};
```

## File: src/hooks/useActivityActions.js
```javascript
import { useCallback } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useAuth } from '../auth/AuthContext';
import { useMonitoringData } from './useMonitoringData';

// Aksi kegiatan GTM per proyek: unggah foto, verifikasi & tolak (Admin), hapus foto.
// Setelah aksi, data monitoring diambil ulang (TanStack Query invalidate) — sama seperti fetchData() sebelumnya.
export function useActivityActions() {
  const { isAdmin } = useAuth();
  const { branches, refresh } = useMonitoringData();

  const uploadPhoto = useCallback(async (branchName, projectName, actType, payload) => {
    let file = payload;
    let planDate = null;
    let namaOutlet = null;
    let namaBumdes = null;
    let kodeSf = null;
    let keterangan = null;

    if (payload && typeof payload === 'object' && !(payload instanceof File)) {
      file = payload.file;
      planDate = payload.planDate;
      namaOutlet = payload.namaOutlet;
      namaBumdes = payload.namaBumdes;
      kodeSf = payload.kodeSf;
      keterangan = payload.keterangan;
    }

    const b = branches.find(x => x.name === branchName);
    const p = b?.projects.find(x => x.name === projectName);

    const formData = new FormData();
    formData.append('branchName', branchName);
    formData.append('projectName', projectName);
    formData.append('wokName', p?.wok || 'WOK');
    formData.append('type', actType);
    if (file) formData.append('photo', file);
    if (planDate) formData.append('planDate', planDate);
    if (namaOutlet) formData.append('namaOutlet', namaOutlet);
    if (namaBumdes) formData.append('namaBumdes', namaBumdes);
    if (kodeSf) formData.append('kodeSf', kodeSf);
    if (keterangan) formData.append('keterangan', keterangan);

    try {
      const res = await authFetch(`${API_BASE_URL}/api/activities`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await refresh();
        return { success: true };
      } else {
        if (res.status === 401) return { success: false, error: 'Sesi login berakhir.' };
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || errData.message || `Gagal menyimpan kegiatan (Status ${res.status}).`;
        alert(`❌ ${errMsg}`);
        await refresh();
        return { success: false, error: errMsg };
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('❌ Gagal terhubung ke server saat mengunggah kegiatan. Periksa koneksi lalu coba lagi.');
      await refresh();
      return { success: false, error: err.message };
    }
  }, [branches, refresh]);

  const verifyActivity = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    if (!isAdmin) return false;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          photoId,
          projectId
        })
      });
      if (res.ok) {
        await refresh();
        return true;
      }
      if (res.status !== 401) {
        const data = await res.json().catch(() => ({}));
        alert(`❌ ${data.message || data.error || `Gagal memverifikasi activity (Status ${res.status}).`}`);
      }
      return false;
    } catch (err) {
      console.error('Error verifying activity:', err);
      alert('❌ Terjadi kesalahan server saat memverifikasi activity.');
      return false;
    }
  }, [isAdmin, refresh]);

  const rejectActivity = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    if (!isAdmin) return false;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          photoId,
          projectId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refresh();
        return true;
      } else {
        if (res.status !== 401) alert(`❌ ${data.message || 'Gagal menolak verifikasi activity.'}`);
        return false;
      }
    } catch (err) {
      console.error('Error rejecting activity:', err);
      alert('❌ Terjadi kesalahan server saat menolak verifikasi.');
      return false;
    }
  }, [isAdmin, refresh]);

  const deletePhoto = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/activities/delete-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ branchName, projectName, type: actType, photoId, projectId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refresh();
        return true;
      } else {
        if (res.status !== 401) alert(`❌ ${data.message || 'Gagal menghapus foto.'}`);
        return false;
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('❌ Terjadi kesalahan saat menghapus foto.');
      return false;
    }
  }, [refresh]);

  return { uploadPhoto, verifyActivity, rejectActivity, deletePhoto };
}
```

## File: src/hooks/useAdminMonitoring.js
```javascript
import { useState, useMemo } from 'react';
import { computeStats } from '../utils';

// Tab "Monitoring & Verifikasi Proyek": LOP prioritas, filter branch / status / pencarian & statistik terkait
export function useAdminMonitoring(branches) {
  const priorityBranches = useMemo(() => {
    return (branches || []).map(b => ({
      ...b,
      projects: (b.projects || []).filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      })
    })).filter(b => b.projects && b.projects.length > 0);
  }, [branches]);

  const totalProjects = useMemo(() => priorityBranches.reduce((s, b) => s + (b.projects?.length || 0), 0), [priorityBranches]);

  // Monitoring Filters States
  const [selectedBranch, setSelectedBranch] = useState('Semua Branch');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'need_review' | 'verified' | 'pending'
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Filter Branches and Projects for Monitoring Tab
  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return priorityBranches;
    return priorityBranches.filter(b => b.name === selectedBranch);
  }, [priorityBranches, selectedBranch]);

  // Dynamic KPI stats recalculated based on the selected branch filter
  const stats = useMemo(() => computeStats(filteredBranches), [filteredBranches]);

  // Hitung jumlah proyek per status filter (Semua, Menunggu Verifikasi, Sudah Terverifikasi, Belum Dikerjakan)
  const statusCounts = useMemo(() => {
    let needReviewCount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;
    let totalCount = 0;

    filteredBranches.forEach(b => {
      (b.projects || []).forEach(p => {
        totalCount++;
        const acts = p.activities || [];
        if (acts.some(a => a.status === 'upload')) {
          needReviewCount++;
        } else if (acts.some(a => a.status === 'verified')) {
          verifiedCount++;
        } else if (acts.length === 0 || acts.every(a => a.status === 'belum')) {
          pendingCount++;
        }
      });
    });

    return {
      all: totalCount,
      need_review: needReviewCount,
      verified: verifiedCount,
      pending: pendingCount
    };
  }, [filteredBranches]);

  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      let projs = (b.projects || []).filter(p => 
        !s || 
        p.name.toLowerCase().includes(s) || 
        (p.wok && p.wok.toLowerCase().includes(s)) ||
        (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
      );

      // Apply status filter
      if (statusFilter === 'need_review') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'upload'));
      } else if (statusFilter === 'verified') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'verified'));
      } else if (statusFilter === 'pending') {
        projs = projs.filter(p => !p.activities || p.activities.length === 0 || p.activities.every(a => a.status === 'belum'));
      }

      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search, statusFilter]);

  const allProjectsMultiBranch = useMemo(() => {
    return branchesWithFilteredProjects.flatMap(b => b.projects.map(p => ({ ...p, branchName: b.name })));
  }, [branchesWithFilteredProjects]);

  return {
    priorityBranches, totalProjects,
    selectedBranch, setSelectedBranch, search, setSearch, statusFilter, setStatusFilter,
    isBranchDropdownOpen, setIsBranchDropdownOpen, isStatusDropdownOpen, setIsStatusDropdownOpen,
    filteredBranches, stats, statusCounts, branchesWithFilteredProjects, allProjectsMultiBranch
  };
}
```

## File: src/hooks/useAppNotifications.js
```javascript
import { useMemo } from 'react';
import { ACT_TYPES } from '../utils';

/**
 * Hook untuk menghitung dan mengelompokkan notifikasi aktivitas:
 * - Admin: seluruh aktivitas yang berstatus 'upload' / menunggu verifikasi di semua branch.
 * - User (Akun Branch): aktivitas yang telah disetujui ('verified') oleh admin KHUSUS pada branch milik user.
 */
export function useAppNotifications(branches, user, isAdmin) {
  return useMemo(() => {
    if (!user) {
      return { notifications: [], count: 0 };
    }

    const items = [];

    if (isAdmin) {
      // ─── ADMIN: Menampilkan kegiatan yang diunggah & menunggu verifikasi ───
      (branches || []).forEach((b) => {
        (b.projects || []).forEach((p) => {
          (p.activities || []).forEach((a) => {
            const hasUploadStatus = a.status === 'upload' || a.status === 'need_review' || a.status === 'pending';
            const uploadPhotos = Array.isArray(a.photos) ? a.photos.filter((ph) => ph.status === 'upload' || ph.status === 'need_review') : [];

            if (hasUploadStatus || uploadPhotos.length > 0) {
              const actMeta = ACT_TYPES.find((t) => t.key === a.type);
              const actLabel = actMeta?.label || a.type;
              const latestPhoto = uploadPhotos[uploadPhotos.length - 1];
              const timestamp = latestPhoto?.createdAt || latestPhoto?.updatedAt || a.updatedAt || a.createdAt;

              items.push({
                id: `admin-${b.name}-${p.name}-${a.type}`,
                branchName: b.name,
                projectName: p.name,
                wok: p.wok,
                actType: a.type,
                actLabel,
                status: 'upload',
                title: actLabel,
                timestamp
              });
            }
          });
        });
      });
    } else if (user.role === 'USER' && user.branchName) {
      // ─── USER: Menampilkan kegiatan yang telah disetujui admin pada branch user tersebut saja ───
      const userBranchNormalized = user.branchName.trim().toUpperCase();
      const targetBranch = (branches || []).find((b) => b.name?.trim().toUpperCase() === userBranchNormalized);

      if (targetBranch) {
        (targetBranch.projects || []).forEach((p) => {
          (p.activities || []).forEach((a) => {
            const isVerified = a.status === 'verified';
            const verifiedPhotos = Array.isArray(a.photos) ? a.photos.filter((ph) => ph.status === 'verified') : [];

            if (isVerified || verifiedPhotos.length > 0) {
              const actMeta = ACT_TYPES.find((t) => t.key === a.type);
              const actLabel = actMeta?.label || a.type;
              const latestPhoto = verifiedPhotos[verifiedPhotos.length - 1];
              const timestamp = latestPhoto?.updatedAt || latestPhoto?.createdAt || a.updatedAt;

              items.push({
                id: `user-${targetBranch.name}-${p.name}-${a.type}`,
                branchName: targetBranch.name,
                projectName: p.name,
                wok: p.wok,
                actType: a.type,
                actLabel,
                status: 'verified',
                title: actLabel,
                timestamp
              });
            }
          });
        });
      }
    }

    // Urutkan dari notifikasi dengan timestamp terbaru jika tersedia
    items.sort((x, y) => {
      const tx = x.timestamp ? new Date(x.timestamp).getTime() : 0;
      const ty = y.timestamp ? new Date(y.timestamp).getTime() : 0;
      return ty - tx;
    });

    return {
      notifications: items,
      count: items.length
    };
  }, [branches, user, isAdmin]);
}
```

## File: src/hooks/useCountUp.js
```javascript
import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp hook
 * Animates a numeric value from startVal (or previous value) to targetVal
 * Uses cubic ease-out: 1 - Math.pow(1 - progress, 3)
 * Respects prefers-reduced-motion and in-view enabled trigger
 *
 * @param {number} targetValue - Target number to count up to
 * @param {object} options
 * @param {boolean} [options.enabled=true] - Only start animation when enabled is true
 * @param {number} [options.duration=800] - Duration in ms
 * @param {number} [options.decimals=0] - Decimal places
 * @param {number} [options.delay=0] - Delay in ms before starting
 * @param {boolean} [options.formatThousands=true] - Format with id-ID thousand separator
 * @returns {string} Formatted display value
 */
export function useCountUp(targetValue = 0, {
  enabled = true,
  duration = 800,
  decimals = 0,
  delay = 0,
  formatThousands = true
} = {}) {
  const isReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [displayValue, setDisplayValue] = useState(() => (isReducedMotion ? (Number(targetValue) || 0) : 0));
  
  const prevTargetRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // If not enabled yet, keep at 0
    if (!enabled) {
      return;
    }

    const endVal = Number(targetValue) || 0;

    if (isReducedMotion) {
      setDisplayValue(endVal);
      prevTargetRef.current = endVal;
      return;
    }

    const startVal = prevTargetRef.current;
    if (startVal === endVal && displayValue === endVal) {
      return;
    }

    const startTime = performance.now() + delay;

    const animate = (currentTime) => {
      if (currentTime < startTime) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Natural cubic ease-out
      const easeProgress = 1 - Math.pow(1 - rawProgress, 3);
      const currentVal = startVal + (endVal - startVal) * easeProgress;

      setDisplayValue(currentVal);

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        prevTargetRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetValue, duration, delay, isReducedMotion, enabled]);

  const numVal = Number(displayValue) || 0;

  if (decimals > 0) {
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(numVal * factor) / factor;
    return rounded.toFixed(decimals);
  }

  const roundedInt = Math.round(numVal);
  if (formatThousands) {
    return roundedInt.toLocaleString('id-ID');
  }
  return String(roundedInt);
}

export default useCountUp;
```

## File: src/hooks/useExecutiveSummary.js
```javascript
import { useMemo } from 'react';
import { BRANCH_WOK_MATRIX, ACT_TYPES_ORDER } from '../constants/dashboard';

// Executive Summary Computation per Branch & WOK (LOP prioritas Greenfield: selesai / belum per jenis kegiatan)
export function useExecutiveSummary(branches) {
  return useMemo(() => {
    let grandTotalLop = 0;
    const grandTotalDone = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
    const grandTotalNotYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

    const rows = [];

    BRANCH_WOK_MATRIX.forEach(group => {
      const bData = (branches || []).find(b => (b.name || '').toString().trim().toUpperCase() === group.branch);
      const allProjects = bData?.projects || [];

      // Filter Greenfield Priority Projects
      const priorityProjects = allProjects.filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      });

      group.woks.forEach((wokName, wIdx) => {
        const wokProjects = priorityProjects.filter(p => {
          const pWok = (p.wok || '').toString().trim().toUpperCase();
          const cleanP = pWok.replace(/[\s-]/g, '');
          const cleanW = wokName.replace(/[\s-]/g, '');
          return pWok === wokName || cleanP === cleanW || cleanP.includes(cleanW) || cleanW.includes(cleanP);
        });

        const lopCount = wokProjects.length;
        grandTotalLop += lopCount;

        const done = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };
        const notYet = { tsel_menyapa: 0, branding_outlet: 0, bumdes: 0, rekrutmen_sf: 0, open_table: 0 };

        ACT_TYPES_ORDER.forEach(item => {
          const k = item.key;
          const verifiedCount = wokProjects.filter(p => p.activities?.some(a => a.type === k && a.status === 'verified')).length;
          done[k] = verifiedCount;
          notYet[k] = lopCount - verifiedCount;

          grandTotalDone[k] += verifiedCount;
          grandTotalNotYet[k] += lopCount - verifiedCount;
        });

        const totalDoneWok = ACT_TYPES_ORDER.reduce((s, item) => s + done[item.key], 0);
        const totalSlotsWok = lopCount * 5;
        const progressPct = totalSlotsWok > 0 ? Math.round((totalDoneWok / totalSlotsWok) * 1000) / 10 : 0;

        rows.push({
          branch: group.branch,
          wok: wokName,
          isFirstInBranch: wIdx === 0,
          isLastInBranch: wIdx === group.woks.length - 1,
          branchRowSpan: group.woks.length,
          lopCount,
          done,
          notYet,
          progressPct
        });
      });
    });

    const grandTotalDoneAll = ACT_TYPES_ORDER.reduce((s, item) => s + grandTotalDone[item.key], 0);
    const grandTotalSlotsAll = grandTotalLop * 5;
    const grandProgressPct = grandTotalSlotsAll > 0 ? Math.round((grandTotalDoneAll / grandTotalSlotsAll) * 1000) / 10 : 0;

    return {
      rows,
      grandTotalLop,
      grandTotalDone,
      grandTotalNotYet,
      grandProgressPct,
      grandTotals: {
        lop: grandTotalLop,
        done: grandTotalDone,
        notYet: grandTotalNotYet,
        progressPct: grandProgressPct
      }
    };
  }, [branches]);
}
```

## File: src/hooks/useExecutiveSummaryExport.js
```javascript
import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

// Unduh tabel Executive Summary (#executive-summary-wrapper) sebagai gambar PNG
export function useExecutiveSummaryExport() {
  const [isExportingPng, setIsExportingPng] = useState(false);

  const handleDownloadPNG = useCallback(async () => {
    const tableWrapper = document.getElementById('executive-summary-wrapper');
    if (!tableWrapper || isExportingPng) return;

    try {
      setIsExportingPng(true);

      const canvas = await html2canvas(tableWrapper, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedWrapper = clonedDoc.getElementById('executive-summary-wrapper');
          if (clonedWrapper) {
            const clonedTable = clonedWrapper.querySelector('table');
            const totalScrollWidth = Math.max(clonedTable?.scrollWidth || 0, clonedWrapper.scrollWidth || 0, 1250) + 60;

            clonedWrapper.style.maxHeight = 'none';
            clonedWrapper.style.overflowY = 'visible';
            clonedWrapper.style.overflowX = 'visible';
            clonedWrapper.style.width = `${totalScrollWidth}px`;
            clonedWrapper.style.maxWidth = 'none';

            if (clonedTable) {
              clonedTable.style.width = `${totalScrollWidth}px`;
              clonedTable.style.minWidth = `${totalScrollWidth}px`;
            }

            const stickyEls = clonedWrapper.querySelectorAll('[style*="sticky"]');
            stickyEls.forEach(el => {
              el.style.position = 'static';
            });
          }
        }
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Executive_Summary_GTM_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      setIsExportingPng(false);
    }
  }, [isExportingPng]);

  return { isExportingPng, handleDownloadPNG };
}
```

## File: src/hooks/useGtmMonitoring.js
```javascript
import { useMemo } from 'react';
import { computeStats, BRANCH_COLORS } from '../utils';
import { GAP_WOW_MAP_BY_FILTER, WOK_GAP_WOW_MAP } from '../constants/gapWow';

// Ranking branch (urut OCC terendah) beserta rincian metrik per WOK & Gap WoW
export function useGtmMonitoring(branches, typeDesignFilter) {
  return useMemo(() => {
    return (branches || []).map(b => {
      const st = computeStats([b], typeDesignFilter);
      // Gunakan OCC BRANCH dari kolom Excel jika filter ALL dan b.occRate tersedia, jika tidak gunakan st.occRate
      const occRate = (typeDesignFilter === 'ALL' && b.occRate !== null && b.occRate !== undefined)
        ? Math.round(b.occRate * 1000) / 10
        : st.occRate;

      const bUpper = b.name?.toString().trim().toUpperCase();
      const currentFilterMap = GAP_WOW_MAP_BY_FILTER[typeDesignFilter] || GAP_WOW_MAP_BY_FILTER.ALL;

      let rawGap = 0;
      if (typeDesignFilter !== 'ALL') {
        rawGap = currentFilterMap[bUpper] !== undefined ? currentFilterMap[bUpper] : 0;
      } else {
        const isOldRawSnapshot = b.gapWoW !== null && b.gapWoW !== undefined && b.gapWoW < -0.03 && Math.abs(b.gapWoW - (currentFilterMap[bUpper] || 0)) > 0.02;
        rawGap = (b.gapWoW !== null && b.gapWoW !== undefined && !isOldRawSnapshot)
          ? b.gapWoW
          : (currentFilterMap[bUpper] !== undefined ? currentFilterMap[bUpper] : 0);
      }

      const delta = Math.round(rawGap * 1000) / 10;
      const filteredProjs = (b && Array.isArray(b.projects))
        ? (typeDesignFilter === 'ALL' ? b.projects : b.projects.filter(p => (p.typeDesign || 'Greenfield') === typeDesignFilter))
        : [];

      // Kalkulasi Rincian Metrik per WOK di dalam Branch
      const branchWokNames = Array.from(new Set(
        (b.projects || [])
          .map(p => (p.wok || '').toString().trim())
          .filter(w => w && w !== '-' && w !== 'NONE')
      )).sort();

      const currentWokFilterMap = WOK_GAP_WOW_MAP[typeDesignFilter] || WOK_GAP_WOW_MAP.ALL;
      const actKeys = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];

      const woks = branchWokNames.map(wokName => {
        const cleanWok = wokName.toUpperCase();
        const wokProjects = (b.projects || []).filter(p => {
          const pWok = (p.wok || '').toString().trim().toUpperCase();
          const cleanP = pWok.replace(/[\s-]/g, '');
          const cleanW = cleanWok.replace(/[\s-]/g, '');
          const isWokMatch = pWok === cleanWok || cleanP === cleanW || cleanP.includes(cleanW) || cleanW.includes(cleanP);
          if (!isWokMatch) return false;
          if (typeDesignFilter === 'ALL') return true;
          return (p.typeDesign || 'Greenfield') === typeDesignFilter;
        });

        const wokProjCount = wokProjects.length;
        const wokUsed = wokProjects.reduce((s, p) => s + (p.usedTotal ?? (p.odps || []).reduce((so, o) => so + (o.used || 0), 0)), 0);
        const wokTotal = wokProjects.reduce((s, p) => s + (p.totalPort ?? (p.odps || []).reduce((so, o) => so + (o.total || 0), 0)), 0);
        const wokOccRate = wokTotal > 0 ? Math.round((wokUsed / wokTotal) * 1000) / 10 : 0;

        let verifiedCount = 0;
        wokProjects.forEach(p => {
          actKeys.forEach(k => {
            if (p.activities?.some(a => a.type === k && a.status === 'verified')) {
              verifiedCount++;
            }
          });
        });
        const totalSlots = wokProjCount * 5;
        const wokActPct = totalSlots > 0 ? Math.round((verifiedCount / totalSlots) * 1000) / 10 : 0;

        const wokDeltaKey = `${bUpper}||${cleanWok}`;
        const rawWokDelta = currentWokFilterMap[wokDeltaKey] !== undefined ? currentWokFilterMap[wokDeltaKey] : 0;
        const wokDelta = Math.round(rawWokDelta * 1000) / 10;

        return {
          name: wokName,
          occRate: wokOccRate,
          totalUsed: wokUsed,
          totalPort: wokTotal,
          delta: wokDelta,
          projCount: wokProjCount,
          actPct: wokActPct
        };
      }).filter(w => w.projCount > 0);

      return {
        name: b.name, occRate, projCount: filteredProjs.length, actPct: st.actCompletionPct,
        totalUsed: st.totalUsed, totalPort: st.totalPort,
        color: BRANCH_COLORS[bUpper] || BRANCH_COLORS[b.name] || '#64748b', delta, woks
      };
    }).sort((a, b) => a.occRate - b.occRate);
  }, [branches, typeDesignFilter]);
}
```

## File: src/hooks/useInView.js
```javascript
import { useState, useEffect, useRef } from 'react';

/**
 * useInView hook
 * Observes an element and returns whether it is currently visible in the viewport.
 * 
 * @param {object} options
 * @param {number} [options.threshold=0.15] - Percentage of target visible before triggering
 * @param {string} [options.rootMargin='-40px 0px'] - Margin around the root
 * @param {boolean} [options.triggerOnce=true] - Only trigger once or continuously track
 * @returns {[React.RefObject, boolean]} [ref, isInView]
 */
export function useInView({
  threshold = 0.15,
  rootMargin = '-20px 0px',
  triggerOnce = true
} = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView];
}

export default useInView;
```

## File: src/hooks/useLastUpdateLabel.js
```javascript
import { useMemo } from 'react';

// Label "Pembaruan data: 21 Oktober 2026" — dari ImportMeta, atau aktivitas terbaru bila ImportMeta kosong
export function useLastUpdateLabel(importMeta, branches) {
  return useMemo(() => {
    let rawDate = importMeta?.updatedAt || importMeta?.lastUpdate;

    if (!rawDate && branches && branches.length > 0) {
      let latestTime = 0;
      branches.forEach(b => {
        (b.projects || []).forEach(p => {
          (p.activities || []).forEach(a => {
            if (a.updatedAt) {
              const t = new Date(a.updatedAt).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
            if (a.actualDate) {
              const t = new Date(a.actualDate).getTime();
              if (!isNaN(t) && t > latestTime) latestTime = t;
            }
          });
        });
      });
      if (latestTime > 0) {
        rawDate = new Date(latestTime);
      }
    }

    if (!rawDate) {
      rawDate = new Date();
    }

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;

    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return `${d.getDate()} ${monthsIndo[d.getMonth()]} ${d.getFullYear()}`;
  }, [importMeta, branches]);
}
```

## File: src/hooks/useMonitoringData.js
```javascript
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMonitoringData, queryKeys } from '../api/queries';
import { useAuth } from '../auth/AuthContext';

const EMPTY_BRANCHES = [];

// Data monitoring (branch → proyek → ODP & aktivitas) + ringkasan Jateng DIY, per akun yang login.
// Cache 60 detik; diperbarui diam-diam saat tab aktif kembali & setelah aksi (upload/verifikasi/hapus/import).
export function useMonitoringData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userKey = user ? `${user.id ?? user.username}:${user.role}` : null;

  const query = useQuery({
    queryKey: queryKeys.monitoring(userKey),
    queryFn: fetchMonitoringData,
    enabled: !!user
  });

  // Ambil ulang data monitoring & tunggu sampai selesai (pengganti fetchData() lama)
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.monitoringAll }),
    [queryClient]
  );

  return {
    branches: query.data?.branches ?? EMPTY_BRANCHES,
    importMeta: query.data?.importMeta ?? null,
    // Layar "Memuat data" hanya saat belum ada data sama sekali (refetch latar belakang tidak menampilkannya)
    isInitialLoading: !!user && query.isPending,
    isError: query.isError,
    refresh
  };
}
```

## File: src/hooks/useOdpImport.js
```javascript
import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { watchJobEvents } from '../jobEvents';

// Update Data ODP mingguan (Excel) → diproses worker latar belakang, progres via SSE. onUpdate = muat ulang data monitoring.
export function useOdpImport({ onUpdate }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  // Progres import ODP dari worker latar belakang (ditampilkan di teks tombol)
  const [importProgress, setImportProgress] = useState('');
  const importAbortRef = useRef(null);
  useEffect(() => () => importAbortRef.current?.abort(), []);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);
    setImportProgress('');

    const formData = new FormData();
    formData.append('file', file);
    const abortController = new AbortController();
    importAbortRef.current = abortController;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/admin/import-excel`, {
        method: 'POST',
        body: formData
      });

      const contentType = response.headers.get('content-type') || '';
      let result = {};
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textErr = await response.text();
        throw new Error(`Server mengembalikan respon non-JSON (${response.status}): ${textErr.slice(0, 120)}...`);
      }

      let succeeded = response.ok && result.success;
      // 202 = file diterima & diproses worker latar belakang → pantau progres (SSE) sampai selesai
      if (response.status === 202 && result.jobId) {
        setImportProgress('Menunggu antrean');
        const outcome = await watchJobEvents(`${API_BASE_URL}/api/admin/import-excel/${result.jobId}/events`, {
          signal: abortController.signal,
          onProgress: (job) => {
            if (job.state === 'waiting' || job.state === 'delayed') setImportProgress('Menunggu antrean');
            else if (job.progress?.stage) setImportProgress(`${job.progress.stage} ${job.progress.percent}%`);
          }
        });
        result = outcome.event === 'completed' ? (outcome.data.result || {}) : (outcome.data.error?.body || {});
        succeeded = outcome.event === 'completed' && !!result.success;
      }

      if (succeeded) {
        setMessage(result.message || 'Database berhasil diperbarui dengan data Excel baru!');
        setFile(null);
        if (onUpdate) onUpdate();
      } else if (response.status === 401) {
        setError(result.message || result.error || 'Sesi login Admin telah berakhir. Silakan login kembali.');
      } else {
        setError(result.message || result.error || 'Gagal mengunggah dan memperbarui database.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // panel ditutup; import tetap berjalan di server
      setError(err.message || 'Terjadi kesalahan koneksi ke server. Pastikan server backend sedang berjalan.');
      console.error(err);
    } finally {
      setLoading(false);
      setImportProgress('');
    }
  };

  return { file, setFile, loading, importProgress, message, setMessage, error, setError, handleFileChange, handleUpload };
}
```

## File: src/hooks/useOdpSummary.js
```javascript
import { useMemo } from 'react';
import { flatOdps, computeStats } from '../utils';

// Ringkasan ODP untuk Dashboard: daftar ODP datar, KPI (dioverride nilai resmi Excel bila filter = ALL), chip status ODP
export function useOdpSummary(branches, importMeta, typeDesignFilter) {
  // ─── PRE-COMPUTED DATA (dihitung 1x saat branches/typeDesignFilter berubah, reused saat ganti tab) ───
  const allOdps = useMemo(() => flatOdps(branches, typeDesignFilter), [branches, typeDesignFilter]);

  const kpiRaw = useMemo(() => computeStats(branches, typeDesignFilter), [branches, typeDesignFilter]);

  // Override KPI dengan nilai resmi dari file Excel (Jateng DIY summary) jika filter = ALL
  const kpi = useMemo(() => {
    if (typeDesignFilter === 'ALL' && importMeta && typeof importMeta.occRate === 'number' && !isNaN(importMeta.occRate)) {
      return {
        ...kpiRaw,
        occRate: Math.round(importMeta.occRate * 1000) / 10,  // 0.121 -> 12.1
        // FIX: gunakan != null agar nilai 0 tidak dianggap "kosong" dan fallback ke DB
        totalAvai: importMeta.available != null ? importMeta.available : kpiRaw.totalAvai,
        totalUsed: importMeta.used != null ? importMeta.used : kpiRaw.totalUsed,
        totalPort: importMeta.total != null ? importMeta.total : kpiRaw.totalPort,
        odpCount: kpiRaw.odpCount,
        gapWoW: importMeta.gapWoW,
      };
    }
    const calcRate = kpiRaw.totalPort > 0 ? Math.round((kpiRaw.totalUsed / kpiRaw.totalPort) * 1000) / 10 : 0;
    return { ...kpiRaw, occRate: kpiRaw.occRate || calcRate, gapWoW: null };
  }, [kpiRaw, importMeta, typeDesignFilter]);


  const statusChips = useMemo(() => {
    const counts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0, BLACK: 0 };
    allOdps.forEach(o => {
      const pct = o.total > 0 ? o.used / o.total : 0;
      const calcStatus = o.used === 0 ? 'BLACK' : pct < 0.25 ? 'GREEN' : pct < 0.50 ? 'YELLOW' : pct < 0.75 ? 'ORANGE' : 'RED';
      const status = (o.occStatus || calcStatus).toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return [
      { label: 'Green', count: counts.GREEN || 0, color: '#16a34a' },
      { label: 'Yellow', count: counts.YELLOW || 0, color: '#FFFF00' },
      { label: 'Orange', count: counts.ORANGE || 0, color: '#f97316' },
      { label: 'Red', count: counts.RED || 0, color: '#dc2626' },
      { label: 'Black', count: counts.BLACK || 0, color: '#334155' }
    ];
  }, [allOdps]);

  return { allOdps, kpi, statusChips };
}
```

## File: src/hooks/usePairingImport.js
```javascript
import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { watchJobEvents } from '../jobEvents';

// Update Data Tsel One Pairing (Excel) → diproses worker latar belakang, progres via SSE
export function usePairingImport() {
  const [pairingFile, setPairingFile] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  // Progres import pairing dari worker latar belakang (ditampilkan di teks tombol)
  const [pairingProgress, setPairingProgress] = useState('');
  const pairingAbortRef = useRef(null);
  useEffect(() => () => pairingAbortRef.current?.abort(), []);
  const [pairingMessage, setPairingMessage] = useState(null);
  const [pairingError, setPairingError] = useState(null);

  const handlePairingUpload = async (e) => {
    e.preventDefault();
    if (!pairingFile) {
      setPairingError('Pilih file Excel Tsel One Pairing terlebih dahulu.');
      return;
    }

    setPairingLoading(true);
    setPairingMessage('Sedang mengunggah & mengindeks data pairing... Harap tunggu (±15-20 detik)...');
    setPairingError(null);
    setPairingProgress('');

    const formData = new FormData();
    formData.append('file', pairingFile);
    const abortController = new AbortController();
    pairingAbortRef.current = abortController;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/upload-pairing-excel`, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Sesi login Admin telah berakhir atau tidak sah (Status 401/403). Silakan tekan tombol Log Out lalu masuk kembali.');
        }
        throw new Error(data.error || data.message || `Gagal mengunggah file Tsel One Pairing (Status ${res.status}).`);
      }

      // 202 = file diterima & diproses worker latar belakang → pantau progres (SSE) sampai selesai
      if (res.status === 202 && data.jobId) {
        setPairingProgress('Menunggu antrean');
        const outcome = await watchJobEvents(`${API_BASE_URL}/api/admin/upload-pairing-excel/${data.jobId}/events`, {
          signal: abortController.signal,
          onProgress: (job) => {
            if (job.state === 'waiting' || job.state === 'delayed') setPairingProgress('Menunggu antrean');
            else if (job.progress?.stage) setPairingProgress(`${job.progress.stage} ${job.progress.percent}%`);
          }
        });
        if (outcome.event !== 'completed') {
          const body = outcome.data.error?.body || {};
          throw new Error(body.error || body.message || 'Gagal memproses file Excel pairing.');
        }
        data = outcome.data.result || {};
      }

      setPairingMessage(data.message || 'Berhasil mengimpor Data Tsel One Pairing!');
      setPairingFile(null);
    } catch (err) {
      if (err.name === 'AbortError') return; // panel ditutup; import tetap berjalan di server
      setPairingMessage(null);
      setPairingError(err.message || 'Terjadi kesalahan saat upload file Tsel One Pairing.');
    } finally {
      setPairingLoading(false);
      setPairingProgress('');
    }
  };

  return { pairingFile, setPairingFile, pairingLoading, pairingProgress, pairingMessage, setPairingMessage, pairingError, setPairingError, handlePairingUpload };
}
```

## File: src/hooks/usePairingSearch.js
```javascript
import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL, authFetch } from '../apiConfig';

// GET /api/pairing/search — cari Tsel One Pairing berdasarkan BB ID / Order ID / MSISDN.
// Dipicu tombol cari (bukan otomatis), jadi memakai useMutation: status loading/error terpadu & request tidak dobel.
async function searchPairing(cleanQ) {
  const res = await authFetch(`${API_BASE_URL}/api/pairing/search?q=${encodeURIComponent(cleanQ)}`);
  const contentType = res.headers.get('content-type') || '';

  let data = {};
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Terjadi kesalahan saat mencari data pairing (Status ${res.status}).`);
  }
  return data;
}

export function usePairingSearch() {
  return useMutation({ mutationFn: searchPairing });
}
```

## File: src/hooks/useProgramDelete.js
```javascript
import { useState } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useProgramsForMonth, useInvalidatePrograms } from './usePrograms';

// Kelola & hapus program terdaftar per periode
export function useProgramDelete() {
  const [deleteProgramMonth, setDeleteProgramMonth] = useState('Agustus 2026');
  const [deleteProgramTarget, setDeleteProgramTarget] = useState('ALL');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const deleteAvailablePrograms = useProgramsForMonth(deleteProgramMonth);
  const invalidatePrograms = useInvalidatePrograms();

  const handleExecuteDeleteProgram = async () => {
    setDeleteLoading(true);
    setDeleteMessage(null);
    setDeleteError(null);
    setShowDeleteConfirmModal(false);

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/programs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monthLabel: deleteProgramMonth,
          programName: deleteProgramTarget
        })
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        throw new Error(`Server mengembalikan respon (${res.status}): ${textErr.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Gagal menghapus program (Status ${res.status}).`);
      }

      setDeleteMessage(data.message || 'Program berhasil dihapus.');
      setDeleteProgramTarget('ALL');
      // Daftar program (menu PROGRAM & form di panel ini) diambil ulang
      invalidatePrograms();
    } catch (err) {
      console.error('Delete Program Error:', err);
      setDeleteError(err.message || 'Terjadi kesalahan saat menghapus program.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    deleteProgramMonth, setDeleteProgramMonth, deleteProgramTarget, setDeleteProgramTarget,
    deleteAvailablePrograms, deleteLoading, deleteMessage, setDeleteMessage, deleteError, setDeleteError,
    showDeleteConfirmModal, setShowDeleteConfirmModal, handleExecuteDeleteProgram
  };
}
```

## File: src/hooks/usePrograms.js
```javascript
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPrograms, queryKeys } from '../api/queries';

const EMPTY = [];

// Semua periode untuk menu PROGRAM di navigasi: { [label bulan]: { programs } }
export function useProgramMonths() {
  const query = useQuery({ queryKey: queryKeys.programs('all'), queryFn: () => fetchPrograms('all') });
  const monthsData = useMemo(() => {
    const data = query.data;
    if (data && data.monthsData) return data.monthsData;
    if (data && data.programs) return { 'Agustus 2026': { programs: data.programs } };
    return {};
  }, [query.data]);
  if (query.error) console.error('Error fetching dynamic programs:', query.error);
  return monthsData;
}

// Daftar program terdaftar untuk satu periode (form upload & hapus program di Control Panel)
export function useProgramsForMonth(month) {
  const query = useQuery({ queryKey: queryKeys.programs(month), queryFn: () => fetchPrograms(month) });
  return query.data?.programs ?? EMPTY;
}

// Dipanggil setelah program diunggah / dihapus: seluruh daftar program (menu & form) diambil ulang
export function useInvalidatePrograms() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.programsAll }), [queryClient]);
}
```

## File: src/hooks/useProgramUpload.js
```javascript
import { useState } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useProgramsForMonth, useInvalidatePrograms } from './usePrograms';

// Upload gambar Tracking Program bulanan (Cloudinary + pindai link OCR)
export function useProgramUpload() {
  const [programFile, setProgramFile] = useState(null);
  const [programMonthLabel, setProgramMonthLabel] = useState('Agustus 2026');
  const [programName, setProgramName] = useState('');
  const [programDetailUrl, setProgramDetailUrl] = useState('');
  const [programLoading, setProgramLoading] = useState(false);
  const [programMessage, setProgramMessage] = useState(null);
  const [programError, setProgramError] = useState(null);
  const [programResultUpload, setProgramResultUpload] = useState(null);
  const uploadAvailablePrograms = useProgramsForMonth(programMonthLabel);
  const invalidatePrograms = useInvalidatePrograms();

  const handleProgramUpload = async (e) => {
    e.preventDefault();
    if (!programFile) {
      setProgramError('Pilih file gambar tracking program (.jpg, .png) terlebih dahulu.');
      return;
    }

    const finalProgramName = programName.trim();
    if (!finalProgramName) {
      setProgramError('Masukkan nama program terlebih dahulu.');
      return;
    }

    setProgramLoading(true);
    setProgramMessage('Mengunggah ke Cloudinary & memindai link otomatis (OCR)... Harap tunggu...');
    setProgramError(null);
    setProgramResultUpload(null);

    const formData = new FormData();
    formData.append('file', programFile);
    formData.append('monthLabel', programMonthLabel);
    formData.append('programName', finalProgramName);
    if (programDetailUrl) {
      formData.append('detailUrl', programDetailUrl.trim());
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/upload-program-image`, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${textErr.slice(0, 120)}...`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Gagal mengunggah gambar program (Status ${res.status}).`);
      }

      setProgramMessage(data.message || `Berhasil mengunggah Gambar Program "${finalProgramName}" (${programMonthLabel}) ke Cloudinary!`);
      setProgramResultUpload(data);
      setProgramFile(null);
      setProgramName('');
      setProgramDetailUrl('');
      // Daftar program (menu PROGRAM & form di panel ini) diambil ulang
      invalidatePrograms();
    } catch (err) {
      console.error('Program Image Upload Error:', err);
      setProgramError(err.message);
    } finally {
      setProgramLoading(false);
    }
  };

  return {
    programFile, setProgramFile, programMonthLabel, setProgramMonthLabel, programName, setProgramName,
    programDetailUrl, setProgramDetailUrl, programLoading, programMessage, setProgramMessage,
    programError, setProgramError, programResultUpload, uploadAvailablePrograms, handleProgramUpload
  };
}
```

## File: src/hooks/useProjectReviewModal.js
```javascript
import { useState } from 'react';

// Modal review proyek (foto kegiatan, verifikasi/tolak) — dibuka dari tabel proyek
export function useProjectReviewModal(branches) {
  const [modalKey, setModalKey] = useState(null); // format: branchName||projectName

  const openModal = (bName, pName) => setModalKey(`${bName}||${pName}`);
  const closeModal = () => setModalKey(null);

  let modalData = null;
  if (modalKey) {
    const [bName, pName] = modalKey.split('||');
    const b = branches.find(x => x.name === bName);
    const p = b?.projects?.find(x => x.name === pName);
    if (p) {
      const totalAvai = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalUsed = p.odps.reduce((s, o) => s + o.used, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);

      modalData = {
        bName, pName, wok: p.wok,
        projectId: p.id,
        odps: p.odps,
        totalAvai, totalUsed, totalPort,
        odpCount: p.odps.length,
        activities: p.activities || []
      };
    }
  }

  return { modalData, openModal, closeModal };
}
```

## File: src/hooks/useRekapExcelExport.js
```javascript
import { useCallback } from 'react';
import { formatBranch } from '../utils';

// Export Rekap Excel (Opsi A: Client-side Export seluruh LOP)
export function useRekapExcelExport(branches) {
  return useCallback(async () => {
    const XLSX = await import('xlsx');
    const getActStatusLabel = (act, actTypeKey) => {
      if (!act || !act.status || act.status === 'belum') return 'Belum Dikerjakan';
      let label = act.status === 'verified' ? 'Terverifikasi' : 'Menunggu Verifikasi';
      if (actTypeKey === 'tsel_menyapa' && act.planDate) {
        const dStr = new Date(act.planDate).toISOString().split('T')[0];
        label += ` (Tgl: ${dStr})`;
      } else if (actTypeKey === 'branding_outlet' && act.namaOutlet) {
        label += ` (${act.namaOutlet})`;
      } else if (actTypeKey === 'bumdes' && (act.namaBumdes || act.keterangan)) {
        label += ` (${act.namaBumdes || act.keterangan})`;
      } else if (actTypeKey === 'rekrutmen_sf' && act.keterangan) {
        label += ` (${act.keterangan})`;
      }
      return label;
    };

    const getOverallProjectStatus = (acts) => {
      if (acts.some(a => a.status === 'upload')) return 'Menunggu Verifikasi';
      if (acts.some(a => a.status === 'verified')) return 'Terverifikasi';
      return 'Belum Dikerjakan';
    };

    const dataRows = [];

    (branches || []).forEach(b => {
      const bName = formatBranch(b.name);
      (b.projects || []).forEach(p => {
        const used = p.usedTotal ?? (p.odps || []).reduce((s, o) => s + (o.used || 0), 0);
        const avai = p.avaiTotal ?? (p.odps || []).reduce((s, o) => s + (o.avai || 0), 0);
        const total = p.totalPort ?? (p.odps || []).reduce((s, o) => s + (o.total || 0), 0);
        const occ = total > 0 ? (used / total * 100).toFixed(1) + '%' : '0%';

        const acts = p.activities || [];
        const tselAct = acts.find(a => a.type === 'tsel_menyapa');
        const brandingAct = acts.find(a => a.type === 'branding_outlet');
        const bumdesAct = acts.find(a => a.type === 'bumdes');
        const rekrutmenAct = acts.find(a => a.type === 'rekrutmen_sf');
        const openTableAct = acts.find(a => a.type === 'open_table');

        dataRows.push([
          bName,
          p.wok || '-',
          p.name,
          p.typeDesign || 'Greenfield',
          used,
          avai,
          total,
          occ,
          getActStatusLabel(tselAct, 'tsel_menyapa'),
          getActStatusLabel(brandingAct, 'branding_outlet'),
          getActStatusLabel(bumdesAct, 'bumdes'),
          getActStatusLabel(rekrutmenAct, 'rekrutmen_sf'),
          getActStatusLabel(openTableAct, 'open_table'),
          getOverallProjectStatus(acts)
        ]);
      });
    });

    const dateFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const titleRow1 = ['REKAPITULASI MONITORING AKTIVITAS GTM (GENERATING TRAFFIC & MOVEMENT)'];
    const titleRow2 = [`Tanggal Export: ${dateFormatted} | Total LOP / Proyek: ${dataRows.length}`];
    const emptyRow = [];
    const headerRow = [
      'Branch',
      'WOK',
      'Nama LOP / Proyek',
      'Type Design',
      'Used Port',
      'Avai Port',
      'Total Port',
      'Occupancy Rate (%)',
      'Tsel Menyapa Warga',
      'Branding Outlet',
      'BUMDES',
      'Rekrutmen SF',
      'Open Table',
      'Status LOP'
    ];

    const sheetData = [titleRow1, titleRow2, emptyRow, headerRow, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge judul di baris 1 dan 2 (A1:N1 dan A2:N2)
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }
    ];

    // Style Title Rows A1 & A2
    if (worksheet['A1']) {
      worksheet['A1'].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "0F172A" } },
        alignment: { vertical: "center" }
      };
    }
    if (worksheet['A2']) {
      worksheet['A2'].s = {
        font: { name: "Calibri", sz: 11, italic: true, color: { rgb: "475569" } },
        alignment: { vertical: "center" }
      };
    }

    // Aktifkan AutoFilter bawaan Excel pada baris header (Baris ke-4: A4:N...)
    if (dataRows.length > 0) {
      worksheet['!autofilter'] = { ref: `A4:N${3 + dataRows.length}` };
    }

    // Styling background Telkomsel Red (#800000) & bold putih untuk baris header A4:N4
    const headerCols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
    headerCols.forEach(col => {
      const cellRef = `${col}4`;
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: "C8102E" } // Telkomsel Red (#800000)
          },
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: { rgb: "FFFFFF" } // White text
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          },
          border: {
            top: { style: "thin", color: { rgb: "BFBFBF" } },
            bottom: { style: "thin", color: { rgb: "BFBFBF" } },
            left: { style: "thin", color: { rgb: "BFBFBF" } },
            right: { style: "thin", color: { rgb: "BFBFBF" } }
          }
        };
      }
    });

    const colWidths = [
      { wch: 16 }, // Branch
      { wch: 22 }, // WOK
      { wch: 32 }, // Nama LOP
      { wch: 14 }, // Type Design
      { wch: 10 }, // Used
      { wch: 10 }, // Avai
      { wch: 10 }, // Total
      { wch: 18 }, // OCC Rate
      { wch: 30 }, // Tsel Menyapa
      { wch: 22 }, // Branding
      { wch: 22 }, // BUMDES
      { wch: 30 }, // Rekrutmen SF
      { wch: 22 }, // Open Table
      { wch: 24 }  // Status LOP
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap LOP');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Rekap_GTM_Activity_${todayStr}.xlsx`);
  }, [branches]);
}
```

## File: src/lib/queryClient.js
```javascript
import { QueryClient } from '@tanstack/react-query';

// Server state (TanStack Query): data dianggap segar 60 detik. Setelah itu, saat tab browser aktif kembali,
// data diperbarui diam-diam di latar belakang (tanpa layar loading). Request yang sama otomatis digabung (dedup).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1
    },
    mutations: {
      retry: 0
    }
  }
});
```

## File: src/routes/AppLayout.jsx
```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import LoginPage from '../components/Auth/LoginPage';
import ProgramViewerModal from '../components/ProgramViewerModal';
import LoadingScreen from '../components/layout/LoadingScreen';
import AppSidebar from '../components/layout/AppSidebar';
import TopHeaderBar from '../components/layout/TopHeaderBar';
import ProfileMenu from '../components/layout/ProfileMenu';
import LogoutConfirmModal from '../components/layout/LogoutConfirmModal';
import SessionExpiredModal from '../components/layout/SessionExpiredModal';
import { useAuth } from '../auth/AuthContext';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { useProgramMonths, useInvalidatePrograms } from '../hooks/usePrograms';
import { useAppNotifications } from '../hooks/useAppNotifications';
import { PATHS, viewFromPath, LEGACY_HASH_PATHS } from './paths';

export default function AppLayout() {
  const { user, isAdmin, authChecked, login, logout, sessionExpiredNotice, setSessionExpiredNotice, lastLoginTimestamp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const view = viewFromPath(location.pathname);

  const { branches, importMeta, isInitialLoading, refresh } = useMonitoringData();
  const dynamicMonthsData = useProgramMonths();
  const invalidatePrograms = useInvalidatePrograms();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [activeProgramModal, setActiveProgramModal] = useState(null);
  const [typeDesignFilter, setTypeDesignFilter] = useState('ALL');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const contentAreaRef = useRef(null);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    setShowProfileModal(false);
    setShowLogoutConfirmModal(false);
  }, [user]);

  useEffect(() => {
    const target = LEGACY_HASH_PATHS[location.hash.toLowerCase()];
    if (target) navigate(target, { replace: true });
  }, [location.hash, navigate]);

  // Scroll spy untuk menentukan section mana yang sedang aktif saat halaman continuous di-scroll
  useEffect(() => {
    if (view !== 'dashboard') return;

    const container = contentAreaRef.current;
    if (!container) return;

    const handleScroll = () => {
      const activityEl = document.getElementById('activity-section');
      if (!activityEl) return;

      const rect = activityEl.getBoundingClientRect();
      // Bila batas atas section Activity berada di posisi 200px dari atas viewport (di bawah header 64px)
      if (rect.top <= 200) {
        setActiveSection('activity');
      } else {
        setActiveSection('dashboard');
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [view]);

  // Auto-scroll saat pertama kali membuka tautan ber-hash #activity
  useEffect(() => {
    if (view === 'dashboard' && location.hash === '#activity') {
      const timer = setTimeout(() => {
        const el = document.getElementById('activity-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection('activity');
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [view, location.hash]);

  const handleLogout = (showAlert = true) => {
    if (typeof showAlert !== 'boolean') showAlert = true;
    // Mencegah munculnya pop-up konfirmasi logout akibat retargeting event Enter/fokus otomatis dalam 1 detik setelah login
    if (showAlert && Date.now() - lastLoginTimestamp.current < 1000) {
      return;
    }
    if (showAlert) {
      setShowLogoutConfirmModal(true);
      return;
    }
    logout();
  };

  const goDashboard = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (view === 'dashboard') {
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById('dashboard-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (window.location.hash) {
        window.history.replaceState(null, '', '/dashboard');
      }
      setActiveSection('dashboard');
    } else {
      navigate(PATHS.dashboard);
    }
  }, [user, view, navigate]);

  const goUpload = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (view === 'dashboard') {
      const el = document.getElementById('activity-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', '/dashboard#activity');
        setActiveSection('activity');
      }
    } else {
      navigate('/dashboard#activity');
    }
  }, [user, view, navigate]);

  const goAdmin = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!isAdmin) {
      alert('Akses ditolak. Hanya Administrator yang dapat membuka Admin Panel.');
      return;
    }
    navigate(PATHS.admin);
  }, [user, isAdmin, navigate]);

  const { notifications, count: notificationCount } = useAppNotifications(branches, user, isAdmin);

  const handleSelectProjectNotification = useCallback((item) => {
    if (!item?.projectName) return;

    if (view === 'dashboard') {
      const el = document.getElementById('activity-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `/dashboard?project=${encodeURIComponent(item.projectName)}#activity`);
        setActiveSection('activity');
      }
    } else {
      navigate(`/dashboard?project=${encodeURIComponent(item.projectName)}#activity`);
    }

    // Trigger custom event untuk UploadView
    window.dispatchEvent(new CustomEvent('gtm-focus-project', {
      detail: {
        projectName: item.projectName,
        branchName: item.branchName
      }
    }));
  }, [view, navigate]);

  if (!authChecked || isInitialLoading) {
    return <LoadingScreen />;
  }

  const renderLoginModal = () => {
    if (!showLoginModal) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#ffffff', overflowY: 'auto' }}>
        <LoginPage
          onLoginSuccess={(loggedInUser, expiresAt) => {
            login(loggedInUser, expiresAt);
            setShowLoginModal(false);
          }}
          onBackToLanding={() => setShowLoginModal(false)}
        />
      </div>
    );
  };

  const isFullPage = view === 'landing' || view === 'login' || view === null;

  return (
    <div className={`saas-app-root ${isFullPage ? 'app-root-fullpage' : 'app-root-saas'}`}>
      {renderLoginModal()}
      {activeProgramModal && (
        <ProgramViewerModal
          program={activeProgramModal.program}
          monthLabel={activeProgramModal.monthLabel}
          onClose={() => setActiveProgramModal(null)}
          isAdmin={!!(user && (user.role === 'ADMIN' || user.username === 'admin'))}
          onDeleteSuccess={() => {
            invalidatePrograms();
            setActiveProgramModal(null);
          }}
        />
      )}

      {isFullPage ? (
        <div className="main-content-full">
          <Outlet context={{ branches, importMeta, typeDesignFilter, setTypeDesignFilter, refreshMonitoring: refresh, invalidatePrograms }} />
        </div>
      ) : (
        <div
          className="saas-shell"
          style={{
            display: 'flex',
            flexDirection: 'row',
            height: '100vh',
            minHeight: '100dvh',
            maxHeight: '100dvh',
            width: '100%',
            background: '#FFFFFF',
            overflow: 'hidden'
          }}
        >
          <AppSidebar
            user={user}
            isAdmin={isAdmin}
            activeSection={activeSection}
            goDashboard={goDashboard}
            goUpload={goUpload}
            goAdmin={goAdmin}
            onLoginClick={() => navigate(PATHS.login)}
            setShowLoginModal={setShowLoginModal}
            dynamicMonthsData={dynamicMonthsData}
            setActiveProgramModal={setActiveProgramModal}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            handleLogout={handleLogout}
          />

          <div
            ref={contentAreaRef}
            className="saas-content-area"
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#FFFFFF',
              overflowY: 'auto',
              scrollPaddingTop: '80px',
              scrollBehavior: 'smooth'
            }}
          >
            <TopHeaderBar
              user={user}
              isAdmin={isAdmin}
              activeSection={activeSection}
              onLoginClick={() => navigate(PATHS.login)}
              goDashboard={goDashboard}
              goUpload={goUpload}
              pendingCount={notificationCount}
              notifications={notifications}
              notificationCount={notificationCount}
              onSelectNotification={handleSelectProjectNotification}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              typeDesignFilter={typeDesignFilter}
              setTypeDesignFilter={setTypeDesignFilter}
            />

            <main
              className="saas-main-viewport"
              style={{
                flex: 1,
                padding: '24px 32px 48px',
                boxSizing: 'border-box'
              }}
            >
              <div className="fade-in" key={view}>
                <Outlet context={{ branches, importMeta, typeDesignFilter, setTypeDesignFilter, refreshMonitoring: refresh, invalidatePrograms }} />
              </div>
            </main>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileMenu user={user} isAdmin={isAdmin} setShowProfileModal={setShowProfileModal} handleLogout={handleLogout} />
      )}

      {showLogoutConfirmModal && (
        <LogoutConfirmModal setShowLogoutConfirmModal={setShowLogoutConfirmModal} executeLogout={logout} />
      )}

      {sessionExpiredNotice && (
        <SessionExpiredModal sessionExpiredNotice={sessionExpiredNotice} setSessionExpiredNotice={setSessionExpiredNotice} />
      )}
    </div>
  );
}
```

## File: src/routes/guards.jsx
```javascript
// Route Guard deklaratif berbasis status login & peran (ADMIN / USER branch)
import { Navigate, Outlet, useOutletContext } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { PATHS } from './paths';

// Halaman khusus akun yang sudah login. `roles` (opsional) = peran yang diizinkan, mis. ['ADMIN'].
// Belum login → Overview; peran tidak sesuai (mis. akun branch membuka /admin) → Dashboard.
export function RequireAuth({ roles }) {
  const { user } = useAuth();
  const context = useOutletContext();
  if (!user) return <Navigate to={PATHS.landing} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={PATHS.dashboard} replace />;
  return <Outlet context={context} />;
}

// Halaman pengunjung (Overview & Login): akun yang sudah login langsung diarahkan ke Dashboard
export function GuestOnly() {
  const { user } = useAuth();
  const context = useOutletContext();
  if (user) return <Navigate to={PATHS.dashboard} replace />;
  return <Outlet context={context} />;
}

// Alamat tidak dikenal → Dashboard (sudah login) atau Overview
export function FallbackRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? PATHS.dashboard : PATHS.landing} replace />;
}
```

## File: src/routes/pages.jsx
```javascript
// Halaman-halaman rute: menghubungkan URL & data (TanStack Query, lewat AppLayout) ke komponen tampilan
import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router';
import LandingPage from '../components/LandingPage';
import LoginPage from '../components/Auth/LoginPage';
import Dashboard from '../components/Dashboard';
import BranchView from '../components/BranchView';
import UploadView from '../components/UploadView';
import AdminPanel from '../components/AdminPanel';
import { useAuth } from '../auth/AuthContext';
import { useOdpSummary } from '../hooks/useOdpSummary';
import { useGtmMonitoring } from '../hooks/useGtmMonitoring';
import { useActivityActions } from '../hooks/useActivityActions';
import { PATHS } from './paths';

export function LandingRoute() {
  const navigate = useNavigate();
  return (
    <LandingPage
      onLoginClick={() => navigate(PATHS.login)}
      onExplore={() => navigate(PATHS.login)}
    />
  );
}

export function LoginRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();
  return (
    <LoginPage
      onLoginSuccess={(loggedInUser, expiresAt) => {
        login(loggedInUser, expiresAt);
      }}
      onBackToLanding={() => navigate(PATHS.landing)}
    />
  );
}

export function DashboardRoute() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { branches, importMeta, typeDesignFilter, setTypeDesignFilter } = useOutletContext();
  const { kpi, statusChips } = useOdpSummary(branches, importMeta, typeDesignFilter);
  const ranking = useGtmMonitoring(branches, typeDesignFilter);
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();

  // Detail branch hanya untuk Admin (akun branch tetap di Dashboard)
  const goBranch = useCallback((name) => {
    if (!isAdmin) return;
    navigate(PATHS.branch(name));
  }, [isAdmin, navigate]);

  // Untuk aktivitas/upload: Akun User (Non-Admin) HANYA menerima data branch tempat ia bertugas
  const uploadBranches = useMemo(() => {
    if (user && user.role === 'USER' && user.branchName) {
      const filtered = branches.filter(b => b.name === user.branchName);
      return filtered.length > 0 ? filtered : branches;
    }
    return branches;
  }, [branches, user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section id="dashboard-section" style={{ scrollMarginTop: '80px' }}>
        <Dashboard
          branches={branches}
          goBranch={goBranch}
          kpi={kpi}
          importMeta={importMeta}
          statusChips={statusChips}
          ranking={ranking}
          typeDesignFilter={typeDesignFilter}
          setTypeDesignFilter={setTypeDesignFilter}
          isAdmin={isAdmin}
        />
      </section>

      <section id="activity-section" style={{ scrollMarginTop: '80px' }}>
        <UploadView
          branches={uploadBranches}
          initialBranch={null}
          uploadPhoto={uploadPhoto}
          verifyActivity={isAdmin ? verifyActivity : null}
          rejectActivity={isAdmin ? rejectActivity : null}
          deletePhoto={deletePhoto}
          isAdmin={isAdmin}
        />
      </section>
    </div>
  );
}

export function BranchRoute() {
  const navigate = useNavigate();
  const { branchName } = useParams();
  const { isAdmin } = useAuth();
  const { branches } = useOutletContext();
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();
  const goDashboard = useCallback(() => navigate(PATHS.dashboard), [navigate]);

  return (
    <BranchView
      branches={branches}
      activeBranch={branchName}
      goDashboard={goDashboard}
      uploadPhoto={uploadPhoto}
      verifyActivity={isAdmin ? verifyActivity : null}
      rejectActivity={isAdmin ? rejectActivity : null}
      deletePhoto={deletePhoto}
    />
  );
}

export function UploadRoute() {
  return <Navigate to="/dashboard#activity" replace />;
}

export function AdminRoute() {
  const { branches, refreshMonitoring } = useOutletContext();
  const { uploadPhoto, verifyActivity, rejectActivity, deletePhoto } = useActivityActions();
  return (
    <AdminPanel
      branches={branches}
      onUpdate={refreshMonitoring}
      verifyActivity={verifyActivity}
      rejectActivity={rejectActivity}
      uploadPhoto={uploadPhoto}
      deletePhoto={deletePhoto}
    />
  );
}
```

## File: src/routes/paths.js
```javascript
// Alamat halaman aplikasi (React Router). `view` = nama halaman yang dipakai komponen lama (menu aktif, animasi).
export const PATHS = {
  landing: '/',
  login: '/login',
  dashboard: '/dashboard',
  branch: (name) => `/branch/${encodeURIComponent(name)}`,
  upload: '/upload',
  admin: '/admin'
};

export function viewFromPath(pathname) {
  if (pathname === '/' || pathname === '') return 'landing';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/branch/')) return 'branch';
  if (pathname.startsWith('/upload')) return 'upload';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

// URL lama berbasis hash (#dashboard, #upload, …) sebelum memakai router → alamat baru
export const LEGACY_HASH_PATHS = {
  '#dashboard': PATHS.dashboard,
  '#monitoring': PATHS.dashboard,
  '#upload': PATHS.upload,
  '#admin': PATHS.admin,
  '#login': PATHS.login,
  '#landing': PATHS.landing,
  '#overview': PATHS.landing
};
```

## File: src/apiConfig.js
```javascript
// Default '' = same-origin (produksi: backend menyajikan frontend; dev: lewat proxy Vite di vite.config.js)
// agar cookie sesi HttpOnly selalu terkirim tanpa masalah lintas-origin.
export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : '';

// Event global saat sesi tidak bisa diperbarui lagi — App.jsx akan me-logout & meminta login ulang
export const UNAUTHORIZED_EVENT = 'gtm:unauthorized';
// Event saat access token berhasil diperbarui (detail: { user, expiresAt })
export const SESSION_REFRESHED_EVENT = 'gtm:session-refreshed';

// Endpoint auth yang tidak boleh memicu refresh otomatis (mencegah loop)
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

let refreshPromise = null;

// Hasil: 'ok' (sesi diperbarui), 'invalid' (wajib login ulang), 'error' (server tak terjangkau)
const requestRefresh = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT, { detail: data }));
      return 'ok';
    }
    // 409 = tab lain baru saja memperbarui sesi; cookie baru sudah tersimpan di browser
    if (res.status === 409) return 'ok';
    if (res.status === 401) return 'invalid';
    return 'error';
  } catch {
    return 'error';
  }
};

// Satu proses refresh untuk banyak request bersamaan; navigator.locks menyerialkan refresh antar-tab
export const refreshSession = () => {
  if (!refreshPromise) {
    const run = navigator.locks?.request
      ? navigator.locks.request('gtm-session-refresh', requestRefresh)
      : requestRefresh();
    refreshPromise = run.finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

// fetch dengan cookie sesi (HttpOnly) — token tidak pernah disentuh JavaScript.
// Access token berumur 15 menit: bila ditolak (401), sesi diperbarui otomatis lalu request diulang sekali.
export const authFetch = async (url, options = {}) => {
  const doFetch = () => fetch(url, { ...options, credentials: 'include' });
  let res = await doFetch();

  if (res.status === 401 && !NO_REFRESH_PATHS.some(path => String(url).includes(path))) {
    const result = await refreshSession();
    if (result === 'ok') {
      res = await doFetch();
      if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    } else if (result === 'invalid') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    // 'error': server tidak terjangkau — sesi dibiarkan, respons 401 diteruskan ke pemanggil
  }
  return res;
};
```

## File: src/App.jsx
```javascript
// Peta halaman aplikasi (React Router). Hak akses diatur deklaratif oleh guard:
//   pengunjung  : /, /login
//   login       : /dashboard, /upload
//   ADMIN saja  : /branch/:branchName, /admin
import { Routes, Route } from 'react-router';
import AppLayout from './routes/AppLayout';
import { RequireAuth, GuestOnly, FallbackRedirect } from './routes/guards';
import { LandingRoute, LoginRoute, DashboardRoute, BranchRoute, UploadRoute, AdminRoute } from './routes/pages';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<GuestOnly />}>
          <Route index element={<LandingRoute />} />
          <Route path="login" element={<LoginRoute />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="upload" element={<UploadRoute />} />
        </Route>

        <Route element={<RequireAuth roles={['ADMIN']} />}>
          <Route path="branch/:branchName" element={<BranchRoute />} />
          <Route path="admin" element={<AdminRoute />} />
        </Route>

        <Route path="*" element={<FallbackRedirect />} />
      </Route>
    </Routes>
  );
}
```

## File: src/index.css
```css
:root {
  font-family: 'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background-color: #ffffff;
  --font-heading: 'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Spektrum Merah - Jingga - Hitam - Putih */
  --primary-red: #800000;
  --primary-orange: #FF5E00;
  --grad-red-orange: linear-gradient(135deg, #800000 0%, #FF5E00 100%);
  --grad-orange-red: linear-gradient(135deg, #FF5E00 0%, #800000 100%);
  --bg-dark: #090A0F;
  --bg-dark-card: rgba(255, 255, 255, 0.04);
}

html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  font-family: var(--font-body);
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
}

#root {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

/* Animations & Landing Page Effects */
@keyframes portalPulse {
  0% {
    transform: scale(0.99);
    box-shadow: 0 4px 20px rgba(128, 0, 0, 0.15);
  }
  50% {
    transform: scale(1.01);
    box-shadow: 0 8px 30px rgba(128, 0, 0, 0.25);
  }
  100% {
    transform: scale(0.99);
    box-shadow: 0 4px 20px rgba(128, 0, 0, 0.15);
  }
}

@keyframes floatAnim {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

@keyframes rotateRing {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

/* Base interactive elements & affordances (R-39) */
button, a[href], select, summary, label[for] {
  cursor: pointer;
}

:disabled, button:disabled, input:disabled, select:disabled {
  cursor: not-allowed !important;
}

select, input {
  font-family: inherit;
}
select:focus, input:focus {
  border-color: #94a3b8;
}

/* Disable native browser password reveal eye icon to prevent glitches */
input::-ms-reveal,
input::-ms-clear,
input::-webkit-credentials-auto-fill-button {
  display: none !important;
}

button {
  font-family: inherit;
}

/* Accessible focus ring replacement for keyboard navigation (R-32) */
:focus-visible {
  outline: 2px solid #800000 !important;
  outline-offset: 2px !important;
}

/* Utilities */
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes programDropdownFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.main-content {
  max-width: 1360px; 
  margin: 0 auto; 
  padding: 24px 32px 64px;
}

.main-content-full {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

.table-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .04em;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.table-row {
  display: grid;
  gap: 8px;
  align-items: center;
  padding: 8px 16px;
  min-height: 52px;
  border-top: 1px solid #f1f5f9;
  background-color: #ffffff;
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: #f8fafc;
}

.table-row.table-row-even {
  background-color: #fcfdfe;
}

.table-row.table-row-even:hover {
  background-color: #f1f5f9;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.activity-col-header {
  white-space: normal; /* allow wrapping for activity headers */
  text-align: center;
  padding: 0 4px;
  line-height: 1.3;
}

.dropdown-item {
  padding: 10px 16px;
  font-size: 13.5px;
  cursor: pointer;
  transition: background 0.1s;
  color: #334155;
}
.dropdown-item:hover {
  background: #f1f5f9;
}
.dropdown-item.active {
  background: #f8fafc;
  font-weight: 600;
  color: #0f172a;
}

/* Clean Horizontal Nav Menu Items (All options visible directly without scroll) */
.nav-menu-items {
  display: flex;
  align-items: center;
  gap: 32px;
  position: relative;
}

/* Profile Flyout Dropdown Card */
.profile-dropdown-card {
  position: fixed;
  top: 68px;
  right: 24px;
  width: 290px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.12);
  z-index: 9999;
  padding: 16px;
  animation: flyoutSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

@keyframes flyoutSlideDown {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.profile-avatar-circle {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #334155;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.profile-menu-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.profile-menu-item.logout {
  color: #dc2626;
}

.profile-menu-item.logout:hover {
  background: #fef2f2;
  color: #b91c1c;
}

/* ─── COMPREHENSIVE RESPONSIVE MOBILE STYLES (VERSATILE ACROSS ALL RESOLUTIONS) ─── */
.table-responsive-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}


.app-root-container {
  min-height: 100vh;
  background: #FFFFFF;
  color: #0F172A;
  padding-top: 72px;
  width: 100%;
  box-sizing: border-box;
}

.app-root-container.app-root-no-nav {
  padding-top: 0 !important;
}

.main-top-nav {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  max-width: 100vw !important;
  z-index: 1000 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding: 16px 48px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  box-sizing: border-box;
}

/* Level 2 Program Menu styling (Flyout vs Inline) */
.program-level2-flyout {
  display: block;
}
.program-level2-inline {
  display: none;
}

@media (max-width: 900px) {
  .app-root-container:not(.app-root-no-nav) {
    padding-top: 56px !important;
  }

  nav, .main-top-nav {
    padding: 8px 12px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 6px !important;
  }

  .nav-logo-section {
    flex-shrink: 0 !important;
  }

  .nav-menu-section {
    flex: 1 !important;
    min-width: 0 !important;
    max-width: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
  }
  
  .nav-menu-items {
    gap: 16px !important;
    padding-bottom: 0 !important;
  }

  .nav-tab-btn {
    font-size: 11px !important;
    letter-spacing: 0.8px !important;
    padding: 4px 2px !important;
  }

  .nav-account-section {
    flex-shrink: 0 !important;
    display: flex !important;
    align-items: center !important;
    margin-left: auto !important;
  }

  .nav-profile-btn {
    padding: 4px 6px 4px 4px !important;
    gap: 4px !important;
  }

  .nav-profile-text-container {
    display: none !important; /* Hide long text on mobile to leave max space for nav tabs */
  }

  .nav-avatar-circle {
    width: 30px !important;
    height: 30px !important;
    font-size: 12px !important;
  }

  .profile-dropdown-card {
    top: 58px !important;
    right: 10px !important;
    width: 280px !important;
    max-width: calc(100vw - 20px) !important;
  }

  .stats-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 18px !important;
  }

  .stats-block-container {
    padding: 20px 24px !important;
  }

  .capabilities-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 16px !important;
  }

  .branches-responsive-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 12px !important;
  }

  .page-responsive-padding {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .main-content {
    padding: 16px 12px 48px !important;
  }
}

@media (max-width: 768px) {
  .program-level2-flyout {
    display: none !important;
  }
  .program-level2-inline {
    display: block !important;
  }
  .program-fixed-dropdown {
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: calc(100vw - 24px) !important;
    max-width: 320px !important;
    top: 60px !important;
    max-height: 80vh !important;
    overflow-y: auto !important;
    border-radius: 18px !important;
  }
  .pairing-fixed-dropdown {
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: calc(100vw - 24px) !important;
    max-width: 380px !important;
    top: 60px !important;
    box-sizing: border-box !important;
    padding: 16px !important;
  }
}

@media (max-width: 600px) {
  .nav-profile-text-container {
    max-width: 70px !important;
  }
  .nav-profile-name {
    max-width: 70px !important;
    font-size: 10.5px !important;
  }
  .nav-profile-role {
    display: none !important;
  }

  .pairing-transposed-modal {
    padding: 10px 6px !important;
  }
  .pairing-transposed-modal-card {
    max-height: 90vh !important;
    border-radius: 16px !important;
  }

  .main-content {
    padding: 12px 8px 36px !important;
  }

  .page-responsive-padding {
    padding-left: 6px !important;
    padding-right: 6px !important;
  }

  .stats-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }

  .capabilities-responsive-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  .branches-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }

  .hero-title-responsive {
    font-size: clamp(42px, 15vw, 90px) !important;
    letter-spacing: clamp(4px, 2vw, 16px) !important;
  }

  .hero-subtitle-responsive {
    font-size: 12px !important;
    letter-spacing: 1.5px !important;
    margin-bottom: 24px !important;
  }
  
  .admin-tab-btn {
    padding: 8px 10px !important;
    font-size: 10.5px !important;
    gap: 4px !important;
    flex: 1 !important;
    justify-content: center !important;
    text-align: center !important;
    border-radius: 12px !important;
  }
  .admin-tabs-container {
    gap: 6px !important;
    justify-content: space-between !important;
  }
}

.admin-tab-btn {
  padding: 10px 24px;
  font-size: 13px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.25s ease;
}
.admin-tabs-container {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.dashboard-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: none;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.custom-table-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-table-scrollbar::-webkit-scrollbar-track {
  background: #F8FAFC;
}
.custom-table-scrollbar::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}
.custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

@media (max-width: 640px) {
  .page-title-header {
    padding-left: 10px !important;
    padding-right: 10px !important;
    box-sizing: border-box !important;
  }

  .dashboard-card {
    padding: 14px 10px !important;
    border-radius: 14px !important;
    margin-bottom: 16px !important;
  }
  
  .controls-bar-container {
    flex-wrap: wrap !important;
    gap: 10px !important;
  }
  
  .branch-filter-capsule,
  .control-btn-mobile {
    flex: 1 1 calc(50% - 6px) !important;
    min-width: 0 !important;
    max-width: none !important;
    box-sizing: border-box !important;
    justify-content: center !important;
    padding: 8px 12px !important;
    font-size: 12px !important;
    gap: 6px !important;
    text-align: center !important;
  }
  
  .branch-text-label {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    max-width: none !important;
    display: inline-block !important;
  }

  .search-container-mobile {
    flex: 1 1 100% !important;
    width: 100% !important;
    margin-top: 2px !important;
  }
  
  .search-input-field {
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 10px 18px !important;
    font-size: 12.5px !important;
  }

  .table-pagination-footer {
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    padding: 12px 10px !important;
    gap: 10px !important;
  }

  .table-pagination-controls {
    width: 100% !important;
    justify-content: space-around !important;
    gap: 8px !important;
  }
}

.controls-bar-container {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  position: relative;
  z-index: 80;
}

.branch-filter-capsule {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #E2E8F0;
  font-size: 13px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 220px;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.search-input-field {
  width: 100%;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #E2E8F0;
  font-size: 13px;
  font-weight: 500;
  background: #FFFFFF;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.table-pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-wrap: wrap;
  gap: 12px;
}

.table-pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ─── MONITORING DASHBOARD SECTIONS & ANIMATIONS ─── */
.dashboard-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: none;
}

@keyframes dashboardSlideUp {
  0% {
    opacity: 0;
    transform: translateY(18px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rowStaggerFade {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sectionEntrance {
  0% {
    opacity: 0;
    transform: translateY(14px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.monitoring-section {
  animation: sectionEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.kpi-card-animated {
  animation: dashboardSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
}

.kpi-card-animated:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -4px rgba(15, 23, 42, 0.08);
  border-color: #CBD5E1;
}

.ranking-row-animated {
  animation: rowStaggerFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Stagger utilities */
.stagger-1 { animation-delay: 40ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 160ms; }
.stagger-4 { animation-delay: 220ms; }
.stagger-5 { animation-delay: 280ms; }
.stagger-6 { animation-delay: 340ms; }

/* Progress bar smooth dynamic fill */
.progress-bar-fill {
  transition: width 0.85s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .monitoring-section,
  .kpi-card-animated,
  .ranking-row-animated,
  .progress-bar-fill,
  .fade-in {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}

/* ─── REFACTORED MONITORING DASHBOARD (SPACING & CARDS) ─── */
.dashboard-layout-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px 4px 48px;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.kpi-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 1024px) {
  .kpi-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .dashboard-layout-container {
    padding: 4px 2px 32px;
    gap: 32px;
  }
  .kpi-grid-4 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 14px;
  }
}

.kpi-metric-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E2E8F0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  box-sizing: border-box;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
}

.kpi-metric-card:hover {
  transform: translateY(-2px);
  box-shadow: none;
  border-color: #cbd5e1;
}

.ranking-card-container {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: none;
  overflow: hidden;
}

.ranking-card-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.executive-summary-container {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: none;
  padding: 24px;
  overflow: hidden;
}

.gap-badge-pos {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  background-color: #15803D;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.gap-badge-neg {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  background-color: #DC2626;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.gap-badge-zero {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  background-color: #475569;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  padding: 0;
  border-radius: 0;
  border: none !important;
  background-color: transparent !important;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-height: 44px;
  position: relative;
  box-shadow: none !important;
  transition: color 0.16s ease;
}

.sidebar-nav-item .sidebar-left-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0.35);
  width: 5px;
  height: 25px;
  border-radius: 0 6px 6px 0;
  background-color: #FF1E27;
  box-shadow: 0 0 12px rgba(255, 30, 39, 0.75);
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  z-index: 2;
}

.sidebar-nav-item .sidebar-nav-box {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 11px 24px;
  min-height: 44px;
  border-radius: 0;
  background-color: transparent;
  border: none !important;
  box-sizing: border-box;
  transition: background-color 0.18s ease;
}

.sidebar-nav-item .nav-icon-outline {
  display: block;
  color: rgba(255, 255, 255, 0.72);
  flex-shrink: 0;
  transition: color 0.16s ease;
}

.sidebar-nav-item .nav-icon-filled {
  display: none;
  color: #FF1E27;
  flex-shrink: 0;
  transition: color 0.16s ease;
}

.sidebar-nav-item .sidebar-nav-label {
  display: inline-block;
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.72);
  transition: color 0.16s ease, font-weight 0.16s ease;
}

.sidebar-nav-item.active,
.sidebar-nav-item:hover,
.sidebar-nav-item:focus-visible {
  background-color: transparent !important;
  color: #FFFFFF !important;
  box-shadow: none !important;
  outline: none;
}

.sidebar-nav-item.active .sidebar-left-indicator,
.sidebar-nav-item:hover .sidebar-left-indicator,
.sidebar-nav-item:focus-visible .sidebar-left-indicator {
  opacity: 1;
  transform: translateY(-50%) scaleY(1);
  background-color: #FF1E27 !important;
}

.sidebar-nav-item.active .sidebar-nav-box {
  background: linear-gradient(90deg, rgba(255, 30, 39, 0.24) 0%, rgba(255, 30, 39, 0.06) 100%) !important;
}

.sidebar-nav-item:hover .sidebar-nav-box,
.sidebar-nav-item:focus-visible .sidebar-nav-box {
  background: rgba(255, 30, 39, 0.14) !important;
}

.sidebar-nav-item:focus-visible .sidebar-nav-box {
  outline: 2px solid #FF1E27;
  outline-offset: -2px;
}

.sidebar-nav-item.active .nav-icon-outline,
.sidebar-nav-item:hover .nav-icon-outline,
.sidebar-nav-item:focus-visible .nav-icon-outline {
  display: none;
}

.sidebar-nav-item.active .nav-icon-filled,
.sidebar-nav-item:hover .nav-icon-filled,
.sidebar-nav-item:focus-visible .nav-icon-filled {
  display: block;
  color: #FF1E27 !important;
}

.sidebar-nav-item.active .sidebar-nav-label {
  color: #FFFFFF !important;
  font-weight: 600 !important;
}

.sidebar-nav-item:hover .sidebar-nav-label,
.sidebar-nav-item:focus-visible .sidebar-nav-label {
  color: #FFFFFF !important;
  font-weight: 500 !important;
}

.sidebar-brand-btn:focus-visible {
  outline: 2px solid #FF1E27;
  outline-offset: 4px;
  border-radius: 8px;
}

.sidebar-login-btn {
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease !important;
}

.sidebar-login-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35) !important;
  color: #021329 !important;
  background-color: #FFFFFF !important;
}

.sidebar-login-btn:active {
  transform: translateY(0) scale(0.98);
}

.quick-action-plus-btn:active,
.hero-review-btn:active {
  transform: scale(0.97);
}

.custom-table-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.custom-table-scrollbar::-webkit-scrollbar-track {
  background: #F1F5F9;
  border-radius: 4px;
}

.custom-table-scrollbar::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

.custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

@media (max-width: 1200px) {
  .dashboard-bottom-grid {
    grid-template-columns: 1fr !important;
  }
}

.app-sidebar {
  height: 100vh;
  min-height: 100dvh;
}

@media (max-width: 1024px) {
  .app-sidebar {
    position: fixed !important;
    left: 0;
    top: 0;
    bottom: 0;
    height: 100vh !important;
    min-height: 100vh !important;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 0 35px rgba(2, 19, 41, 0.7);
  }

  .app-sidebar.mobile-open {
    transform: translateX(0) !important;
  }

  .mobile-hamburger-btn {
    display: flex !important;
  }

  .header-left-zone {
    width: auto !important;
    min-width: auto !important;
  }

  .dashboard-top-row {
    flex-direction: column !important;
  }

  .hero-red-card {
    max-width: 100% !important;
  }

  .saas-main-viewport {
    padding: 16px 20px 40px !important;
  }
}

@media (max-width: 768px) {
  .top-header-bar {
    padding: 0 16px !important;
  }

  .header-breadcrumbs {
    display: none !important;
  }

  .header-profile-text {
    display: none !important;
  }

  .header-segmented-filter {
    display: none !important;
  }

  .saas-main-viewport {
    padding: 14px 14px 32px !important;
  }
}
```

## File: src/jobEvents.js
```javascript
import { authFetch } from './apiConfig';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RECONNECT_ATTEMPTS = 20;

// Satu blok SSE ("event: x\ndata: {...}") → { event, data }
const parseSseBlock = (block) => {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
};

// Memantau job latar belakang lewat Server-Sent Events sampai selesai.
// Dibaca dengan authFetch (bukan EventSource) agar cookie sesi yang kedaluwarsa diperbarui otomatis.
// Koneksi yang putus (jaringan / server restart) disambung ulang; server selalu mengirim status terakhir saat tersambung.
// Hasil: { event: 'completed' | 'failed', data }
export const watchJobEvents = async (url, { onProgress, signal } = {}) => {
  let attempts = 0;
  while (true) {
    let res;
    try {
      res = await authFetch(url, { headers: { Accept: 'text/event-stream' }, signal });
    } catch (err) {
      if (signal?.aborted) throw err;
      res = null;
    }

    if (res && res.ok && res.body) {
      attempts = 0;
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value.replace(/\r\n/g, '\n');
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const message = parseSseBlock(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            if (!message) continue;
            if (message.event === 'progress') onProgress?.(message.data);
            if (message.event === 'completed' || message.event === 'failed') return message;
          }
        }
      } catch (err) {
        if (signal?.aborted) throw err;
      }
    } else if (res && res.status < 500) {
      // 4xx (job tidak ditemukan / sesi berakhir / akses ditolak) tidak akan berubah bila diulang
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || `Gagal memantau progres (Status ${res.status}).`);
    }

    // Stream terputus sebelum hasil akhir → coba sambung ulang
    if (++attempts > MAX_RECONNECT_ATTEMPTS) {
      throw new Error('Koneksi ke server terputus saat memantau progres. Muat ulang halaman untuk melihat data terbaru.');
    }
    await sleep(3000);
  }
};
```

## File: src/main.jsx
```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { queryClient } from './lib/queryClient.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

## File: src/utils.js
```javascript
export const ACT_TYPES = [
  { key: 'tsel_menyapa', label: 'Tsel Menyapa Warga', kind: 'date_photo', fieldKey: 'planDate' },
  { key: 'branding_outlet', label: 'Branding Downline/Outlet', kind: 'photo' },
  { key: 'bumdes', label: 'Kerjasama dengan BUMDES', kind: 'photo' },
  { key: 'rekrutmen_sf', label: 'Rekrutmen SF AKAMSI', kind: 'text', fieldKey: 'keterangan', placeholder: 'Kode SF' },
  { key: 'open_table', label: 'Always ON Open Table', kind: 'photo' }
];

export const BRANCH_COLORS = {
  MAGELANG: '#10b981',   // Emerald Green
  PEKALONGAN: '#f97316', // Sunset Orange
  PURWOKERTO: '#3b82f6', // Royal Blue
  SEMARANG: '#ef4444',   // Telkomsel Red / Crimson
  SURAKARTA: '#8b5cf6',  // Royal Purple / Violet
  YOGYAKARTA: '#06b6d4'  // Cyan / Turquoise
};

const BRANCH_COORDS = {
  MAGELANG: { lat: -7.4797, lon: 110.2177 },
  PEKALONGAN: { lat: -6.8886, lon: 109.6753 },
  PURWOKERTO: { lat: -7.4245, lon: 109.2302 },
  SEMARANG: { lat: -7.0051, lon: 110.4381 },
  SURAKARTA: { lat: -7.5755, lon: 110.8243 },
  YOGYAKARTA: { lat: -7.7956, lon: 110.3695 }
};

export function getOdpCoords(odpName, branchName, existingLat, existingLon) {
  if (typeof existingLat === 'number' && typeof existingLon === 'number' && !isNaN(existingLat) && !isNaN(existingLon)) {
    return { lat: existingLat, lon: existingLon };
  }
  const base = BRANCH_COORDS[branchName?.toString().trim().toUpperCase()] || { lat: -7.25, lon: 110.0 };
  let h = 0;
  for (let i = 0; i < (odpName || '').length; i++) {
    h = ((h << 5) - h) + odpName.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h);
  const latOffset = ((abs % 1000) - 500) * 0.0003; // ~ +/- 0.15 deg (~15 km radius)
  const lonOffset = (((abs / 1000) | 0) % 1000 - 500) * 0.0003;
  return { lat: base.lat + latOffset, lon: base.lon + lonOffset };
}

export function actMeta(status) {
  if (status === 'verified') return { label: 'Terverifikasi', bg: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
  if (status === 'upload') return { label: 'Menunggu Verifikasi', bg: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  if (status === 'gagal' || status === 'rejected') return { label: 'Ditolak', bg: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' };
  if (status === 'proses' || status === 'processing') return { label: 'Diproses', bg: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
  return { label: 'Belum Dikerjakan', bg: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
}

export function flatOdps(branches, typeDesignFilter) {
  const out = [];
  for (const b of (Array.isArray(branches) ? branches : [])) {
    for (const p of (b.projects || [])) {
      if (typeDesignFilter && typeDesignFilter !== 'ALL' && (p.typeDesign || 'Greenfield') !== typeDesignFilter) {
        continue;
      }
      for (const o of (p.odps || [])) {
        const coords = getOdpCoords(o.odp, b.name, o.lat, o.lon);
        out.push({ ...o, lat: coords.lat, lon: coords.lon, branch: b.name, project: p.name, wok: p.wok });
      }
    }
  }
  return out;
}

export function computeStats(branches, typeDesignFilter) {
  let totalAvai = 0, totalUsed = 0, totalPort = 0, odpCount = 0;
  let totalProjCount = 0;
  const allActs = [];

  for (const b of (Array.isArray(branches) ? branches : [])) {
    const projs = b.projects || [];
    for (const p of projs) {
      if (typeDesignFilter && typeDesignFilter !== 'ALL' && (p.typeDesign || 'Greenfield') !== typeDesignFilter) {
        continue;
      }
      totalProjCount++;
      for (const o of (p.odps || [])) {
        totalAvai += o.avai;
        totalUsed += o.used;
        totalPort += o.total;
        odpCount++;
      }
      // Activities are at project level
      if (p.activities) {
        allActs.push(...p.activities);
      }
    }
  }

  const occRate = totalPort ? Math.round((totalUsed / totalPort) * 1000) / 10 : 0;
  const actVerified = allActs.filter(a => a.status === 'verified').length;
  const actUploaded = allActs.filter(a => a.status === 'upload').length;
  const actBelum = allActs.filter(a => a.status === 'belum').length;
  
  // Perhitungan Kontribusi Persentase Verifikasi:
  // Setiap 1 Proyek memiliki 5 Tipe Aktivitas.
  // Total Kapasitas Aktivitas = Total Proyek * 5.
  // Progress (%) = (Jumlah Aktivitas Terverifikasi / (Total Proyek * 5)) * 100%
  const totalActivitySlots = totalProjCount * 5;
  const actCompletionPct = totalActivitySlots ? Math.round((actVerified / totalActivitySlots) * 1000) / 10 : 0;
  
  return {
    totalAvai, totalUsed, totalPort, occRate,
    actVerified, actUploaded, actBelum, actCompletionPct, odpCount,
    totalProjCount, totalActivitySlots
  };
}

export function formatBranch(name) {
  if (!name || name === 'Semua Branch' || name === 'Multi Branch') return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function exportProjectsToExcel(branches, selectedBranchName = null) {
  import('xlsx-js-style').then(XLSX => {
    let targetBranches = Array.isArray(branches) ? branches : [];
    if (selectedBranchName && selectedBranchName !== 'Semua Branch' && selectedBranchName !== 'Multi Branch') {
      targetBranches = targetBranches.filter(b => b.name === selectedBranchName || b.name.toLowerCase() === selectedBranchName.toLowerCase());
    }

    const getActStatusLabel = (act, actTypeKey) => {
      if (!act || !act.status || act.status === 'belum') return 'Belum Dikerjakan';
      let label = act.status === 'verified' ? 'Terverifikasi' : 'Menunggu Verifikasi';
      if (actTypeKey === 'tsel_menyapa' && act.planDate) {
        const dStr = new Date(act.planDate).toLocaleDateString('id-ID');
        label += ` (Tgl: ${dStr})`;
      } else if (actTypeKey === 'branding_outlet' && act.namaOutlet) {
        label += ` (${act.namaOutlet})`;
      } else if (actTypeKey === 'bumdes' && (act.namaBumdes || act.keterangan)) {
        label += ` (${act.namaBumdes || act.keterangan})`;
      } else if (actTypeKey === 'rekrutmen_sf' && (act.keterangan || act.kodeSf)) {
        label += ` (${act.kodeSf || act.keterangan})`;
      }
      return label;
    };

    const getOverallProjectStatus = (acts) => {
      if (acts.some(a => a.status === 'upload')) return 'Menunggu Verifikasi';
      if (acts.some(a => a.status === 'verified')) return 'Terverifikasi';
      return 'Belum Dikerjakan';
    };

    const dataRows = [];

    targetBranches.forEach(b => {
      const bName = formatBranch(b.name);
      (b.projects || []).forEach(p => {
        const used = p.usedTotal ?? (p.odps || []).reduce((s, o) => s + (o.used || 0), 0);
        const avai = p.avaiTotal ?? (p.odps || []).reduce((s, o) => s + (o.avai || 0), 0);
        const total = p.totalPort ?? (p.odps || []).reduce((s, o) => s + (o.total || 0), 0);
        const occ = total > 0 ? (used / total * 100).toFixed(1) + '%' : '0%';

        const acts = p.activities || [];
        const tselAct = acts.find(a => a.type === 'tsel_menyapa');
        const brandingAct = acts.find(a => a.type === 'branding_outlet');
        const bumdesAct = acts.find(a => a.type === 'bumdes');
        const rekrutmenAct = acts.find(a => a.type === 'rekrutmen_sf');
        const openTableAct = acts.find(a => a.type === 'open_table');

        dataRows.push([
          bName,
          p.wok || '-',
          p.name,
          p.typeDesign || 'Greenfield',
          used,
          avai,
          total,
          occ,
          getActStatusLabel(tselAct, 'tsel_menyapa'),
          getActStatusLabel(brandingAct, 'branding_outlet'),
          getActStatusLabel(bumdesAct, 'bumdes'),
          getActStatusLabel(rekrutmenAct, 'rekrutmen_sf'),
          getActStatusLabel(openTableAct, 'open_table'),
          getOverallProjectStatus(acts)
        ]);
      });
    });

    if (dataRows.length === 0) {
      alert('⚠️ Tidak ada data proyek untuk diexport.');
      return;
    }

    const dateFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const titleRow1 = ['REKAPITULASI MONITORING AKTIVITAS GTM (GENERATING TRAFFIC & MOVEMENT)'];
    const titleRow2 = [`Tanggal Export: ${dateFormatted} | Total LOP / Proyek: ${dataRows.length}`];
    const emptyRow = [];
    const headerRow = [
      'Branch',
      'WOK',
      'Nama LOP / Proyek',
      'Type Design',
      'Used Port',
      'Avai Port',
      'Total Port',
      'Occupancy Rate (%)',
      'Tsel Menyapa Warga',
      'Branding Outlet',
      'BUMDES',
      'Rekrutmen SF',
      'Open Table',
      'Status LOP'
    ];

    const sheetData = [titleRow1, titleRow2, emptyRow, headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge title rows A1 & A2
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }
    ];

    if (ws['A1']) {
      ws['A1'].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "0F172A" } },
        alignment: { vertical: "center" }
      };
    }
    if (ws['A2']) {
      ws['A2'].s = {
        font: { name: "Calibri", sz: 11, italic: true, color: { rgb: "475569" } },
        alignment: { vertical: "center" }
      };
    }

    // AutoFilter across A4:N...
    ws['!autofilter'] = { ref: `A4:N${3 + dataRows.length}` };

    // Style Header A4:N4 with Telkomsel Red (#800000) & White Bold Text (#FFFFFF)
    const headerCols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
    headerCols.forEach(col => {
      const cellRef = `${col}4`;
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: "C8102E" } // Telkomsel Red (#800000)
          },
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: { rgb: "FFFFFF" } // White text
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          },
          border: {
            top: { style: "thin", color: { rgb: "BFBFBF" } },
            bottom: { style: "thin", color: { rgb: "BFBFBF" } },
            left: { style: "thin", color: { rgb: "BFBFBF" } },
            right: { style: "thin", color: { rgb: "BFBFBF" } }
          }
        };
      }
    });

    ws['!cols'] = [
      { wch: 16 }, // Branch
      { wch: 22 }, // WOK
      { wch: 32 }, // Nama LOP
      { wch: 14 }, // Type Design
      { wch: 10 }, // Used Port
      { wch: 10 }, // Avai Port
      { wch: 10 }, // Total Port
      { wch: 18 }, // Occupancy Rate
      { wch: 30 }, // Tsel Menyapa
      { wch: 22 }, // Branding
      { wch: 22 }, // BUMDES
      { wch: 30 }, // Rekrutmen SF
      { wch: 22 }, // Open Table
      { wch: 24 }  // Status LOP
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap LOP');

    const cleanName = selectedBranchName && selectedBranchName !== 'Semua Branch' && selectedBranchName !== 'Multi Branch'
      ? formatBranch(selectedBranchName).replace(/\s+/g, '_')
      : 'Semua_Branch';

    const today = new Date().toISOString().split('T')[0];
    const fileName = cleanName !== 'Semua_Branch'
      ? `Rekap_GTM_Activity_${cleanName}_${today}.xlsx`
      : `Rekap_GTM_Activity_${today}.xlsx`;

    XLSX.writeFile(wb, fileName);
  });
}
```

## File: index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='gtmGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23C8102E'/%3E%3Cstop offset='100%25' stop-color='%23FF5E00'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='50' fill='url(%23gtmGrad)'/%3E%3Ctext x='50' y='54' font-family='sans-serif' font-weight='900' font-size='34' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle' letter-spacing='-1'%3EGTM%3C/text%3E%3C/svg%3E" />
    <link rel="shortcut icon" type="image/svg+xml" href="/favicon.svg?v=3" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GTM Activity Monitor - Jateng DIY</title>
    <!-- Google Fonts: Inter & Geist (Modern Neo-Grotesque / Geometric Sans-Serif UI Fonts) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## File: package.json
```json
{
  "name": "gtm-monitor-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test:e2e": "vite build --mode e2e && playwright test",
    "test:e2e:update": "vite build --mode e2e && playwright test --update-snapshots"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.104.5",
    "@tanstack/react-virtual": "^3.14.22",
    "html2canvas": "^1.4.1",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-router": "^7.18.4",
    "xlsx": "^0.18.5",
    "xlsx-js-style": "^1.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.64.1",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "oxlint": "^1.71.0",
    "vite": "^8.1.1"
  }
}
```

## File: vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      // Foto kegiatan terverifikasi (object storage, disajikan backend lewat /media/verified/...)
      '/media': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      // URL foto format lama — dialihkan backend ke /media/verified/...
      '^/database(%20| )foto': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  }
})
```
