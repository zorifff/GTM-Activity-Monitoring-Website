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
