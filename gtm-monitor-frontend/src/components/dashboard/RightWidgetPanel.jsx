import { useState, useMemo, useEffect } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

function MiniProgressItem({ b, index, goBranch, isInView }) {
  const isDecimal = Number(b.occRate) % 1 !== 0;
  const animDuration = 800;
  const animDelay = index * 40;
  const countOcc = useCountUp(b.occRate, { enabled: isInView, decimals: isDecimal ? 1 : 0, duration: animDuration, delay: animDelay });
  const countProj = useCountUp(b.projCount, { enabled: isInView, duration: animDuration, delay: animDelay });

  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [isInView]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (goBranch) goBranch(b.name);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (goBranch) goBranch(b.name);
        }
      }}
      aria-label={`Buka detail branch ${b.name}`}
      className="ranking-mini-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        padding: '10px 12px',
        borderRadius: '10px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #F1F5F9',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#FFFFFF';
        e.currentTarget.style.borderColor = '#CBD5E1';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
        e.currentTarget.style.borderColor = '#F1F5F9';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Baris 1: Rank, Nama Branch & Persentase + Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', flexShrink: 0 }}>
            #{index + 1}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
            {countOcc}%
          </span>
          <span className={b.delta > 0 ? 'gap-badge-pos' : b.delta < 0 ? 'gap-badge-neg' : 'gap-badge-zero'}>
            <span style={{ fontSize: '8px', lineHeight: 1 }}>{b.delta > 0 ? '▲' : b.delta < 0 ? '▼' : '—'}</span>
            <span>{b.delta > 0 ? `+${b.delta}%` : `${b.delta}%`}</span>
          </span>
        </div>
      </div>

      {/* Baris 2: Mini Progress Bar & Jumlah Proyek */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, height: '4px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: isAnimated ? `${Math.min(b.occRate, 100)}%` : '0%',
              background: b.occRate < 12 ? '#C8102E' : '#1E293B',
              borderRadius: '999px',
              transition: `width ${animDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${animDelay}ms`,
              willChange: 'width'
            }}
          />
        </div>
        <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {countProj} proj
        </span>
      </div>
    </div>
  );
}

// ─── RIGHT WIDGET PANEL (ANTI-SLOP GENUINE BRANCH RANKING & STATUS) ───
export default function RightWidgetPanel({
  ranking = [],
  goBranch,
  safeKpi = {},
  isInView = true
}) {
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking' | 'activity'

  const sortedBranches = useMemo(() => {
    return Array.isArray(ranking) && ranking.length > 0
      ? [...ranking].sort((a, b) => a.occRate - b.occRate)
      : [];
  }, [ranking]);

  // Extract genuine activities from branch projects (NO FAKE HALLUCINATED MOCKS)
  const realActivities = useMemo(() => {
    const list = [];
    (ranking || []).forEach(b => {
      (b.projects || []).forEach(p => {
        (p.activities || []).forEach(a => {
          list.push({
            id: a.id || `${p.id}-${a.type}`,
            branchName: b.name,
            projectName: p.name,
            wokName: p.wok,
            type: a.type,
            status: a.status,
            createdAt: a.createdAt
          });
        });
      });
    });
    return list;
  }, [ranking]);

  const pendingCount = safeKpi.actPending || 0;
  const verifiedCount = safeKpi.actVerified || 0;
  const belumCount = safeKpi.actBelum || 0;

  const countPending = useCountUp(pendingCount, { enabled: isInView, duration: 800 });
  const countVerified = useCountUp(verifiedCount, { enabled: isInView, duration: 800 });
  const countBelum = useCountUp(belumCount, { enabled: isInView, duration: 800 });

  return (
    <div
      className="saas-card right-widget-panel"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── TAB HEADER: [ Ranking Branch ] & [ Aktivitas GTM ] ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#F1F5F9',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid #E2E8F0'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('ranking')}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '12px',
            fontWeight: activeTab === 'ranking' ? 700 : 500,
            cursor: 'pointer',
            background: activeTab === 'ranking' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'ranking' ? '#0F172A' : '#64748B',
            boxShadow: activeTab === 'ranking' ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
            transition: 'all 0.15s ease',
            textAlign: 'center'
          }}
        >
          Ranking Branch
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '12px',
            fontWeight: activeTab === 'activity' ? 700 : 500,
            cursor: 'pointer',
            background: activeTab === 'activity' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'activity' ? '#0F172A' : '#64748B',
            boxShadow: activeTab === 'activity' ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
            transition: 'all 0.15s ease',
            textAlign: 'center'
          }}
        >
          Aktivitas GTM
        </button>
      </div>

      {/* ─── TAB KONTEN 1: RANKING BRANCH (DEFAULT AKTIF) ─── */}
      {activeTab === 'ranking' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
              Prioritas Intervensi Branch
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              OCC Terendah
            </span>
          </div>

          {sortedBranches.length > 0 ? (
            sortedBranches.slice(0, 6).map((b, idx) => (
              <MiniProgressItem
                key={b.name}
                b={b}
                index={idx}
                goBranch={goBranch}
                isInView={isInView}
              />
            ))
          ) : (
            <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC', borderRadius: '10px' }}>
              Belum ada data peringkat branch.
            </div>
          )}
        </div>
      ) : (
        /* ─── TAB KONTEN 2: AKTIVITAS GTM (REAL DYNAMIC DATA) ─── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', padding: '0 2px' }}>
            Pelaporan Lapangan Terkini
          </div>

          {realActivities.length > 0 ? (
            realActivities.slice(0, 5).map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                    {item.type?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: item.status === 'verified' ? '#ECFDF5' : '#FFFBEB',
                      color: item.status === 'verified' ? '#065F46' : '#B45309'
                    }}
                  >
                    {item.status === 'verified' ? 'Terverifikasi' : 'Menunggu Review'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  Branch {item.branchName} · WOK {item.wokName || '-'}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px dashed #CBD5E1',
                color: '#64748B'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Belum ada pelaporan baru
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', lineHeight: 1.4 }}>
                Aktivitas foto lapangan yang diunggah akan otomatis tercatat pada daftar ini.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── BAGIAN BAWAH: STATUS VERIFIKASI (CLEAN TELEMETRY, NO TRIPLE NESTED BOXES) ─── */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '14px',
          borderTop: '1px solid #F1F5F9'
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
          Status Verifikasi Kegiatan
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {/* Menunggu Verifikasi */}
          <div
            style={{
              padding: '9px 6px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderTop: '3px solid #D97706',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {countPending}
            </div>
            <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3.5px' }}>
              <span style={{ width: '5.5px', height: '5.5px', borderRadius: '50%', background: '#D97706', flexShrink: 0 }} />
              Menunggu
            </div>
          </div>

          {/* Terverifikasi */}
          <div
            style={{
              padding: '9px 6px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderTop: '3px solid #059669',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {countVerified}
            </div>
            <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3.5px' }}>
              <span style={{ width: '5.5px', height: '5.5px', borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
              Terverifikasi
            </div>
          </div>

          {/* Belum Selesai */}
          <div
            style={{
              padding: '9px 6px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderTop: '3px solid #94A3B8',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {countBelum}
            </div>
            <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3.5px' }}>
              <span style={{ width: '5.5px', height: '5.5px', borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
              Belum
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
