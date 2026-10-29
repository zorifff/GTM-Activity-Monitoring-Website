import { memo } from 'react';

/**
 * ActivityStatus Component
 * Komponen tunggal representasi status aktivitas GTM.
 * Varian:
 * - 'selesai': Ikon centang hijau sukses, tanpa tombol upload.
 * - 'belum': Ikon netral/abu, label singkat, tombol "Upload" sekunder/ghost netral (TIDAK merah).
 * - 'proses': Ikon spinner/progress circle.
 * - 'menunggu_verifikasi': Badge amber + tombol "Cek Status" (bukan Upload).
 * - 'gagal': Badge merah + tombol "Perbaiki/Ulang" (satu-satunya varian merah).
 */
const ActivityStatus = memo(function ActivityStatus({
  status = 'belum',
  label,
  count,
  onClick,
  onAction,
  title
}) {
  const handleAction = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onAction) onAction(e);
    else if (onClick) onClick(e);
  };

  // 1. Selesai (Verified) — Ikon centang, hijau sukses, tanpa tombol
  if (status === 'selesai' || status === 'verified') {
    const displayLabel = label || (count > 1 ? `Selesai (${count})` : 'Selesai');
    return (
      <div
        role="status"
        aria-label={title ? `${title}: Selesai dan terverifikasi` : 'Aktivitas selesai dan terverifikasi'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}
        title={title ? `${title}: Selesai & Terverifikasi` : 'Aktivitas telah selesai dan terverifikasi'}
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{displayLabel}</span>
      </div>
    );
  }

  // 2. Menunggu Verifikasi — Badge amber + tombol "Cek Status"
  if (status === 'menunggu_verifikasi' || status === 'upload') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <span
          role="status"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FDE68A',
            whiteSpace: 'nowrap'
          }}
        >
          {label || 'Menunggu Verif'}
        </span>
        <button
          type="button"
          onClick={handleAction}
          aria-label={title ? `Cek status verifikasi ${title}` : 'Cek status verifikasi'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            color: '#B45309',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '26px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF3C7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFBEB'; }}
          title={title ? `${title}: Menunggu verifikasi admin. Klik untuk cek status.` : 'Menunggu verifikasi admin. Klik untuk cek status.'}
        >
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Cek Status</span>
        </button>
      </div>
    );
  }

  // 3. Proses — Ikon spinner + indikator proses
  if (status === 'proses' || status === 'processing') {
    return (
      <div
        role="status"
        aria-label={title ? `${title}: Sedang diproses` : 'Sedang diproses'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
          border: '1px solid #BFDBFE',
          fontSize: '11px',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}
        title={title ? `${title}: Sedang diproses` : 'Sedang diproses'}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        <span>{label || 'Proses'}</span>
      </div>
    );
  }

  // 4. Gagal / Ditolak — Ikon merah + tombol "Perbaiki/Ulang" (Satu-satunya varian merah bahaya)
  if (status === 'gagal' || status === 'rejected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <span
          role="status"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            border: '1px solid #FECACA',
            whiteSpace: 'nowrap'
          }}
        >
          {label || 'Ditolak'}
        </span>
        <button
          type="button"
          onClick={handleAction}
          aria-label={title ? `Perbaiki data kegiatan ${title}` : 'Perbaiki data kegiatan'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#DC2626',
            border: '1px solid #B91C1C',
            color: '#FFFFFF',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '26px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; }}
          title={title ? `${title}: Kegiatan ditolak. Klik untuk perbaiki.` : 'Kegiatan ditolak. Klik untuk perbaiki.'}
        >
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span>Perbaiki</span>
        </button>
      </div>
    );
  }

  // 5. Belum (Default) — Ikon netral/abu, label singkat, tombol "Upload" sekunder/ghost netral (TIDAK merah)
  return (
    <button
      type="button"
      onClick={handleAction}
      aria-label={title ? `Unggah kegiatan ${title}` : 'Unggah kegiatan GTM'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        padding: '5px 10px',
        borderRadius: '6px',
        border: '1px solid #CBD5E1',
        backgroundColor: '#F8FAFC',
        color: '#475569',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        minHeight: '28px',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F1F5F9';
        e.currentTarget.style.color = '#0F172A';
        e.currentTarget.style.borderColor = '#94A3B8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
        e.currentTarget.style.color = '#475569';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      title={title ? `Upload kegiatan ${title}` : 'Klik untuk mengunggah kegiatan GTM'}
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span>Upload</span>
    </button>
  );
});

export default ActivityStatus;
