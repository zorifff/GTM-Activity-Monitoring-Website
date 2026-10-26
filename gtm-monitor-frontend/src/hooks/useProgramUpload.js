import { useState } from 'react';
import { API_BASE_URL, authFetch } from '../apiConfig';
import { useProgramsForMonth, useInvalidatePrograms } from './usePrograms';

// Upload gambar Tracking Program bulanan (Cloudinary + pindai link OCR)
export function useProgramUpload() {
  const [programFile, setProgramFile] = useState(null);
  const [programMonthLabel, setProgramMonthLabel] = useState('Agustus 2026');
  const [programName, setProgramName] = useState('');
  const [programDetailUrl, setProgramDetailUrl] = useState('');
  const [programLoading, setProgramLoading] = useState(false);
  const [programMessage, setProgramMessage] = useState(null);
  const [programError, setProgramError] = useState(null);
  const [programResultUpload, setProgramResultUpload] = useState(null);
  const uploadAvailablePrograms = useProgramsForMonth(programMonthLabel);
  const invalidatePrograms = useInvalidatePrograms();

  const handleProgramUpload = async (e) => {
    e.preventDefault();
    if (!programFile) {
      setProgramError('Pilih file gambar tracking program (.jpg, .png) terlebih dahulu.');
      return;
    }

    const finalProgramName = programName.trim();
    if (!finalProgramName) {
      setProgramError('Masukkan nama program terlebih dahulu.');
      return;
    }

    setProgramLoading(true);
    setProgramMessage('Mengunggah ke Cloudinary & memindai link otomatis (OCR)... Harap tunggu...');
    setProgramError(null);
    setProgramResultUpload(null);

    const formData = new FormData();
    formData.append('file', programFile);
    formData.append('monthLabel', programMonthLabel);
    formData.append('programName', finalProgramName);
    if (programDetailUrl) {
      formData.append('detailUrl', programDetailUrl.trim());
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/upload-program-image`, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        throw new Error(`Server mengembalikan respon non-JSON (${res.status}): ${textErr.slice(0, 120)}...`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Gagal mengunggah gambar program (Status ${res.status}).`);
      }

      setProgramMessage(data.message || `Berhasil mengunggah Gambar Program "${finalProgramName}" (${programMonthLabel}) ke Cloudinary!`);
      setProgramResultUpload(data);
      setProgramFile(null);
      setProgramName('');
      setProgramDetailUrl('');
      // Daftar program (menu PROGRAM & form di panel ini) diambil ulang
      invalidatePrograms();
    } catch (err) {
      console.error('Program Image Upload Error:', err);
      setProgramError(err.message);
    } finally {
      setProgramLoading(false);
    }
  };

  return {
    programFile, setProgramFile, programMonthLabel, setProgramMonthLabel, programName, setProgramName,
    programDetailUrl, setProgramDetailUrl, programLoading, programMessage, setProgramMessage,
    programError, setProgramError, programResultUpload, uploadAvailablePrograms, handleProgramUpload
  };
}
