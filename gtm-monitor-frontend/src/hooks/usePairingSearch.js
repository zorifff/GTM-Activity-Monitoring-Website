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
