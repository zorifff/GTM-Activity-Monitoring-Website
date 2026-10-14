export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:3001' : '');

// Event global saat server menolak token (401) — App.jsx akan me-logout & meminta login ulang
export const UNAUTHORIZED_EVENT = 'gtm:unauthorized';

// fetch untuk endpoint yang membutuhkan login: memberi tahu App jika sesi sudah tidak sah
export const authFetch = async (url, options) => {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return res;
};
