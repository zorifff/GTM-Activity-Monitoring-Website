// ─── 1. HEADER TITLE (MATCHING MONITORING & ACTIVITY PAGE STYLE) ───
export default function AdminHeader() {
  return (
    <div className="page-title-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          Administrator Control Panel
        </h1>
      </div>
    </div>
  );
}
