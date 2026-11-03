# Bundle 3: Modal Interaktif, Dialog Konfirmasi, & Popover

> Berisi komponen dialog interaksi pengguna seperti Upload Modal, Review & Verifikasi Lapangan, Reject/Delete Confirmation, Import Excel, Export Rekap, dan Popover Cek Pairing.

**Daftar Berkas Terlampir (16 berkas):**

- `gtm-monitor-frontend/src/components/UploadModal.jsx` (356 baris)
- `gtm-monitor-frontend/src/components/ConfirmSubmitModal.jsx` (128 baris)
- `gtm-monitor-frontend/src/components/ReviewModal.jsx` (502 baris)
- `gtm-monitor-frontend/src/components/ConfirmRejectModal.jsx` (227 baris)
- `gtm-monitor-frontend/src/components/ConfirmDeleteModal.jsx` (228 baris)
- `gtm-monitor-frontend/src/components/ProgramViewerModal.jsx` (1092 baris)
- `gtm-monitor-frontend/src/components/CekPairingPopover.jsx` (665 baris)
- `gtm-monitor-frontend/src/components/admin/OdpImportModal.jsx` (296 baris)
- `gtm-monitor-frontend/src/components/admin/PairingImportModal.jsx` (298 baris)
- `gtm-monitor-frontend/src/components/admin/ExportRekapModal.jsx` (65 baris)
- `gtm-monitor-frontend/src/components/admin/ProgramUploadModal.jsx` (445 baris)
- `gtm-monitor-frontend/src/components/admin/ProgramDeleteModal.jsx` (276 baris)
- `gtm-monitor-frontend/src/components/admin/DeleteProgramConfirmModal.jsx` (135 baris)
- `gtm-monitor-frontend/src/components/admin/UploadGuideModal.jsx` (240 baris)
- `gtm-monitor-frontend/src/components/layout/LogoutConfirmModal.jsx` (111 baris)
- `gtm-monitor-frontend/src/components/layout/SessionExpiredModal.jsx` (70 baris)

**Total Baris Kode**: 5.134 baris

---

## File: `gtm-monitor-frontend/src/components/UploadModal.jsx` (356 baris)

```javascript
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function UploadModal({ data, onClose, onSubmit }) {
  if (!data) return null;
  const { branchName, projectName, actTypeObj } = data;

  const actKey = actTypeObj.key;
  const actLabel = actTypeObj.label;

  const [planDate, setPlanDate] = useState('');
  const [namaOutlet, setNamaOutlet] = useState('');
  const [namaBumdes, setNamaBumdes] = useState('');
  const [kodeSf, setKodeSf] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;
    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('File harus berupa gambar (JPG, PNG, WEBP, dll).');
        return;
      }
      setSelectedFile(file);
      setErrorMsg('');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmitAttempt = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validasi aturan input per activity
    if (actKey === 'branding_outlet') {
      if (!namaOutlet.trim()) {
        setErrorMsg('Nama Outlet wajib diisi.');
        return;
      }
      if (!selectedFile) {
        setErrorMsg('Foto bukti kegiatan wajib diunggah.');
        return;
      }
    } else if (actKey === 'open_table' || actKey === 'tsel_menyapa') {
      if (!planDate) {
        setErrorMsg('Tanggal wajib dipilih.');
        return;
      }
      if (!selectedFile) {
        setErrorMsg('Foto bukti kegiatan wajib diunggah.');
        return;
      }
    } else if (actKey === 'bumdes') {
      if (!namaBumdes.trim()) {
        setErrorMsg('Nama BUMDES wajib diisi.');
        return;
      }
      if (!selectedFile) {
        setErrorMsg('Foto bukti kegiatan wajib diunggah.');
        return;
      }
    } else if (actKey === 'rekrutmen_sf') {
      if (!kodeSf.trim()) {
        setErrorMsg('Kode SF wajib diisi.');
        return;
      }
    }

    // Panggil trigger konfirmasi
    onSubmit({
      file: selectedFile,
      planDate,
      namaOutlet: namaOutlet.trim(),
      namaBumdes: namaBumdes.trim(),
      kodeSf: kodeSf.trim(),
      keterangan: kodeSf.trim() || namaOutlet.trim() || namaBumdes.trim()
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', boxSizing: 'border-box'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'relative', width: '100%', maxWidth: '480px',
          background: '#FFFFFF', borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '26px 28px', boxSizing: 'border-box',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#FF5E00', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Upload Kegiatan GTM
            </div>
            <h3 id="upload-modal-title" style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: '4px 0 2px 0', fontFamily: "var(--font-heading)" }}>
              {actLabel}
            </h3>
            <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
              {projectName} · <span style={{ color: '#0F172A' }}>{branchName}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form upload kegiatan"
            style={{
              width: '32px', height: '32px', borderRadius: '50%', border: 'none',
              background: '#F1F5F9', color: '#64748B', fontSize: '15px',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
            padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 600,
            marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitAttempt} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Form Input: Branding Outlet -> Nama Outlet */}
          {actKey === 'branding_outlet' && (
            <div>
              <label htmlFor="upload-nama-outlet" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nama Outlet <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-nama-outlet"
                type="text"
                placeholder="Masukkan Nama Outlet..."
                value={namaOutlet}
                onChange={(e) => setNamaOutlet(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Form Input: Kerjasama BUMDES -> Nama BUMDES */}
          {actKey === 'bumdes' && (
            <div>
              <label htmlFor="upload-nama-bumdes" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nama BUMDES <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-nama-bumdes"
                type="text"
                placeholder="Masukkan Nama BUMDES..."
                value={namaBumdes}
                onChange={(e) => setNamaBumdes(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Form Input: Always Open Table & Tsel Menyapa -> Tanggal */}
          {(actKey === 'open_table' || actKey === 'tsel_menyapa') && (
            <div>
              <label htmlFor="upload-plan-date" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tanggal Kegiatan <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-plan-date"
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Form Input: Rekrutmen SF -> Kode SF (wajib, satu-satunya input) */}
          {actKey === 'rekrutmen_sf' && (
            <div>
              <label htmlFor="upload-kode-sf" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Kode SF <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="upload-kode-sf"
                type="text"
                placeholder="Contoh: SF 09812..."
                value={kodeSf}
                onChange={(e) => setKodeSf(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid #CBD5E1', fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Upload Foto Dropzone — disembunyikan untuk Rekrutmen SF */}
          {actKey !== 'rekrutmen_sf' && (
            <div>
              <label htmlFor="upload-modal-file-input" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Foto Bukti Kegiatan {['branding_outlet', 'open_table', 'tsel_menyapa', 'bumdes'].includes(actKey) && <span style={{ color: '#DC2626' }}>*</span>}
              </label>

              {previewUrl ? (
                <div style={{
                  position: 'relative', width: '100%', height: '180px', borderRadius: '12px',
                  overflow: 'hidden', border: '2px solid #10B981', background: '#0F172A'
                }}>
                  <img src={previewUrl} alt="Preview Bukti Unggahan" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      padding: '4px 10px', borderRadius: '8px', border: 'none',
                      background: 'rgba(220, 38, 38, 0.9)', color: '#FFF', fontSize: '11px',
                      fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label 
                  htmlFor="upload-modal-file-input"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '140px', borderRadius: '12px', border: '2px dashed #CBD5E1',
                    background: '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s', padding: '16px'
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Pilih File Foto Bukti</span>
                  <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Format JPG, PNG (Max 5MB)</span>
                  <input
                    id="upload-modal-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 20px', borderRadius: '10px',
                border: '1px solid #E2E8F0', background: '#F8FAFC',
                color: '#475569', fontSize: '13.5px', fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                padding: '11px 22px', borderRadius: '10px', border: '1px solid #991B1B',
                background: '#800000',
                color: '#FFFFFF', fontSize: '13.5px', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(128, 0, 0, 0.25)'
              }}
            >
              Kirim
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/ConfirmSubmitModal.jsx` (128 baris)

```javascript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmSubmitModal({ data, onConfirm, onCancel, isSubmitting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!data) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, isSubmitting, onCancel]);

  if (!data) return null;
  const { projectName, actLabel } = data;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-submit-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', boxSizing: 'border-box'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'relative', width: '100%', maxWidth: '420px',
          background: '#FFFFFF', borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '28px 24px', boxSizing: 'border-box',
          textAlign: 'center', animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Badge Icon */}
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: '#FFF7ED',
          border: '1px solid #FED7AA', color: '#FF5E00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h3 id="confirm-submit-title" style={{ fontSize: '19px', fontWeight: 600, color: '#0F172A', margin: '0 0 10px 0', fontFamily: "var(--font-heading)" }}>
          Konfirmasi Pengiriman
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px 0', fontWeight: 500 }}>
          Apakah Anda ingin menambahkan foto di <strong style={{ color: '#0F172A' }}>{actLabel}</strong> pada proyek <strong style={{ color: '#0F172A' }}>"{projectName}"</strong>?
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid #E2E8F0', background: '#F8FAFC',
              color: '#475569', fontSize: '13.5px', fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid #991B1B', background: '#800000',
              color: '#FFFFFF', fontSize: '13.5px', fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(128, 0, 0, 0.25)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/ReviewModal.jsx` (502 baris)

```javascript
import { useState, useEffect, useRef } from 'react';
import { ACT_TYPES, actMeta } from '../utils';
import ConfirmRejectModal from './ConfirmRejectModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function ReviewModal({ modalData, closeModal, verifyActivity, rejectActivity, deletePhoto }) {
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [localActivities, setLocalActivities] = useState(modalData?.activities || []);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  const modalRef = useRef(null);

  useEffect(() => {
    if (modalData?.activities) {
      setLocalActivities(modalData.activities);
    }
  }, [modalData]);

  // Focus trap & Escape listener for dialog and lightbox (R-32 & R-39)
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;
    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    if (!previewPhoto) {
      firstEl?.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewPhoto) {
          setPreviewPhoto(null);
        } else {
          closeModal();
        }
        return;
      }
      if (e.key === 'Tab' && !previewPhoto) {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, previewPhoto]);

  if (!modalData) return null;

  const handleVerify = async (actKey, photoId) => {
    if (verifyActivity && !verifyingId) {
      setVerifyingId(photoId);
      try {
        const resOk = await verifyActivity(modalData.bName, modalData.pName, actKey, photoId, modalData.projectId);
        if (resOk === false) return;
        setLocalActivities(prev => prev.map(a => {
          if (a.type !== actKey) return a;
          const updatedPhotos = (a.photos || []).map(ph => ph.id === photoId ? { ...ph, status: 'verified' } : ph);
          const allVerified = updatedPhotos.length > 0 && updatedPhotos.every(ph => ph.status === 'verified');
          return { ...a, status: allVerified ? 'verified' : 'upload', photos: updatedPhotos };
        }));
      } catch (err) {
        console.error('Error verifying activity:', err);
      } finally {
        setVerifyingId(null);
      }
    }
  };

  const triggerRejectConfirm = (actKey, photoId, actLabel, photoIndex) => {
    setRejectTarget({
      actKey,
      photoId,
      actLabel,
      photoIndex,
      pName: modalData.pName,
      bName: modalData.bName,
      projectId: modalData.projectId
    });
  };

  const handleExecuteReject = async () => {
    if (!rejectTarget || !rejectActivity) return;
    setIsRejecting(true);
    try {
      const { actKey, photoId, bName, pName, projectId } = rejectTarget;
      const resOk = await rejectActivity(bName, pName, actKey, photoId, projectId);
      if (resOk !== false) {
        setLocalActivities(prev => prev.map(a => {
          if (a.type !== actKey) return a;
          const updatedPhotos = photoId
            ? (a.photos || []).filter(ph => ph.id !== photoId)
            : [];
          const hasRemainingUpload = updatedPhotos.some(ph => ph.status === 'upload');
          const hasRemainingVerified = updatedPhotos.some(ph => ph.status === 'verified');
          const newStatus = hasRemainingUpload ? 'upload' : hasRemainingVerified ? 'verified' : 'belum';
          const isCleared = updatedPhotos.length === 0;
          const latest = updatedPhotos[updatedPhotos.length - 1];
          return {
            ...a,
            status: isCleared ? 'belum' : newStatus,
            photos: isCleared ? [] : updatedPhotos,
            photoUrl: isCleared ? null : latest?.photoUrl || null,
            planDate: isCleared ? null : latest?.planDate || null,
            keterangan: isCleared ? null : latest?.keterangan || null,
            namaOutlet: isCleared ? null : latest?.namaOutlet || null,
            namaBumdes: isCleared ? null : latest?.namaBumdes || null,
            kodeSf: isCleared ? null : latest?.kodeSf || null
          };
        }));
      }
      setRejectTarget(null);
    } catch (err) {
      console.error('Error rejecting activity:', err);
    } finally {
      setIsRejecting(false);
    }
  };

  const triggerDeleteConfirm = (actKey, photoId, actLabel, photoIndex) => {
    setDeleteTarget({
      actKey,
      photoId,
      actLabel,
      photoIndex,
      pName: modalData.pName,
      bName: modalData.bName,
      projectId: modalData.projectId
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { actKey, photoId, bName, pName, projectId } = deleteTarget;
      let resOk = false;
      if (deletePhoto) {
        resOk = await deletePhoto(bName, pName, actKey, photoId, projectId);
      } else if (rejectActivity) {
        resOk = await rejectActivity(bName, pName, actKey, photoId, projectId);
      }
      if (resOk !== false) {
        setLocalActivities(prev => prev.map(a => {
          if (a.type !== actKey) return a;
          const updatedPhotos = (a.photos || []).filter(ph => ph.id !== photoId);
          const hasRemainingUpload = updatedPhotos.some(ph => ph.status === 'upload');
          const hasRemainingVerified = updatedPhotos.some(ph => ph.status === 'verified');
          const newStatus = hasRemainingUpload ? 'upload' : hasRemainingVerified ? 'verified' : 'belum';
          const isCleared = updatedPhotos.length === 0;
          return {
            ...a,
            status: isCleared ? 'belum' : newStatus,
            photos: isCleared ? [] : updatedPhotos,
            ...(isCleared ? { keterangan: null, kodeSf: null, namaOutlet: null, namaBumdes: null, planDate: null, photoUrl: null } : {})
          };
        }));
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={closeModal}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '24px' }}
    >
      <div 
        ref={modalRef}
        onClick={e => e.stopPropagation()} 
        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' }}
      >
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div id="review-modal-title" style={{ fontFamily: "var(--font-heading)", fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{modalData.pName}</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>{modalData.wok} · {modalData.bName}</div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Tutup dialog review proyek"
            style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ padding: '20px 26px' }}>
          {/* Project Stats Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '22px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Available</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.totalAvai}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Used</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.totalUsed}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Port</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.totalPort}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Jumlah ODP</div>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{modalData.odpCount}</div>
            </div>
          </div>

          {/* ODP List */}
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Daftar ODP dalam Proyek</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {modalData.odps.map(o => (
              <span key={o.odp} style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                background: o.used === 0 ? '#e2e8f0' : '#dcfce7',
                color: o.used === 0 ? '#334155' : '#16a34a'
              }}>
                {o.odp} ({o.used}/{o.total})
              </span>
            ))}
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Detail Activity GTM</div>
          
          {ACT_TYPES.map(actType => {
            const a = localActivities.find(x => x.type === actType.key);

            // Foto / kegiatan yang ditolak (status 'belum') dihapus dari tampilan — user perlu upload ulang
            const allPhotos = a?.photos && a.photos.length > 0
              ? a.photos
              : (a && a.status && a.status !== 'belum' ? [{ id: a.id, photoUrl: a.photoUrl, status: a.status, planDate: a.planDate, keterangan: a.keterangan, namaOutlet: a.namaOutlet, namaBumdes: a.namaBumdes, kodeSf: a.kodeSf }] : []);
            const photoList = allPhotos.filter(ph => ph.status !== 'belum');

            // Hitung status dari foto yang valid saja
            const effectiveStatus = photoList.length === 0
              ? 'belum'
              : photoList.some(ph => ph.status === 'upload')
                ? 'upload'
                : 'verified';
            const meta = actMeta(effectiveStatus);

            return (
              <div key={actType.key} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{actType.label}</div>
                  <div style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: meta.bg, color: meta.color }}>
                    {meta.label} {photoList.length > 0 && (actType.key === 'rekrutmen_sf' ? '' : `(${photoList.length} Foto)`)}
                  </div>
                </div>

                {photoList.length === 0 ? (
                  <div style={{ fontSize: '12.5px', color: '#64748B', fontStyle: 'italic' }}>
                    {actType.key === 'rekrutmen_sf' ? 'Belum ada data kegiatan' : 'Belum ada data / foto kegiatan'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {photoList.map((ph, idx) => {
                      const phMeta = actMeta(ph.status);
                      return (
                        <div key={ph.id || idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {actType.key !== 'rekrutmen_sf' && (
                            ph.photoUrl && ph.photoUrl !== 'uploading...' ? (
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto({ url: ph.photoUrl, title: `${actType.label} (${idx + 1}) - ${modalData.pName}` })}
                                aria-label={`Lihat foto bukti ${actType.label} #${idx + 1}`}
                                style={{ position: 'relative', width: '90px', height: '65px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', flexShrink: 0, padding: 0, background: 'none' }}
                                title="Klik untuk melihat foto lebih besar"
                              >
                                <img src={ph.photoUrl} alt={`Foto Bukti ${actType.label}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                <div style={{ position: 'absolute', bottom: 0, inset: 'auto 0 0 0', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '9px', fontWeight: 700, textAlign: 'center', padding: '2px 0' }}>
                                  Lihat
                                </div>
                              </button>
                            ) : (
                              <div style={{ width: '90px', height: '65px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>
                                Tanpa Foto
                              </div>
                            )
                          )}

                          <div style={{ flex: 1, minWidth: '160px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: phMeta.bg, color: phMeta.color }}>
                                {actType.key === 'rekrutmen_sf' ? phMeta.label : `Foto #${idx + 1}: ${phMeta.label}`}
                              </span>
                            </div>
                            {ph.namaOutlet && <div><b>Nama Outlet:</b> {ph.namaOutlet}</div>}
                            {(ph.namaBumdes || (actType.key === 'bumdes' && ph.keterangan)) && (
                              <div><b>Nama BUMDES:</b> {ph.namaBumdes || ph.keterangan}</div>
                            )}
                            {ph.planDate && <div><b>Tanggal:</b> {new Date(ph.planDate).toLocaleDateString('id-ID')}</div>}
                            {(ph.kodeSf || ph.keterangan) && <div><b>{actType.key === 'rekrutmen_sf' ? 'Kode SF' : 'Kode SF/Ket'}:</b> {ph.kodeSf || ph.keterangan}</div>}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                            {ph.status === 'upload' && (
                              <>
                                {rejectActivity && (
                                  <button
                                    type="button"
                                    onClick={() => triggerRejectConfirm(actType.key, ph.id, actType.label, idx)}
                                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Tolak
                                  </button>
                                )}
                                {verifyActivity && (
                                  <button
                                    type="button"
                                    disabled={verifyingId === ph.id}
                                    onClick={() => handleVerify(actType.key, ph.id)}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: verifyingId === ph.id ? '#15803d' : '#16a34a',
                                      color: '#fff',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: verifyingId === ph.id ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                                      opacity: verifyingId === ph.id ? 0.85 : 1,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {verifyingId === ph.id ? (
                                      <>
                                        <svg
                                          width="13"
                                          height="13"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{ animation: 'spin 0.75s linear infinite' }}
                                        >
                                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                        <span>Memverifikasi...</span>
                                      </>
                                    ) : (
                                      <span>Verifikasi</span>
                                    )}
                                  </button>
                                )}
                              </>
                            )}

                            {(deletePhoto || rejectActivity) && (
                              <button
                                type="button"
                                onClick={() => triggerDeleteConfirm(actType.key, ph.id, actType.label, idx)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #fca5a5',
                                  background: '#fff1f2',
                                  color: '#e11d48',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Hapus data / foto kegiatan ini"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.85)', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100000, 
            padding: '20px' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              position: 'relative', 
              maxWidth: '90vw', 
              maxHeight: '85vh', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              background: '#fff', 
              borderRadius: '16px', 
              padding: '18px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' 
            }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '16px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a' }}>{previewPhoto.title}</div>
              <button 
                type="button"
                onClick={() => setPreviewPhoto(null)} 
                aria-label="Tutup pratinjau foto"
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
            <img 
              src={previewPhoto.url} 
              alt={previewPhoto.title} 
              style={{ maxWidth: '100%', maxHeight: '68vh', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0' }} 
            />
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <a 
                href={previewPhoto.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ fontSize: '13px', color: '#2563EB', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>Buka Foto Ukuran Asli di Tab Baru</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reject Confirmation Modal */}
      <ConfirmRejectModal
        isOpen={!!rejectTarget}
        data={rejectTarget}
        onConfirm={handleExecuteReject}
        onCancel={() => setRejectTarget(null)}
        isRejecting={isRejecting}
      />

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        data={deleteTarget}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/ConfirmRejectModal.jsx` (227 baris)

```javascript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmRejectModal({ isOpen, data, onConfirm, onCancel, isRejecting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRejecting) {
        onCancel?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRejecting, onCancel]);

  if (!isOpen || !data) return null;

  const projectName = data.projectName || data.pName;
  const actLabel = data.actLabel;
  const photoIndex = data.photoIndex;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-reject-title"
      onClick={(e) => { e.stopPropagation(); if (!isRejecting) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100005,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          boxSizing: 'border-box',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Warning Badge Icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.12)'
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h3
          id="confirm-reject-title"
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#0F172A',
            margin: '0 0 10px 0',
            fontFamily: "var(--font-heading)"
          }}
        >
          Tolak Verifikasi Kegiatan?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
            fontWeight: 500
          }}
        >
          {data.actKey === 'rekrutmen_sf'
            ? 'Apakah Anda yakin ingin menolak verifikasi ini? Data Kode SF tersebut akan dihapus dan user perlu memasukkan data ulang.'
            : 'Apakah Anda yakin ingin menolak verifikasi ini? Foto tersebut akan dihapus dan user perlu melakukan upload ulang.'
          }
        </p>

        {/* Info card */}
        {(projectName || actLabel) && (
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '22px',
              border: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {projectName && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Proyek:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{projectName}</strong>
              </div>
            )}
            {actLabel && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Kegiatan:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{actLabel}</strong>
                {typeof photoIndex === 'number' && data.actKey !== 'rekrutmen_sf' && ` (Foto #${photoIndex + 1})`}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRejecting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isRejecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRejecting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #B91C1C',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isRejecting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              opacity: isRejecting ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            {isRejecting ? 'Menolak...' : 'Ya, Tolak'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/ConfirmDeleteModal.jsx` (228 baris)

```javascript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDeleteModal({ isOpen, data, onConfirm, onCancel, isDeleting }) {
  const modalRef = useRef(null);

  // Focus trap & Escape listener (R-32 & R-39)
  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusableElements = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel?.();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !data) return null;

  const projectName = data.projectName || data.pName;
  const actLabel = data.actLabel;
  const photoIndex = data.photoIndex;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={(e) => { e.stopPropagation(); if (!isDeleting) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100006,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          boxSizing: 'border-box',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Trash / Delete Icon Badge */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#FFE4E6',
            border: '1px solid #FDA4AF',
            color: '#E11D48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.12)'
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h3
          id="confirm-delete-title"
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#0F172A',
            margin: '0 0 10px 0',
            fontFamily: "var(--font-heading)"
          }}
        >
          Hapus Kegiatan Ini?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
            fontWeight: 500
          }}
        >
          {data.actKey === 'rekrutmen_sf'
            ? 'Apakah Anda yakin ingin menghapus data kegiatan ini? Data Kode SF ini akan terhapus permanen dari sistem.'
            : 'Apakah Anda yakin ingin menghapus data/foto kegiatan ini? Kegiatan yang terhapus akan terhapus permanen dari sistem.'
          }
        </p>

        {/* Info Card */}
        {(projectName || actLabel) && (
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '22px',
              border: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {projectName && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Proyek:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{projectName}</strong>
              </div>
            )}
            {actLabel && (
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Kegiatan:</span>{' '}
                <strong style={{ color: '#0F172A', fontWeight: 700 }}>{actLabel}</strong>
                {typeof photoIndex === 'number' && data.actKey !== 'rekrutmen_sf' && ` (Foto #${photoIndex + 1})`}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #BE123C',
              background: '#E11D48',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)',
              opacity: isDeleting ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/ProgramViewerModal.jsx` (1092 baris)

```javascript
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { API_BASE_URL, authFetch } from '../apiConfig';

export default function ProgramViewerModal({ program, monthLabel, onClose, isAdmin, onDeleteSuccess }) {
  // Normalize multi-image slides from program.images or fallback to single imageUrl
  const initialSlides = (Array.isArray(program?.images) && program.images.length > 0)
    ? program.images
    : (program?.imageUrl ? [{ id: 'legacy_0', imageUrl: program.imageUrl, detailUrl: program.detailUrl || '', scannedLink: program.scannedLink || null }] : []);

  const [slides, setSlides] = useState(initialSlides);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Sync if program prop updates
  useEffect(() => {
    const updated = (Array.isArray(program?.images) && program.images.length > 0)
      ? program.images
      : (program?.imageUrl ? [{ id: 'legacy_0', imageUrl: program.imageUrl, detailUrl: program.detailUrl || '', scannedLink: program.scannedLink || null }] : []);
    setSlides(updated);
    setCurrentSlideIndex(0);
  }, [program]);

  const currentSlide = slides[currentSlideIndex] || slides[0] || {};
  const activeImageUrl = currentSlide.imageUrl || program?.imageUrl || null;
  const activeDetailUrl = currentSlide.detailUrl !== undefined ? currentSlide.detailUrl : (program?.detailUrl || '');

  // Viewport Zoom and Pan States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Program / Slide Delete States
  const [deleteTargetType, setDeleteTargetType] = useState('PROGRAM'); // 'PROGRAM' or 'SLIDE'
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Option Dropdown State (Titik Tiga)
  const [isOptionOpen, setIsOptionOpen] = useState(false);
  const optionMenuRef = useRef(null);

  // Close option dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionMenuRef.current && !optionMenuRef.current.contains(e.target)) {
        setIsOptionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Slide navigation handlers
  const handleSlideChange = (newIdx) => {
    if (newIdx >= 0 && newIdx < slides.length) {
      setCurrentSlideIndex(newIdx);
      // Reset zoom & pan position on slide change
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    const newIdx = currentSlideIndex > 0 ? currentSlideIndex - 1 : slides.length - 1;
    handleSlideChange(newIdx);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    const newIdx = currentSlideIndex < slides.length - 1 ? currentSlideIndex + 1 : 0;
    handleSlideChange(newIdx);
  };

  // Keyboard navigation: Escape to close, ArrowLeft / ArrowRight to switch slides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showConfirmDelete) {
          setShowConfirmDelete(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (slides.length > 1) handlePrevSlide();
      } else if (e.key === 'ArrowRight') {
        if (slides.length > 1) handleNextSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, slides.length, currentSlideIndex, showConfirmDelete]);

  // Handle Delete (Entire Program or Current Slide)
  const handleExecuteDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const targetProgramName = program?.sheetName || program?.name || '';
      const payload = {
        monthLabel: monthLabel || 'Agustus 2026',
        programName: targetProgramName
      };

      if (deleteTargetType === 'SLIDE' && currentSlide?.id) {
        payload.imageId = currentSlide.id;
      }

      const res = await authFetch(`${API_BASE_URL}/api/admin/programs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        throw new Error(`Server error (${res.status}): ${textErr.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Gagal memproses penghapusan.');
      }

      if (deleteTargetType === 'SLIDE' && slides.length > 1) {
        const newSlides = slides.filter((_, idx) => idx !== currentSlideIndex);
        setSlides(newSlides);
        setCurrentSlideIndex(prev => (prev >= newSlides.length ? newSlides.length - 1 : prev));
        setShowConfirmDelete(false);
        setIsDeleting(false);
        if (onDeleteSuccess) onDeleteSuccess();
      } else {
        if (onDeleteSuccess) {
          onDeleteSuccess();
        } else if (onClose) {
          onClose();
        }
      }
    } catch (err) {
      console.error('Delete error in modal:', err);
      setDeleteError(err.message || 'Gagal menghapus data.');
      setIsDeleting(false);
    }
  };

  const containerRef = useRef(null);
  const tableRef = useRef(null);

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.1, 2.5));
    } else {
      setScale(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  // Drag / Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Export to PNG Image or direct image download
  const handleDownloadPNG = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (activeImageUrl) {
        const res = await fetch(activeImageUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const slideSuffix = slides.length > 1 ? `_slide_${currentSlideIndex + 1}` : '';
        const filename = `${(program.sheetName || 'Program').replace(/\s+/g, '_')}${slideSuffix}_${(monthLabel || '').replace(/\s+/g, '_')}.png`;
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else if (tableRef.current) {
        const currentScale = scale;
        const currentPos = { ...position };

        setScale(1);
        setPosition({ x: 0, y: 0 });

        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(tableRef.current, {
          backgroundColor: '#FFFFFF',
          scale: 2,
          useCORS: true,
          logging: false
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const filename = `${(program.sheetName || 'Program').replace(/\s+/g, '_')}_${(monthLabel || '').replace(/\s+/g, '_')}.png`;

        link.href = image;
        link.download = filename;
        link.click();

        setScale(currentScale);
        setPosition(currentPos);
      }
    } catch (err) {
      console.error('Failed to export program image:', err);
      alert('Gagal mendownload gambar program. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!program) return null;

  const headers = program.headers || [];
  const rows = program.rows || [];
  const summaryRow = program.summaryRow;

  // Format cell value smartly for Excel tables
  const formatCellValue = (headerName, val) => {
    if (val === null || val === undefined || val === '') return '-';

    const header = String(headerName || '').toUpperCase();
    const strVal = String(val).trim();

    if (strVal === 'PASS') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '50px', background: '#DCFCE7', color: '#166534', fontWeight: 800, fontSize: '11px' }}>
          PASS
        </span>
      );
    }
    if (strVal === 'NOT PASS') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '50px', background: '#FEE2E2', color: '#991B1B', fontWeight: 800, fontSize: '11px' }}>
          NOT PASS
        </span>
      );
    }

    if (
      header.includes('%') ||
      header.includes('ACH') ||
      header.includes('MOM') ||
      header.includes('OCC')
    ) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const pct = num <= 1 && num >= -1 ? Math.round(num * 1000) / 10 : Math.round(num * 10) / 10;
        const color = pct > 0 && (header.includes('MOM') || header.includes('ACH')) ? '#16A34A' : pct < 0 && header.includes('MOM') ? '#DC2626' : 'inherit';
        return <span style={{ color, fontWeight: 700 }}>{pct > 0 && header.includes('MOM') ? `+${pct}%` : `${pct}%`}</span>;
      }
    }

    if (header.includes('INSENTIF')) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        return `Rp ${num.toLocaleString('id-ID')}`;
      }
    }

    const num = parseFloat(val);
    if (!isNaN(num) && typeof val === 'number') {
      return Number.isInteger(num) ? num.toLocaleString('id-ID') : num.toFixed(2);
    }

    return strVal;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-in-out',
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* TOP FLOATING BAR: Left (Program Name & Slide Badge) & Right (Actions) */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '24px',
          right: '24px',
          zIndex: 100002,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none'
        }}
      >
        {/* Left: Program Info Badge */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '50px',
            padding: '8px 18px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FF5E00',
              boxShadow: '0 0 10px #FF5E00'
            }}
          />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '13.5px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.1px' }}>
            {program.sheetName || 'Program Tracking'}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>
            • {monthLabel || 'Agustus 2026'}
          </span>
          {slides.length > 1 && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                color: '#60A5FA',
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '2px 8px',
                borderRadius: '20px',
                border: '1px solid rgba(96, 165, 250, 0.3)'
              }}
            >
              Slide {currentSlideIndex + 1}/{slides.length}
            </span>
          )}
        </div>

        {/* Right: Three Dots Menu + Close Button */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* THREE-DOT OPTION BUTTON */}
          <div ref={optionMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOptionOpen(prev => !prev);
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)'}
              title="Opsi Program"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </button>

            {/* Option Dropdown Menu */}
            {isOptionOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '52px',
                  right: '0',
                  width: '240px',
                  background: 'rgba(15, 23, 42, 0.94)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.55)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeIn 0.15s ease-out',
                  fontFamily: 'var(--font-body)',
                  zIndex: 100010
                }}
              >
                {/* Opsi 1: Link Detail Program (Spesifik per Slide) */}
                {activeDetailUrl ? (
                  <a
                    href={activeDetailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOptionOpen(false)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#60A5FA',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>Link Detail Program</span>
                      {slides.length > 1 && (
                        <span style={{ fontSize: '10.5px', color: '#93C5FD', fontWeight: 600 }}>
                          (Slide {currentSlideIndex + 1})
                        </span>
                      )}
                    </div>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionOpen(false);
                      const slideInfo = slides.length > 1 ? `untuk slide ke-${currentSlideIndex + 1}` : '';
                      alert(`📌 Link detail resmi ${slideInfo} pada program "${program.sheetName || program.name || 'ini'}" belum dikonfigurasi.`);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#94A3B8',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>Link Detail Program</span>
                      {slides.length > 1 && (
                        <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                          (Slide {currentSlideIndex + 1} - Tidak Ada)
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* Opsi 2: Download Gambar */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOptionOpen(false);
                    handleDownloadPNG();
                  }}
                  disabled={isDownloading}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>
                    {isDownloading
                      ? 'Memproses...'
                      : slides.length > 1
                      ? `Download Gambar (Slide ${currentSlideIndex + 1})`
                      : 'Download Gambar'}
                  </span>
                </button>

                {/* Opsi Admin: Hapus Slide Ini (hanya jika multi-slide) */}
                {isAdmin && slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionOpen(false);
                      setDeleteTargetType('SLIDE');
                      setShowConfirmDelete(true);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#FB7185',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      width: '100%',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Hapus Slide Ini ({currentSlideIndex + 1})</span>
                  </button>
                )}

                {/* Opsi Admin: Hapus Seluruh Program */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionOpen(false);
                      setDeleteTargetType('PROGRAM');
                      setShowConfirmDelete(true);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#EF4444',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      width: '100%',
                      borderTop: slides.length <= 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Hapus Seluruh Program</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CLOSE BUTTON (✕) */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#800000';
              e.currentTarget.style.borderColor = '#800000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            title="Tutup (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* MULTI-SLIDE NAVIGATION CONTROLS (LEFT / RIGHT BUTTONS & BOTTOM DOTS) */}
      {slides.length > 1 && (
        <>
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevSlide();
            }}
            style={{
              position: 'fixed',
              left: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 100003,
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(128, 0, 0, 0.95)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            title="Slide Sebelumnya (Panah Kiri)"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNextSlide();
            }}
            style={{
              position: 'fixed',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 100003,
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(128, 0, 0, 0.95)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            title="Slide Berikutnya (Panah Kanan)"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Bottom Floating Pagination Dots Pill */}
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100003,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50px',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
              userSelect: 'none'
            }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#F8FAFC', letterSpacing: '0.3px' }}>
              Slide {currentSlideIndex + 1} dari {slides.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlideChange(idx);
                  }}
                  style={{
                    width: idx === currentSlideIndex ? '22px' : '8px',
                    height: '8px',
                    borderRadius: '50px',
                    background: idx === currentSlideIndex ? 'linear-gradient(135deg, #FF5E00, #800000)' : 'rgba(255, 255, 255, 0.35)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  title={`Lompat ke Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* FULLSCREEN CANVAS VIEWPORT FOR THE PROGRAM IMAGE */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          background: 'transparent',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        {activeImageUrl ? (
          <div
            ref={tableRef}
            key={`slide-view-${currentSlideIndex}`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0, 0, 0.2, 1)',
              willChange: 'transform',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '98vw',
              maxHeight: '96vh',
              animation: 'fadeIn 0.2s ease-in-out',
              fontFamily: 'var(--font-body)'
            }}
          >
            <img
              src={activeImageUrl}
              alt={`${program.sheetName || 'Gambar Program'} - Slide ${currentSlideIndex + 1}`}
              style={{
                maxWidth: '96vw',
                maxHeight: '94vh',
                objectFit: 'contain',
                borderRadius: '16px',
                userSelect: 'none',
                pointerEvents: 'none',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
        ) : (
          <div
            ref={tableRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0, 0, 0.2, 1)',
              willChange: 'transform',
              background: '#FFFFFF',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
              padding: '28px',
              border: '1px solid #E2E8F0',
              maxHeight: '85vh',
              maxWidth: '92vw',
              overflow: 'auto'
            }}
          >
            <div style={{ marginBottom: '16px', borderBottom: '2px solid #800000', paddingBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, color: '#800000', letterSpacing: '0.4px' }}>
                  TELKOMSEL GTM ACTIVITY MONITORING
                </h4>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {program.sheetName} · {monthLabel || 'Agustus 2026'}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: '#64748B', background: '#F8FAFC', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                Total {rows.length} Baris Data
              </div>
            </div>

            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '12px',
                color: '#334155',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{ background: '#800000', color: '#FFFFFF' }}>
                  {headers.map((h, colIdx) => (
                    <th
                      key={colIdx}
                      style={{
                        padding: '12px 14px',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        border: '1px solid #A80C25',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, rowIdx) => (
                  <tr
                    key={rowIdx}
                    style={{
                      background: rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {headers.map((h, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          padding: '10px 14px',
                          border: '1px solid #E2E8F0',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatCellValue(h, r[h])}
                      </td>
                    ))}
                  </tr>
                ))}

                {summaryRow && (
                  <tr style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}>
                    {headers.map((h, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          padding: '12px 14px',
                          border: '1px solid #1E293B',
                          whiteSpace: 'nowrap',
                          color: '#FFFFFF'
                        }}
                      >
                        {formatCellValue(h, summaryRow[h])}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Program / Slide */}
      {showConfirmDelete && (
        <div
          onClick={() => !isDeleting && setShowConfirmDelete(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100005,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              background: '#FFFFFF',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '28px 24px',
              textAlign: 'center',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
                border: '1px solid #FDA4AF',
                color: '#E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 6px 16px rgba(225, 29, 72, 0.15)'
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>
              {deleteTargetType === 'SLIDE' ? 'Konfirmasi Hapus Slide' : 'Konfirmasi Hapus Program'}
            </h3>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 18px 0', fontWeight: 500 }}>
              {deleteTargetType === 'SLIDE' ? (
                <>
                  Apakah Anda yakin ingin menghapus <strong>Slide {currentSlideIndex + 1}</strong> dari program <strong>"{program.sheetName}"</strong>?
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin menghapus seluruh program <strong>"{program.sheetName}"</strong> pada periode <strong>{monthLabel || 'Agustus 2026'}</strong>?
                </>
              )}
            </p>

            {deleteError && (
              <div style={{ fontFamily: 'var(--font-body)', padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
                }}
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


```

---

## File: `gtm-monitor-frontend/src/components/CekPairingPopover.jsx` (665 baris)

```javascript
import { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { usePairingSearch } from '../hooks/usePairingSearch';

const CekPairingPopover = memo(function CekPairingPopover({ isOpen, coords, onClose }) {
  const [query, setQuery] = useState('');
  const pairingSearch = usePairingSearch();
  const loading = pairingSearch.isPending;
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!isOpen && !isModalOpen && !showGuide) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showGuide) {
          setShowGuide(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        } else if (isOpen) {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isModalOpen, showGuide, onClose]);

  // Klik di luar untuk menutup hint panduan penggunaan
  useEffect(() => {
    if (!showGuide) return;
    const handleClickOutsideGuide = (e) => {
      if (!e.target.closest('[data-pairing-hint]')) {
        setShowGuide(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideGuide);
    return () => document.removeEventListener('mousedown', handleClickOutsideGuide);
  }, [showGuide]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQ = query.trim();

    if (!cleanQ || cleanQ.length < 6) {
      setError('Kata kunci terlalu umum. Masukkan minimal 6 karakter yang akurat.');
      setResults([]);
      setIsModalOpen(false);
      return;
    }

    setError(null);

    try {
      const data = await pairingSearch.mutateAsync(cleanQ);

      if (!data.results || data.results.length === 0) {
        setError(`Data pairing tidak ditemukan untuk kata kunci "${cleanQ}". Pastikan penulisan ID atau nomor telepon sudah sesuai.`);
        setResults([]);
        setIsModalOpen(false);
      } else {
        const grouped = groupPairingRecordsByParent(data.results);
        setResults(grouped);
        setSelectedIdx(0);
        setIsModalOpen(true);
        onClose(); // Tutup dropdown popover saat modal hasil dibuka
      }
    } catch (err) {
      setError(err.message || 'Gagal melakukan pencarian.');
      setResults([]);
      setIsModalOpen(false);
    }
  };

  const formatSourcePerdana = (msisdn, sourceStr) => {
    if (!msisdn) return '-';
    const cleanMsisdn = String(msisdn).trim();
    if (!cleanMsisdn) return '-';

    if (!sourceStr || typeof sourceStr !== 'string') return cleanMsisdn;
    const cleanSource = sourceStr.trim();

    if (!cleanSource || /^(0|\\N|N\/A|-)$/i.test(cleanSource)) {
      return cleanMsisdn;
    }

    return `${cleanMsisdn} (${cleanSource})`;
  };

  const groupPairingRecordsByParent = (rawRecords) => {
    if (!rawRecords || rawRecords.length === 0) return [];

    const groupedMap = new Map();

    rawRecords.forEach(rec => {
      const key = (rec.bb_id || rec.msisdn_parent || rec.order_id || JSON.stringify(rec)).trim().toLowerCase();

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          bb_id: rec.bb_id,
          msisdn_parent: rec.msisdn_parent,
          source_perdana_parent: rec.source_perdana_parent,
          product_commercial_name: rec.product_commercial_name,
          activation_date_ih: rec.activation_date_ih,
          activation_date_parent: rec.activation_date_parent,
          city: rec.city,
          region: rec.region,
          area: rec.area,
          cluster: rec.cluster,
          sto: rec.sto,
          tsel_id_ih: rec.tsel_id_ih,
          tsel_id_mobile_parent: rec.tsel_id_mobile_parent,
          order_id: rec.order_id,
          children: []
        });
      }

      const group = groupedMap.get(key);

      for (let i = 1; i <= 6; i++) {
        const childNum = rec[`msisdn_child${i}`];
        const childDate = rec[`activation_date_child${i}`];
        const childTselId = rec[`tsel_id_mobile_child${i}`];
        const childSource = rec[`source_perdana_child${i}`];

        if (childNum) {
          const exists = group.children.some(c => c.msisdn === childNum);
          if (!exists) {
            group.children.push({
              msisdn: childNum,
              date: childDate || '',
              tselId: childTselId || '',
              sourcePerdana: childSource || ''
            });
          }
        }
      }
    });

    return Array.from(groupedMap.values());
  };

  const activeRecord = results[selectedIdx] || null;

  const buildTransposedFields = (rec) => {
    if (!rec) return [];

    const fields = [
      { label: 'bb_id', val: rec.bb_id },
      { label: 'msisdn_parent', val: formatSourcePerdana(rec.msisdn_parent, rec.source_perdana_parent) },
    ];

    if (rec.children && rec.children.length > 0) {
      rec.children.forEach((c, idx) => {
        fields.push({
          label: `msisdn_child${idx + 1}`,
          val: formatSourcePerdana(c.msisdn, c.sourcePerdana)
        });
      });
    } else {
      fields.push({ label: 'msisdn_child1', val: '-' });
    }

    fields.push({ label: 'activation_date_ih', val: rec.activation_date_ih });
    fields.push({ label: 'activation_date_parent', val: rec.activation_date_parent });

    if (rec.children && rec.children.length > 0) {
      rec.children.forEach((c, idx) => {
        fields.push({ label: `activation_date_child${idx + 1}`, val: c.date });
      });
    } else {
      fields.push({ label: 'activation_date_child1', val: '-' });
    }

    fields.push({ label: 'city', val: rec.city });
    fields.push({ label: 'sto', val: rec.sto });
    fields.push({ label: 'order_id', val: rec.order_id });

    return fields;
  };

  const transposedFields = buildTransposedFields(activeRecord);

  return (
    <>
      {/* ─── DROPDOWN SEARCH POPOVER (Mounted to document.body via createPortal) ─── */}
      {isOpen && coords && coords.top > 0 && createPortal(
        <div
          className="pairing-fixed-dropdown fade-in"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translateX(-50%)',
            width: '390px',
            maxWidth: 'calc(100vw - 24px)',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 8px 16px -4px rgba(15, 23, 42, 0.08)',
            padding: '20px 22px',
            zIndex: 999999,
            animation: 'programDropdownFadeIn 0.15s ease-out',
            fontFamily: 'var(--font-body)',
            color: '#334155'
          }}
        >
          {/* Header Popover */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>
                  Pencarian Data Pairing
                </h3>

                {/* Tanda Hint 'i' Panduan Penggunaan yang Disembunyikan */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} data-pairing-hint>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGuide((prev) => !prev);
                    }}
                    aria-label="Lihat panduan penggunaan pencarian pairing"
                    title="Panduan penggunaan pencarian"
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: showGuide ? '#EFF6FF' : '#FFFFFF',
                      color: showGuide ? '#1D4ED8' : '#64748B',
                      border: showGuide ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </button>

                  {/* Popover Panduan Penggunaan */}
                  {showGuide && (
                    <div
                      role="tooltip"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        zIndex: 60,
                        width: '320px',
                        maxWidth: 'calc(100vw - 36px)',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
                        padding: '14px 16px',
                        boxSizing: 'border-box',
                        fontFamily: 'var(--font-body)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '12.5px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                          Panduan Penggunaan
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowGuide(false);
                          }}
                          aria-label="Tutup panduan"
                          style={{
                            border: 'none',
                            background: '#F1F5F9',
                            color: '#64748B',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#E2E8F0';
                            e.currentTarget.style.color = '#0F172A';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F1F5F9';
                            e.currentTarget.style.color = '#64748B';
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#475569', lineHeight: 1.5 }}>
                        <li>Masukkan <strong style={{ color: '#0F172A' }}>bb_id</strong>, nomor HP (<strong style={{ color: '#0F172A' }}>08...</strong> / <strong style={{ color: '#0F172A' }}>62...</strong>), atau <strong style={{ color: '#0F172A' }}>order_id</strong> lengkap.</li>
                        <li>Penulisan harus akurat sesuai data (minimal 6 karakter).</li>
                        <li>Tekan <strong style={{ color: '#0F172A' }}>Enter</strong> atau klik tombol <strong style={{ color: '#800000' }}>Cari Data Pairing</strong>.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                Cek relasi pelanggan Telkomsel One
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu pencarian pairing"
              style={{
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E2E8F0';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                aria-label="Kata kunci pencarian pairing"
                placeholder="Cari bb_id, msisdn, atau order_id..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError(null);
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, background 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#800000';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
              />
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '12px', fontWeight: 500, lineHeight: 1.45 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: 'none',
                background: loading || !query.trim() ? '#E2E8F0' : '#800000',
                color: loading || !query.trim() ? '#94A3B8' : '#FFFFFF',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading || !query.trim() ? 'none' : '0 1px 2px rgba(128, 0, 0, 0.2)',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!loading && query.trim()) {
                  e.currentTarget.style.background = '#990000';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && query.trim()) {
                  e.currentTarget.style.background = '#800000';
                }
              }}
            >
              {loading ? 'Mencari Data Pairing...' : 'Cari Data Pairing'}
            </button>
          </form>
        </div>,
        document.body
      )}

      {/* ─── TRANSPOSED TELKOMSEL RESULT POP-UP MODAL (Mounted to document.body via createPortal) ─── */}
      {isModalOpen && activeRecord && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pairing-modal-title"
          className="pairing-transposed-modal"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
        >
          <div
            className="pairing-transposed-modal-card fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              margin: 'auto',
              fontFamily: 'var(--font-body)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
              <div>
                <h3 id="pairing-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>
                  Hasil Deteksi Pairing
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Detail data relasi pelanggan Telkomsel One
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup dialog hasil pairing"
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  color: '#64748B',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E2E8F0';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                ✕
              </button>
            </div>

            {/* Multiple Results Selector (if results count > 1) */}
            {results.length > 1 && (
              <div style={{ padding: '10px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>
                  Ditemukan {results.length} data cocok ({selectedIdx + 1} dari {results.length}):
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={selectedIdx === 0}
                    onClick={() => setSelectedIdx(prev => prev - 1)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: selectedIdx === 0 ? 'not-allowed' : 'pointer',
                      opacity: selectedIdx === 0 ? 0.5 : 1
                    }}
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={selectedIdx === results.length - 1}
                    onClick={() => setSelectedIdx(prev => prev + 1)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: selectedIdx === results.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: selectedIdx === results.length - 1 ? 0.5 : 1
                    }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Transposed Table Telkomsel Style */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', fontSize: '12.5px' }}>
                <tbody>
                  {transposedFields.map((f, i) => (
                    <tr key={i}>
                      {/* Left Header Column - Maroon Telkomsel */}
                      <td
                        style={{
                          width: '40%',
                          padding: '10px 14px',
                          background: '#800000',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '12px',
                          fontFamily: 'var(--font-body)',
                          letterSpacing: '-0.1px',
                          borderTopLeftRadius: '8px',
                          borderBottomLeftRadius: '8px',
                          verticalAlign: 'middle'
                        }}
                      >
                        {f.label}
                      </td>

                      {/* Right Value Column - Clean Crisp Card */}
                      <td
                        style={{
                          padding: '10px 14px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderLeft: 'none',
                          borderTopRightRadius: '8px',
                          borderBottomRightRadius: '8px',
                          color: '#0F172A',
                          fontWeight: 500,
                          wordBreak: 'break-all',
                          verticalAlign: 'middle',
                          fontFamily: 'var(--font-body)'
                        }}
                      >
                        {f.val || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '8px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#800000',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(128, 0, 0, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#990000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#800000';
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

export default CekPairingPopover;

```

---

## File: `gtm-monitor-frontend/src/components/admin/OdpImportModal.jsx` (296 baris)

```javascript
import { useEffect } from 'react';

// Modal: Upload File Excel Data ODP
export default function OdpImportModal({
  isOpen,
  onClose,
  file,
  setFile,
  loading,
  importProgress,
  message,
  setMessage,
  error,
  setError,
  handleFileChange,
  handleUpload,
  setActiveInfoModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="odp-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 id="odp-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload File Excel Data ODP
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Target: Data ODP &amp; Kapasitas Port Mingguan
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('odp')}
                title="Panduan Format Excel ODP"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                i
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog upload ODP"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: file ? '#ECFDF5' : '#F8FAFC',
              border: file ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-odp-file-input"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Pilih File ODP</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: file ? '#065F46' : '#94A3B8',
                fontWeight: file ? 600 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
            </span>

            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (setMessage) setMessage(null);
                  if (setError) setError(null);
                }}
                title="Hapus file"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#800000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

            <input
              id="modal-odp-file-input"
              type="file"
              onClick={(e) => { e.currentTarget.value = ''; }}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading || !file}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: loading || !file ? '#E2E8F0' : '#800000',
                color: loading || !file ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? `Sedang Membaca & Memperbarui...${importProgress ? ` (${importProgress})` : ''}` : 'Mulai Update ODP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


```

---

## File: `gtm-monitor-frontend/src/components/admin/PairingImportModal.jsx` (298 baris)

```javascript
import { useEffect } from 'react';

// Modal: Upload File Excel Data Tsel One Pairing
export default function PairingImportModal({
  isOpen,
  onClose,
  pairingFile,
  setPairingFile,
  pairingLoading,
  pairingProgress,
  pairingMessage,
  setPairingMessage,
  pairingError,
  setPairingError,
  handlePairingUpload,
  setActiveInfoModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pairing-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <h3 id="pairing-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload File Excel Data Pairing
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Target: Data Tsel One Pairing Pelanggan
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('pairing')}
                title="Panduan Format Excel Pairing"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                i
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog upload pairing"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePairingUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: pairingFile ? '#ECFDF5' : '#F8FAFC',
              border: pairingFile ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-pairing-file-input"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Pilih File Pairing</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: pairingFile ? '#065F46' : '#94A3B8',
                fontWeight: pairingFile ? 600 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {pairingFile ? `${pairingFile.name} (${(pairingFile.size / 1024).toFixed(1)} KB)` : 'Format: .xlsx, .xls, .csv'}
            </span>

            {pairingFile && (
              <button
                type="button"
                onClick={() => {
                  setPairingFile(null);
                  if (setPairingMessage) setPairingMessage(null);
                  if (setPairingError) setPairingError(null);
                }}
                title="Hapus file"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#800000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

            <input
              id="modal-pairing-file-input"
              type="file"
              onClick={(e) => { e.currentTarget.value = ''; }}
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPairingFile(e.target.files[0]);
                  if (setPairingMessage) setPairingMessage(null);
                  if (setPairingError) setPairingError(null);
                }
              }}
              style={{ display: 'none' }}
            />
          </div>

          {pairingMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {pairingMessage}
            </div>
          )}

          {pairingError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {pairingError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={pairingLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={pairingLoading || !pairingFile}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: pairingLoading || !pairingFile ? '#E2E8F0' : '#800000',
                color: pairingLoading || !pairingFile ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: pairingLoading || !pairingFile ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {pairingLoading ? `Sedang Memproses...${pairingProgress ? ` (${pairingProgress})` : ''}` : 'Mulai Update Pairing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


```

---

## File: `gtm-monitor-frontend/src/components/admin/ExportRekapModal.jsx` (65 baris)

```javascript
import { useEffect } from 'react';

// Modal Konfirmasi Export Rekap Excel
export default function ExportRekapModal({ setIsExportModalOpen, handleExportRekapExcel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsExportModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsExportModalOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-rekap-title"
      onClick={() => setIsExportModalOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div>
            <h3 id="export-rekap-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Konfirmasi Export Rekap</h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Format File Excel (.xlsx)</span>
          </div>
        </div>

        <p style={{ fontSize: '13.5px', color: '#334155', margin: '0 0 20px 0', lineHeight: '1.5' }}>
          Apakah Anda yakin ingin mengunduh rekapitulasi data LOP & status kegiatan dari seluruh branch ke dalam file Excel?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => setIsExportModalOpen(false)}
            style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            Batal
          </button>
          <button
            onClick={() => {
              setIsExportModalOpen(false);
              handleExportRekapExcel();
            }}
            style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)' }}
          >
            Unduh Excel
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/admin/ProgramUploadModal.jsx` (445 baris)

```javascript
import { useEffect } from 'react';

// Modal: Upload Gambar Tracking Program Bulanan
export default function ProgramUploadModal({
  isOpen,
  onClose,
  programFile,
  setProgramFile,
  programMonthLabel,
  setProgramMonthLabel,
  programName,
  setProgramName,
  programDetailUrl,
  setProgramDetailUrl,
  programLoading,
  programMessage,
  setProgramMessage,
  programError,
  setProgramError,
  programResultUpload,
  uploadAvailablePrograms = [],
  handleProgramUpload,
  setActiveInfoModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <h3 id="program-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Upload Gambar Tracking Program
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Unggah flyer program bulanan &amp; pindai teks link detail (OCR)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setActiveInfoModal && (
              <button
                type="button"
                onClick={() => setActiveInfoModal('program')}
                title="Panduan Upload Gambar Program"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                i
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog upload program"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                color: '#64748B',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleProgramUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pilih Periode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>Pilih Periode Bulan:</label>
            <select
              value={programMonthLabel}
              onChange={(e) => setProgramMonthLabel(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Maret 2026">Maret 2026</option>
              <option value="April 2026">April 2026</option>
              <option value="Mei 2026">Mei 2026</option>
              <option value="Juni 2026">Juni 2026</option>
              <option value="Juli 2026">Juli 2026</option>
              <option value="Agustus 2026">Agustus 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="Oktober 2026">Oktober 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="Desember 2026">Desember 2026</option>
            </select>
          </div>

          {/* Nama Program */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>Nama Program:</label>
            <input
              type="text"
              placeholder="Ketikkan atau pilih nama program..."
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              list="modal-existing-programs-list"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <datalist id="modal-existing-programs-list">
              {uploadAvailablePrograms.map((p, idx) => (
                <option key={idx} value={p.sheetName || p.name} />
              ))}
            </datalist>

            {/* Live Indicator */}
            {(() => {
              const trimmedInput = programName.trim().replace(/\s+/g, ' ').toLowerCase();
              if (!trimmedInput) return null;
              const match = uploadAvailablePrograms.find((p) => {
                const pName = (p.sheetName || p.name || p.programName || '').trim().replace(/\s+/g, ' ').toLowerCase();
                return pName === trimmedInput;
              });
              if (!match) return null;
              const count = Array.isArray(match.images) && match.images.length > 0 ? match.images.length : match.imageUrl ? 1 : 0;
              return (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    fontSize: '11.5px',
                    color: '#1D4ED8',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>ℹ️</span>
                  <span>
                    Program <strong>"{match.sheetName || match.name}"</strong> sudah ada ({count} slide). File ini akan ditambahkan sebagai <strong>Slide ke-{count + 1}</strong>.
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Link Manual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>
              Link Manual <span style={{ fontWeight: 400 }}>(Opsional)</span>:
            </label>
            <input
              type="url"
              placeholder="http://... (Kosongkan bila ingin dipindai via OCR)"
              value={programDetailUrl}
              onChange={(e) => setProgramDetailUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* File Picker Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: programFile ? '#ECFDF5' : '#F8FAFC',
              border: programFile ? '1px solid #10B981' : '1px solid #CBD5E1',
              borderRadius: '10px',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          >
            <label
              htmlFor="modal-program-image-input"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Pilih Gambar</span>
            </label>

            <span
              style={{
                fontSize: '12.5px',
                color: programFile ? '#065F46' : '#94A3B8',
                fontWeight: programFile ? 600 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {programFile ? `${programFile.name} (${(programFile.size / 1024).toFixed(1)} KB)` : 'Format: .jpg, .png'}
            </span>

            {programFile && (
              <button
                type="button"
                onClick={() => {
                  setProgramFile(null);
                  if (setProgramMessage) setProgramMessage(null);
                  if (setProgramError) setProgramError(null);
                }}
                title="Hapus gambar"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#800000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

            <input
              id="modal-program-image-input"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onClick={(e) => { e.currentTarget.value = ''; }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setProgramFile(e.target.files[0]);
                  if (setProgramError) setProgramError(null);
                }
              }}
              style={{ display: 'none' }}
            />
          </div>

          {programMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {programMessage}
            </div>
          )}

          {programError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {programError}
            </div>
          )}

          {programResultUpload && (
            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Hasil Upload &amp; OCR Link Scan:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Status:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>Tersimpan di Cloudinary</span></div>
                {programResultUpload.totalSlides > 1 && (
                  <div>
                    <strong>Status Slide:</strong>{' '}
                    <span style={{ color: '#2563EB', fontWeight: 600 }}>
                      Slide ke-{programResultUpload.totalSlides} (Total: {programResultUpload.totalSlides} slide gambar)
                    </span>
                  </div>
                )}
                <div><strong>Hasil Scan OCR:</strong> <span style={{ color: programResultUpload.scannedLink ? '#2563EB' : '#64748B', fontWeight: 600 }}>{programResultUpload.scannedLink || 'Tidak terdeteksi'}</span></div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={programLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={programLoading || !programFile}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: programLoading || !programFile ? '#E2E8F0' : '#800000',
                color: programLoading || !programFile ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: programLoading || !programFile ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {programLoading ? 'Sedang Mengunggah & Memindai...' : 'Mulai Upload Gambar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


```

---

## File: `gtm-monitor-frontend/src/components/admin/ProgramDeleteModal.jsx` (276 baris)

```javascript
import { useEffect } from 'react';

// Modal: Kelola & Hapus Program Terdaftar
export default function ProgramDeleteModal({
  isOpen,
  onClose,
  deleteProgramMonth,
  setDeleteProgramMonth,
  deleteProgramTarget,
  setDeleteProgramTarget,
  deleteAvailablePrograms = [],
  deleteLoading,
  deleteMessage,
  setDeleteMessage,
  deleteError,
  setDeleteError,
  setShowDeleteConfirmModal
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <h3 id="delete-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Kelola &amp; Hapus Program Terdaftar
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Hapus program terdaftar spesifik per bulan atau periode
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog hapus program"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Status Periode Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status Periode:</span>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              background: deleteAvailablePrograms.length > 0 ? '#ECFDF5' : '#F1F5F9',
              border: deleteAvailablePrograms.length > 0 ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
              color: deleteAvailablePrograms.length > 0 ? '#047857' : '#64748B',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {deleteAvailablePrograms.length > 0 ? `${deleteAvailablePrograms.length} Program Ditemukan` : 'Tidak Ada Program Terdaftar'}
          </div>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Pilih Periode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>1. Pilih Periode Bulan:</label>
            <select
              value={deleteProgramMonth}
              onChange={(e) => {
                setDeleteProgramMonth(e.target.value);
                setDeleteProgramTarget('ALL');
                if (setDeleteMessage) setDeleteMessage(null);
                if (setDeleteError) setDeleteError(null);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Maret 2026">Maret 2026</option>
              <option value="April 2026">April 2026</option>
              <option value="Mei 2026">Mei 2026</option>
              <option value="Juni 2026">Juni 2026</option>
              <option value="Juli 2026">Juli 2026</option>
              <option value="Agustus 2026">Agustus 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="Oktober 2026">Oktober 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="Desember 2026">Desember 2026</option>
            </select>
          </div>

          {/* Pilih Opsi Program */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>2. Pilih Opsi Program yang Ingin Dihapus:</label>
            <select
              value={deleteProgramTarget}
              onChange={(e) => {
                setDeleteProgramTarget(e.target.value);
                if (setDeleteMessage) setDeleteMessage(null);
                if (setDeleteError) setDeleteError(null);
              }}
              disabled={deleteAvailablePrograms.length === 0}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: deleteAvailablePrograms.length === 0 ? '#F1F5F9' : '#FFFFFF',
                color: deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="ALL">Seluruh Program di Periode Ini ({deleteAvailablePrograms.length} Program)</option>
              {deleteAvailablePrograms.map((p, idx) => (
                <option key={idx} value={p.sheetName || p.name}>
                  Hanya: {p.sheetName || p.name}
                </option>
              ))}
            </select>
          </div>

          {deleteMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', fontWeight: 600 }}>
              {deleteMessage}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', fontWeight: 600 }}>
              {deleteError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={deleteLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirmModal(true);
              }}
              disabled={deleteLoading || deleteAvailablePrograms.length === 0}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: deleteLoading || deleteAvailablePrograms.length === 0 ? '#E2E8F0' : '#DC2626',
                color: deleteLoading || deleteAvailablePrograms.length === 0 ? '#94A3B8' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: deleteLoading || deleteAvailablePrograms.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>{deleteLoading ? 'Memproses Hapus...' : 'Hapus Program'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


```

---

## File: `gtm-monitor-frontend/src/components/admin/DeleteProgramConfirmModal.jsx` (135 baris)

```javascript
import { useEffect } from 'react';

// Modal Konfirmasi Hapus Program
export default function DeleteProgramConfirmModal({ deleteProgramMonth, deleteProgramTarget, deleteLoading, setShowDeleteConfirmModal, handleExecuteDeleteProgram }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !deleteLoading) {
        setShowDeleteConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteLoading, setShowDeleteConfirmModal]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-prog-title"
      onClick={() => { if (!deleteLoading) setShowDeleteConfirmModal(false); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100006,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '30px 26px 26px 26px',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
            border: '1px solid #FDA4AF',
            color: '#E11D48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 6px 16px rgba(225, 29, 72, 0.15)'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 id="delete-prog-title" style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 10px 0', fontFamily: "var(--font-heading)" }}>
          Konfirmasi Hapus Program
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px 0', fontWeight: 500 }}>
          Apakah Anda yakin ingin menghapus data program terdaftar ini? Program akan terhapus dari menu navigasi program.
        </p>

        <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px 16px', marginBottom: '22px', border: '1px solid #E2E8F0', textAlign: 'left', fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Periode Bulan:</span>{' '}
            <strong style={{ color: '#0F172A', fontWeight: 700 }}>{deleteProgramMonth}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Target Hapus:</span>{' '}
            <strong style={{ color: '#DC2626', fontWeight: 700 }}>
              {deleteProgramTarget === 'ALL' ? `Semua Program di ${deleteProgramMonth}` : deleteProgramTarget}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(false)}
            disabled={deleteLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: deleteLoading ? 'not-allowed' : 'pointer'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteDeleteProgram}
            disabled={deleteLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: deleteLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
            }}
          >
            {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/admin/UploadGuideModal.jsx` (240 baris)

```javascript
import { useEffect } from 'react';

// Modal Panduan & Aturan Upload File / Kelola Data
export default function UploadGuideModal({ activeInfoModal, setActiveInfoModal }) {
  useEffect(() => {
    if (!activeInfoModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveInfoModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInfoModal, setActiveInfoModal]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onClick={() => setActiveInfoModal(null)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="fade-in" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Dialog */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: activeInfoModal === 'delete' ? '#FEF2F2' : '#EFF6FF',
                color: activeInfoModal === 'delete' ? '#DC2626' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0
              }}
            >
              i
            </div>
            <div>
              <h3 id="guide-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                Panduan &amp; Ketentuan
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                {activeInfoModal === 'program'
                  ? 'Tracking Program Bulanan (Flyer & OCR)'
                  : activeInfoModal === 'pairing'
                  ? 'Excel Data Tsel One Pairing'
                  : activeInfoModal === 'delete'
                  ? 'Kelola & Hapus Program Terdaftar'
                  : 'Excel Data ODP & Kapasitas Port'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveInfoModal(null)}
            aria-label="Tutup panduan upload"
            style={{
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
          {activeInfoModal === 'program' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Upload Program:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas yang diterima: <code>.jpg</code>, <code>.jpeg</code>, <code>.png</code>, atau <code>.webp</code> (maksimal 10MB).</li>
                  <li>Flyer promosi diunggah ke Cloudinary dan dipindai secara otomatis (*OCR*) untuk mendeteksi link detail promo (seperti <code>bit.ly/...</code> atau <code>s.id/...</code>).</li>
                  <li>Tentukan <b>Periode Bulan</b> dan <b>Nama Program</b> pada formulir.</li>
                  <li>Jika tautan detail tidak terdeteksi otomatis oleh OCR, gunakan input <b>Link Manual</b> opsional.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> mengunggah berkas non-gambar (seperti berkas <code>.pdf</code>, <code>.docx</code>, atau <code>.xlsx</code>).</li>
                  <li><b>Dilarang</b> mengunggah gambar yang terlalu buram atau beresolusi sangat rendah sehingga teks tidak dapat dibaca OCR.</li>
                  <li><b>Dilarang</b> mengosongkan nama program saat mengunggah flyer materi.</li>
                </ul>
              </div>
            </>
          ) : activeInfoModal === 'pairing' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Data Pairing:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> (maksimal 25MB).</li>
                  <li>Nama Sheet baku: <code>Unstacked_Pairing_Data</code> (atau sheet pertama berkas).</li>
                  <li>Baris Header tabel wajib memuat kolom utama: <code>bb_id</code>, <code>msisdn_parent</code>, <code>msisdn_child1</code>..<code>6</code>, <code>activation_date_*</code>, <code>city</code>, <code>sto</code>, dan <code>order_id</code>.</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> menghapus atau merusak struktur nama kolom baku (<code>bb_id</code>, <code>msisdn_parent</code>, <code>order_id</code>).</li>
                  <li><b>Dilarang</b> menggabungkan sel (*merged cells*) pada area baris data pairing.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan *password protection*.</li>
                </ul>
              </div>
            </>
          ) : activeInfoModal === 'delete' ? (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Ketentuan Penghapusan Program:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Pilih <b>Periode Bulan</b> untuk melihat daftar materi program yang tersimpan di sistem.</li>
                  <li>Pilih opsi: <b>Hapus Seluruh Program</b> pada periode tersebut, atau <b>Hapus 1 Program Spesifik</b>.</li>
                  <li>Sistem akan menampilkan pop-up konfirmasi sebelum proses penghapusan diproses.</li>
                </ul>
              </div>

              {/* Section 2: Warning */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Peringatan Penting:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Tindakan penghapusan bersifat <b>permanen</b> dan tidak dapat diurungkan (*irreversible*).</li>
                  <li>File gambar pada CDN Cloudinary dan data program pada database akan dihapus dari server.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Section 1: Must Have */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginBottom: '8px' }}>
                  Persyaratan Wajib Data ODP:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>Format berkas wajib berupa <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> (maksimal 25MB).</li>
                  <li>Baris Header tabel wajib memuat nama kolom baku: <code>Branch</code>, <code>Project</code>, <code>WOK</code>, <code>ODP</code>, <code>Avai</code>, <code>Used</code>, dan <code>Total</code>.</li>
                  <li>Nilai pada kolom <code>Avai</code>, <code>Used</code>, dan <code>Total</code> port wajib berupa bilangan bulat valid (≥ 0).</li>
                </ul>
              </div>

              {/* Section 2: Restrictions / Don'ts */}
              <div style={{ background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', marginBottom: '8px' }}>
                  Hal yang Dilarang / Pantangan:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#7F1D1D', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li><b>Dilarang</b> mengosongkan atau mengganti nama kolom <code>Branch</code>, <code>Project</code>, <code>WOK</code>, atau <code>ODP</code>.</li>
                  <li><b>Dilarang</b> mengisi nilai negatif atau karakter huruf pada kolom kapasitas port.</li>
                  <li><b>Dilarang</b> menggunakan *merged cells* (sel gabungan) pada area tabel data ODP.</li>
                  <li><b>Dilarang</b> mengunci file Excel dengan *password protection*.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
          <button
            type="button"
            onClick={() => setActiveInfoModal(null)}
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              border: 'none',
              background: '#800000',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(128, 0, 0, 0.2)'
            }}
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/layout/LogoutConfirmModal.jsx` (111 baris)

```javascript
import { useEffect } from 'react';

// Custom Logout Confirmation Modal
export default function LogoutConfirmModal({ setShowLogoutConfirmModal, executeLogout }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowLogoutConfirmModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowLogoutConfirmModal]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi Keluar Akun"
      onClick={() => setShowLogoutConfirmModal(false)}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(15, 23, 42, 0.45)', 
        backdropFilter: 'blur(4px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 300, 
        padding: '20px', 
        animation: 'fadeIn 0.2s ease-in-out' 
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: '#FFFFFF', 
          borderRadius: '16px', 
          width: '100%', 
          maxWidth: '350px', 
          padding: '24px 22px 20px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)', 
          border: '1px solid #E2E8F0', 
          textAlign: 'center', 
          animation: 'flyoutSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'var(--font-body)'
        }}
      >
        <p 
          style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '14.5px', 
            fontWeight: 600, 
            color: '#0F172A', 
            margin: '0 0 22px', 
            lineHeight: 1.55,
            letterSpacing: '-0.1px'
          }}
        >
          Apakah Anda yakin ingin keluar dari Portal GTM Activity Monitor?
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#475569',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={executeLogout}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #DC2626',
              background: '#DC2626',
              color: '#FFFFFF',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.borderColor = '#B91C1C'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.borderColor = '#DC2626'; }}
          >
            Ya, Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

## File: `gtm-monitor-frontend/src/components/layout/SessionExpiredModal.jsx` (70 baris)

```javascript
import { useEffect } from 'react';

// ─── SESSION EXPIRED (15 MIN INACTIVITY / SESI TIDAK SAH) POPUP MODAL ───
export default function SessionExpiredModal({ sessionExpiredNotice, setSessionExpiredNotice }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSessionExpiredNotice(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSessionExpiredNotice]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: '420px',
        background: '#FFFFFF', borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '28px 24px', boxSizing: 'border-box',
        textAlign: 'center', animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: '#FFF7ED', border: '1px solid #FFEDD5',
          color: '#F97316', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px auto'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h3 id="session-expired-title" style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', fontFamily: "var(--font-heading)" }}>
          {sessionExpiredNotice === 'invalid' ? 'Sesi Berakhir' : 'Sesi Berakhir (15 Menit)'}
        </h3>

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', fontWeight: 500 }}>
          {sessionExpiredNotice === 'invalid'
            ? 'Sesi login Anda sudah tidak berlaku atau telah kedaluwarsa. Anda telah ter-logout otomatis, silakan login kembali untuk melanjutkan.'
            : 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Anda telah ter-logout otomatis dan dikembalikan ke menu Overview.'}
        </p>

        <button
          type="button"
          onClick={() => setSessionExpiredNotice(false)}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            border: 'none', background: 'linear-gradient(135deg, #800000 0%, #FF5E00 100%)',
            color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(128, 0, 0, 0.35)',
            transition: 'all 0.2s'
          }}
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}

```

---

