import { useCallback } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useAuth } from '../auth/AuthContext';
import { useMonitoringData } from './useMonitoringData';

// Aksi kegiatan GTM per proyek: unggah foto, verifikasi & tolak (Admin), hapus foto.
// Setelah aksi, data monitoring diambil ulang (TanStack Query invalidate) — sama seperti fetchData() sebelumnya.
export function useActivityActions() {
  const { isAdmin } = useAuth();
  const { branches, refresh } = useMonitoringData();

  const uploadPhoto = useCallback(async (branchName, projectName, actType, payload) => {
    let file = payload;
    let planDate = null;
    let namaOutlet = null;
    let namaBumdes = null;
    let kodeSf = null;
    let keterangan = null;

    if (payload && typeof payload === 'object' && !(payload instanceof File)) {
      file = payload.file;
      planDate = payload.planDate;
      namaOutlet = payload.namaOutlet;
      namaBumdes = payload.namaBumdes;
      kodeSf = payload.kodeSf;
      keterangan = payload.keterangan;
    }

    const b = branches.find(x => x.name === branchName);
    const p = b?.projects.find(x => x.name === projectName);

    const formData = new FormData();
    formData.append('branchName', branchName);
    formData.append('projectName', projectName);
    formData.append('wokName', p?.wok || 'WOK');
    formData.append('type', actType);
    if (file) formData.append('photo', file);
    if (planDate) formData.append('planDate', planDate);
    if (namaOutlet) formData.append('namaOutlet', namaOutlet);
    if (namaBumdes) formData.append('namaBumdes', namaBumdes);
    if (kodeSf) formData.append('kodeSf', kodeSf);
    if (keterangan) formData.append('keterangan', keterangan);

    try {
      const res = await authFetch(`${API_BASE_URL}/api/activities`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await refresh();
        return { success: true };
      } else {
        if (res.status === 401) return { success: false, error: 'Sesi login berakhir.' };
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || errData.message || `Gagal menyimpan kegiatan (Status ${res.status}).`;
        alert(`❌ ${errMsg}`);
        await refresh();
        return { success: false, error: errMsg };
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('❌ Gagal terhubung ke server saat mengunggah kegiatan. Periksa koneksi lalu coba lagi.');
      await refresh();
      return { success: false, error: err.message };
    }
  }, [branches, refresh]);

  const verifyActivity = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    if (!isAdmin) return false;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          photoId,
          projectId
        })
      });
      if (res.ok) {
        await refresh();
        return true;
      }
      if (res.status !== 401) {
        const data = await res.json().catch(() => ({}));
        alert(`❌ ${data.message || data.error || `Gagal memverifikasi activity (Status ${res.status}).`}`);
      }
      return false;
    } catch (err) {
      console.error('Error verifying activity:', err);
      alert('❌ Terjadi kesalahan server saat memverifikasi activity.');
      return false;
    }
  }, [isAdmin, refresh]);

  const rejectActivity = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    if (!isAdmin) return false;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branchName,
          projectName,
          type: actType,
          photoId,
          projectId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refresh();
        return true;
      } else {
        if (res.status !== 401) alert(`❌ ${data.message || 'Gagal menolak verifikasi activity.'}`);
        return false;
      }
    } catch (err) {
      console.error('Error rejecting activity:', err);
      alert('❌ Terjadi kesalahan server saat menolak verifikasi.');
      return false;
    }
  }, [isAdmin, refresh]);

  const deletePhoto = useCallback(async (branchName, projectName, actType, photoId, projectId) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/activities/delete-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ branchName, projectName, type: actType, photoId, projectId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refresh();
        return true;
      } else {
        if (res.status !== 401) alert(`❌ ${data.message || 'Gagal menghapus foto.'}`);
        return false;
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('❌ Terjadi kesalahan saat menghapus foto.');
      return false;
    }
  }, [refresh]);

  return { uploadPhoto, verifyActivity, rejectActivity, deletePhoto };
}
