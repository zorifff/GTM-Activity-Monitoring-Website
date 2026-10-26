// ─── 1. HEADER TITLE (MATCHING MONITORING & ACTIVITY PAGE STYLE) ───
export default function AdminHeader() {
  return (
    <div className="page-title-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <div>
        <div style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '3px', color: '#FF5E00', fontWeight: 800, marginBottom: '4px' }}>
          PANEL KONTROL SISTEM
        </div>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
          Administrator Control Panel
        </h1>
      </div>
    </div>
  );
}
