import { formatBranch } from '../../utils';

// User Profile Flyout Dropdown
export default function ProfileMenu({ user, isAdmin, setShowProfileModal, handleLogout }) {
  return (
    <>
      {/* Transparent Backdrop Overlay to close on outside click */}
      <div 
        onClick={() => setShowProfileModal(false)} 
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
      />

      <div className="profile-dropdown-card">
        {/* Header info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 14px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="profile-avatar-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <div style={{ overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.fullName || user.username}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>
              @{user.username}
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div style={{ padding: '12px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Branch</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {isAdmin ? 'Semua Branch' : formatBranch(user.branchName)}
            </span>
          </div>
        </div>

        {/* Action Items List */}
        <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Log Out Item with Red Door Icon */}
          <button
            type="button"
            onClick={() => {
              setShowProfileModal(false);
              handleLogout(true);
            }}
            className="profile-menu-item logout"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
