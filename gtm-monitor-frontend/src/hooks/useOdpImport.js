import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { watchJobEvents } from '../jobEvents';

// Update Data ODP mingguan (Excel) → diproses worker latar belakang, progres via SSE. onUpdate = muat ulang data monitoring.
export function useOdpImport({ onUpdate }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  // Progres import ODP dari worker latar belakang (ditampilkan di teks tombol)
  const [importProgress, setImportProgress] = useState('');
  const importAbortRef = useRef(null);
  useEffect(() => () => importAbortRef.current?.abort(), []);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);
    setImportProgress('');

    const formData = new FormData();
    formData.append('file', file);
    const abortController = new AbortController();
    importAbortRef.current = abortController;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/admin/import-excel`, {
        method: 'POST',
        body: formData
      });

      const contentType = response.headers.get('content-type') || '';
      let result = {};
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textErr = await response.text();
        throw new Error(`Server mengembalikan respon non-JSON (${response.status}): ${textErr.slice(0, 120)}...`);
      }

      let succeeded = response.ok && result.success;
      // 202 = file diterima & diproses worker latar belakang → pantau progres (SSE) sampai selesai
      if (response.status === 202 && result.jobId) {
        setImportProgress('Menunggu antrean');
        const outcome = await watchJobEvents(`${API_BASE_URL}/api/admin/import-excel/${result.jobId}/events`, {
          signal: abortController.signal,
          onProgress: (job) => {
            if (job.state === 'waiting' || job.state === 'delayed') setImportProgress('Menunggu antrean');
            else if (job.progress?.stage) setImportProgress(`${job.progress.stage} ${job.progress.percent}%`);
          }
        });
        result = outcome.event === 'completed' ? (outcome.data.result || {}) : (outcome.data.error?.body || {});
        succeeded = outcome.event === 'completed' && !!result.success;
      }

      if (succeeded) {
        setMessage(result.message || 'Database berhasil diperbarui dengan data Excel baru!');
        setFile(null);
        if (onUpdate) onUpdate();
      } else if (response.status === 401) {
        setError(result.message || result.error || 'Sesi login Admin telah berakhir. Silakan login kembali.');
      } else {
        setError(result.message || result.error || 'Gagal mengunggah dan memperbarui database.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // panel ditutup; import tetap berjalan di server
      setError(err.message || 'Terjadi kesalahan koneksi ke server. Pastikan server backend sedang berjalan.');
      console.error(err);
    } finally {
      setLoading(false);
      setImportProgress('');
    }
  };

  return { file, setFile, loading, importProgress, message, setMessage, error, setError, handleFileChange, handleUpload };
}
