// ─── 3. NAVIGATION TABS (SEGMENTED PILL) ───
export default function AdminTabs() {
  return (
    <div className="admin-tabs-container" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#F1F5F9',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}
      >
        <span
          style={{
            height: '32px',
            padding: '0 16px',
            borderRadius: '6px',
            fontSize: '13px',
            background: '#FFFFFF',
            color: '#0F172A',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          Update Data Mingguan
        </span>
      </div>
    </div>
  );
}
