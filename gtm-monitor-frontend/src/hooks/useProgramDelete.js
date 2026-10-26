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
