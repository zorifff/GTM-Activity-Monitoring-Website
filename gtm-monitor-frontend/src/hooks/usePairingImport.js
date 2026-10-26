import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { watchJobEvents } from '../jobEvents';

// Update Data Tsel One Pairing (Excel) → diproses worker latar belakang, progres via SSE
export function usePairingImport() {
  const [pairingFile, setPairingFile] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  // Progres import pairing dari worker latar belakang (ditampilkan di teks tombol)
  const [pairingProgress, setPairingProgress] = useState('');
  const pairingAbortRef = useRef(null);
  useEffect(() => () => pairingAbortRef.current?.abort(), []);
  const [pairingMessage, setPairingMessage] = useState(null);
  const [pairingError, setPairingError] = useState(null);

  const handlePairingUpload = async (e) => {
    e.preventDefault();
    if (!pairingFile) {
      setPairingError('Pilih file Excel Tsel One Pairing terlebih dahulu.');
      return;
    }

    setPairingLoading(true);
    setPairingMessage('Sedang mengunggah & mengindeks data pairing... Harap tunggu (±15-20 detik)...');
    setPairingError(null);
    setPairingProgress('');

    const formData = new FormData();
    formData.append('file', pairingFile);
    const abortController = new AbortController();
    pairingAbortRef.current = abortController;

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/upload-pairing-excel`, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Sesi login Admin telah berakhir atau tidak sah (Status 401/403). Silakan tekan tombol Log Out lalu masuk kembali.');
        }
        throw new Error(data.error || data.message || `Gagal mengunggah file Tsel One Pairing (Status ${res.status}).`);
      }

      // 202 = file diterima & diproses worker latar belakang → pantau progres (SSE) sampai selesai
      if (res.status === 202 && data.jobId) {
        setPairingProgress('Menunggu antrean');
        const outcome = await watchJobEvents(`${API_BASE_URL}/api/admin/upload-pairing-excel/${data.jobId}/events`, {
          signal: abortController.signal,
          onProgress: (job) => {
            if (job.state === 'waiting' || job.state === 'delayed') setPairingProgress('Menunggu antrean');
            else if (job.progress?.stage) setPairingProgress(`${job.progress.stage} ${job.progress.percent}%`);
          }
        });
        if (outcome.event !== 'completed') {
          const body = outcome.data.error?.body || {};
          throw new Error(body.error || body.message || 'Gagal memproses file Excel pairing.');
        }
        data = outcome.data.result || {};
      }

      setPairingMessage(data.message || 'Berhasil mengimpor Data Tsel One Pairing!');
      setPairingFile(null);
    } catch (err) {
      if (err.name === 'AbortError') return; // panel ditutup; import tetap berjalan di server
      setPairingMessage(null);
      setPairingError(err.message || 'Terjadi kesalahan saat upload file Tsel One Pairing.');
    } finally {
      setPairingLoading(false);
      setPairingProgress('');
    }
  };

  return { pairingFile, setPairingFile, pairingLoading, pairingProgress, pairingMessage, setPairingMessage, pairingError, setPairingError, handlePairingUpload };
}
