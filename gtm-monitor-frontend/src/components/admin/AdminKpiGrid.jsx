// ─── 2. KPI SUMMARY GRID (HARMONIZED STYLING) ───
export default function AdminKpiGrid({ priorityBranches, stats, totalProjects }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {/* Card 1: Total Branch / Proyek */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Total Branch / Proyek
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
          {priorityBranches.length} / {totalProjects}
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>Terkoneksi dalam sistem GTM</div>
      </div>

      {/* Card 2: Total ODP / Kapasitas */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Total ODP / Kapasitas
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
          {stats.odpCount} <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 700 }}>ODP</span>
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>{stats.totalUsed} / {stats.totalPort} port ({stats.occRate}%)</div>
      </div>

      {/* Card 3: Menunggu Verifikasi */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Menunggu Verifikasi</span>
          {stats.actUploaded > 0 && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF5E00' }} />}
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
          {stats.actUploaded} <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 700 }}>Kegiatan</span>
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>Butuh tindakan review admin</div>
      </div>

      {/* Card 4: Progress Verifikasi GTM */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Progress Verifikasi GTM
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
          {stats.actCompletionPct}%
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>{stats.actVerified} dari {stats.totalActivitySlots} kegiatan terverifikasi</div>
      </div>
    </div>
  );
}
