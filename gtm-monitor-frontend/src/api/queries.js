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
