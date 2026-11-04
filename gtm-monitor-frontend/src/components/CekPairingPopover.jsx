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
                className="search-input-field"
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
                  height: '42px',
                  paddingLeft: '38px',
                  paddingRight: query ? '36px' : '14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  outline: 'none',
                  boxShadow: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0F172A';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
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
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#800000', fontSize: '12px', fontWeight: 500, lineHeight: 1.45 }}>
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
                  e.currentTarget.style.background = '#660000';
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
                  e.currentTarget.style.background = '#660000';
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
