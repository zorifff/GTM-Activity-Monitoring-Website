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
