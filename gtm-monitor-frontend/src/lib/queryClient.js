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
