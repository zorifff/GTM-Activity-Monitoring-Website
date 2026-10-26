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
