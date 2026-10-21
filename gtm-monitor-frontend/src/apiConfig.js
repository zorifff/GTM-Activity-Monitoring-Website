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
