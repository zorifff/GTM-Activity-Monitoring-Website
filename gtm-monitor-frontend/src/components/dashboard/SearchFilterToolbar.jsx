import { useState } from 'react';

// ─── TOOLBAR PENCARIAN & FILTER (HARMONIOUS PALETTE, NO ACCENT CLASH) ───
export default function SearchFilterToolbar({
  searchQuery,
  onSearchChange,
  scopeFilter,
  onScopeChange,
  branchList = []
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className="search-filter-toolbar"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${isFocused ? '#94A3B8' : 'rgba(226, 232, 240, 0.9)'}`,
        boxShadow: isFocused ? '0 2px 8px rgba(15, 23, 42, 0.05)' : '0 1px 2px rgba(15, 23, 42, 0.03)',
        padding: '5px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.15s ease',
        boxSizing: 'border-box'
      }}
    >
      {/* Dropdown Pemilih Cakupan Terintegrasi di Kiri */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          value={scopeFilter}
          onChange={(e) => onScopeChange(e.target.value)}
          aria-label="Pilih cakupan branch"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '7px 26px 7px 10px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            transition: 'border-color 0.15s ease'
          }}
        >
          <option value="ALL">Semua Cakupan</option>
          {branchList.map((b) => (
            <option key={b.name || b} value={b.name || b}>
              Branch {b.name || b}
            </option>
          ))}
        </select>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '9px',
            pointerEvents: 'none'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />

      {/* Input Teks Pencarian */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label="Cari Branch, WOK, atau Nama Proyek"
          placeholder="Cari Branch, WOK, atau Nama Proyek..."
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: '13px',
            color: '#0F172A',
            padding: '7px 0',
            fontWeight: 500
          }}
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Hapus kata kunci pencarian"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              marginRight: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Ikon Kaca Pembesar di Kanan (Harmonious neutral with subtle red active state) */}
      <div
        aria-hidden="true"
        style={{
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isFocused ? '#C8102E' : '#64748B',
          transition: 'color 0.15s ease'
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
    </div>
  );
}
