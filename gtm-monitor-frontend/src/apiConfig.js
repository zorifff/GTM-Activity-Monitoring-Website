// Default '' = same-origin (produksi: backend menyajikan frontend; dev: lewat proxy Vite di vite.config.js)
// agar cookie sesi HttpOnly selalu terkirim tanpa masalah lintas-origin.
export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : '';

// Event global saat server menolak sesi (401) — App.jsx akan me-logout & meminta login ulang
export const UNAUTHORIZED_EVENT = 'gtm:unauthorized';

// fetch dengan cookie sesi (HttpOnly) — token tidak pernah disentuh JavaScript
export const authFetch = async (url, options = {}) => {
  const res = await fetch(url, { ...options, credentials: 'include' });
  if (res.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return res;
};
