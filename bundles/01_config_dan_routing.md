# Bundle 1: Konfigurasi Proyek, Desain Sistem, & Routing

> Berisi konfigurasi build environment, CSS tokens, sistem interceptor API, TanStack query client, otentikasi global, dan route definitions.

**Daftar Berkas Terlampir (11 berkas):**

- `gtm-monitor-frontend/package.json` (33 baris)
- `gtm-monitor-frontend/vite.config.js` (31 baris)
- `gtm-monitor-frontend/index.html` (20 baris)
- `gtm-monitor-frontend/src/index.css` (1168 baris)
- `gtm-monitor-frontend/src/apiConfig.js` (64 baris)
- `gtm-monitor-frontend/src/lib/queryClient.js` (18 baris)
- `gtm-monitor-frontend/src/main.jsx` (21 baris)
- `gtm-monitor-frontend/src/App.jsx` (34 baris)
- `gtm-monitor-frontend/src/routes/paths.js` (31 baris)
- `gtm-monitor-frontend/src/routes/guards.jsx` (29 baris)
- `gtm-monitor-frontend/src/auth/AuthContext.jsx` (188 baris)

**Total Baris Kode**: 1.637 baris

---

## File: `gtm-monitor-frontend/package.json` (33 baris)

```json
{
  "name": "gtm-monitor-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test:e2e": "vite build --mode e2e && playwright test",
    "test:e2e:update": "vite build --mode e2e && playwright test --update-snapshots"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.104.5",
    "@tanstack/react-virtual": "^3.14.22",
    "html2canvas": "^1.4.1",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-router": "^7.18.4",
    "xlsx": "^0.18.5",
    "xlsx-js-style": "^1.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.64.1",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "oxlint": "^1.71.0",
    "vite": "^8.1.1"
  }
}

```

---

## File: `gtm-monitor-frontend/vite.config.js` (31 baris)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      // Foto kegiatan terverifikasi (object storage, disajikan backend lewat /media/verified/...)
      '/media': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      // URL foto format lama — dialihkan backend ke /media/verified/...
      '^/database(%20| )foto': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  }
})

```

---

## File: `gtm-monitor-frontend/index.html` (20 baris)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='gtmGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23C8102E'/%3E%3Cstop offset='100%25' stop-color='%23FF5E00'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='50' fill='url(%23gtmGrad)'/%3E%3Ctext x='50' y='54' font-family='sans-serif' font-weight='900' font-size='34' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle' letter-spacing='-1'%3EGTM%3C/text%3E%3C/svg%3E" />
    <link rel="shortcut icon" type="image/svg+xml" href="/favicon.svg?v=3" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GTM Activity Monitor - Jateng DIY</title>
    <!-- Google Fonts: Inter & Geist (Modern Neo-Grotesque / Geometric Sans-Serif UI Fonts) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

---

## File: `gtm-monitor-frontend/src/index.css` (1168 baris)

```css
:root {
  font-family: 'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background-color: #ffffff;
  --font-heading: 'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Spektrum Merah - Jingga - Hitam - Putih */
  --primary-red: #800000;
  --primary-orange: #FF5E00;
  --grad-red-orange: linear-gradient(135deg, #800000 0%, #FF5E00 100%);
  --grad-orange-red: linear-gradient(135deg, #FF5E00 0%, #800000 100%);
  --bg-dark: #090A0F;
  --bg-dark-card: rgba(255, 255, 255, 0.04);
}

html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  font-family: var(--font-body);
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
}

#root {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

/* Animations & Landing Page Effects */
@keyframes portalPulse {
  0% {
    transform: scale(0.99);
    box-shadow: 0 4px 20px rgba(128, 0, 0, 0.15);
  }
  50% {
    transform: scale(1.01);
    box-shadow: 0 8px 30px rgba(128, 0, 0, 0.25);
  }
  100% {
    transform: scale(0.99);
    box-shadow: 0 4px 20px rgba(128, 0, 0, 0.15);
  }
}

@keyframes floatAnim {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

@keyframes rotateRing {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

/* Base interactive elements & affordances (R-39) */
button, a[href], select, summary, label[for] {
  cursor: pointer;
}

:disabled, button:disabled, input:disabled, select:disabled {
  cursor: not-allowed !important;
}

select, input {
  font-family: inherit;
}
select:focus, input:focus {
  border-color: #94a3b8;
}

/* Disable native browser password reveal eye icon to prevent glitches */
input::-ms-reveal,
input::-ms-clear,
input::-webkit-credentials-auto-fill-button {
  display: none !important;
}

button {
  font-family: inherit;
}

/* Accessible focus ring replacement for keyboard navigation (R-32) */
:focus-visible {
  outline: 2px solid #800000 !important;
  outline-offset: 2px !important;
}

/* Utilities */
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes programDropdownFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.main-content {
  max-width: 1360px; 
  margin: 0 auto; 
  padding: 24px 32px 64px;
}

.main-content-full {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

.table-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .04em;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.table-row {
  display: grid;
  gap: 8px;
  align-items: center;
  padding: 8px 16px;
  min-height: 52px;
  border-top: 1px solid #f1f5f9;
  background-color: #ffffff;
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: #f8fafc;
}

.table-row.table-row-even {
  background-color: #fcfdfe;
}

.table-row.table-row-even:hover {
  background-color: #f1f5f9;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.activity-col-header {
  white-space: normal; /* allow wrapping for activity headers */
  text-align: center;
  padding: 0 4px;
  line-height: 1.3;
}

.dropdown-item {
  padding: 10px 16px;
  font-size: 13.5px;
  cursor: pointer;
  transition: background 0.1s;
  color: #334155;
}
.dropdown-item:hover {
  background: #f1f5f9;
}
.dropdown-item.active {
  background: #f8fafc;
  font-weight: 600;
  color: #0f172a;
}

/* Clean Horizontal Nav Menu Items (All options visible directly without scroll) */
.nav-menu-items {
  display: flex;
  align-items: center;
  gap: 32px;
  position: relative;
}

/* Profile Flyout Dropdown Card */
.profile-dropdown-card {
  position: fixed;
  top: 68px;
  right: 24px;
  width: 290px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.12);
  z-index: 9999;
  padding: 16px;
  animation: flyoutSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

@keyframes flyoutSlideDown {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.profile-avatar-circle {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #334155;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.profile-menu-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.profile-menu-item.logout {
  color: #dc2626;
}

.profile-menu-item.logout:hover {
  background: #fef2f2;
  color: #b91c1c;
}

/* ─── COMPREHENSIVE RESPONSIVE MOBILE STYLES (VERSATILE ACROSS ALL RESOLUTIONS) ─── */
.table-responsive-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}


.app-root-container {
  min-height: 100vh;
  background: #FFFFFF;
  color: #0F172A;
  padding-top: 72px;
  width: 100%;
  box-sizing: border-box;
}

.app-root-container.app-root-no-nav {
  padding-top: 0 !important;
}

.main-top-nav {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  max-width: 100vw !important;
  z-index: 1000 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding: 16px 48px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  box-sizing: border-box;
}

/* Level 2 Program Menu styling (Flyout vs Inline) */
.program-level2-flyout {
  display: block;
}
.program-level2-inline {
  display: none;
}

@media (max-width: 900px) {
  .app-root-container:not(.app-root-no-nav) {
    padding-top: 56px !important;
  }

  nav, .main-top-nav {
    padding: 8px 12px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 6px !important;
  }

  .nav-logo-section {
    flex-shrink: 0 !important;
  }

  .nav-menu-section {
    flex: 1 !important;
    min-width: 0 !important;
    max-width: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
  }
  
  .nav-menu-items {
    gap: 16px !important;
    padding-bottom: 0 !important;
  }

  .nav-tab-btn {
    font-size: 11px !important;
    letter-spacing: 0.8px !important;
    padding: 4px 2px !important;
  }

  .nav-account-section {
    flex-shrink: 0 !important;
    display: flex !important;
    align-items: center !important;
    margin-left: auto !important;
  }

  .nav-profile-btn {
    padding: 4px 6px 4px 4px !important;
    gap: 4px !important;
  }

  .nav-profile-text-container {
    display: none !important; /* Hide long text on mobile to leave max space for nav tabs */
  }

  .nav-avatar-circle {
    width: 30px !important;
    height: 30px !important;
    font-size: 12px !important;
  }

  .profile-dropdown-card {
    top: 58px !important;
    right: 10px !important;
    width: 280px !important;
    max-width: calc(100vw - 20px) !important;
  }

  .stats-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 18px !important;
  }

  .stats-block-container {
    padding: 20px 24px !important;
  }

  .capabilities-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 16px !important;
  }

  .branches-responsive-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 12px !important;
  }

  .page-responsive-padding {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .main-content {
    padding: 16px 12px 48px !important;
  }
}

@media (max-width: 768px) {
  .program-level2-flyout {
    display: none !important;
  }
  .program-level2-inline {
    display: block !important;
  }
  .program-fixed-dropdown {
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: calc(100vw - 24px) !important;
    max-width: 320px !important;
    top: 60px !important;
    max-height: 80vh !important;
    overflow-y: auto !important;
    border-radius: 18px !important;
  }
  .pairing-fixed-dropdown {
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: calc(100vw - 24px) !important;
    max-width: 380px !important;
    top: 60px !important;
    box-sizing: border-box !important;
    padding: 16px !important;
  }
}

@media (max-width: 600px) {
  .nav-profile-text-container {
    max-width: 70px !important;
  }
  .nav-profile-name {
    max-width: 70px !important;
    font-size: 10.5px !important;
  }
  .nav-profile-role {
    display: none !important;
  }

  .pairing-transposed-modal {
    padding: 10px 6px !important;
  }
  .pairing-transposed-modal-card {
    max-height: 90vh !important;
    border-radius: 16px !important;
  }

  .main-content {
    padding: 12px 8px 36px !important;
  }

  .page-responsive-padding {
    padding-left: 6px !important;
    padding-right: 6px !important;
  }

  .stats-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }

  .capabilities-responsive-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  .branches-responsive-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }

  .hero-title-responsive {
    font-size: clamp(42px, 15vw, 90px) !important;
    letter-spacing: clamp(4px, 2vw, 16px) !important;
  }

  .hero-subtitle-responsive {
    font-size: 12px !important;
    letter-spacing: 1.5px !important;
    margin-bottom: 24px !important;
  }
  
  .admin-tab-btn {
    padding: 8px 10px !important;
    font-size: 10.5px !important;
    gap: 4px !important;
    flex: 1 !important;
    justify-content: center !important;
    text-align: center !important;
    border-radius: 12px !important;
  }
  .admin-tabs-container {
    gap: 6px !important;
    justify-content: space-between !important;
  }
}

.admin-tab-btn {
  padding: 10px 24px;
  font-size: 13px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.25s ease;
}
.admin-tabs-container {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.dashboard-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: none;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.custom-table-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-table-scrollbar::-webkit-scrollbar-track {
  background: #F8FAFC;
}
.custom-table-scrollbar::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}
.custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

@media (max-width: 640px) {
  .page-title-header {
    padding-left: 10px !important;
    padding-right: 10px !important;
    box-sizing: border-box !important;
  }

  .dashboard-card {
    padding: 14px 10px !important;
    border-radius: 14px !important;
    margin-bottom: 16px !important;
  }
  
  .controls-bar-container {
    flex-wrap: wrap !important;
    gap: 10px !important;
  }
  
  .branch-filter-capsule,
  .control-btn-mobile {
    flex: 1 1 calc(50% - 6px) !important;
    min-width: 0 !important;
    max-width: none !important;
    box-sizing: border-box !important;
    justify-content: center !important;
    padding: 8px 12px !important;
    font-size: 12px !important;
    gap: 6px !important;
    text-align: center !important;
  }
  
  .branch-text-label {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    max-width: none !important;
    display: inline-block !important;
  }

  .search-container-mobile {
    flex: 1 1 100% !important;
    width: 100% !important;
    margin-top: 2px !important;
  }
  
  .search-input-field {
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 10px 18px !important;
    font-size: 12.5px !important;
  }

  .table-pagination-footer {
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    padding: 12px 10px !important;
    gap: 10px !important;
  }

  .table-pagination-controls {
    width: 100% !important;
    justify-content: space-around !important;
    gap: 8px !important;
  }
}

.controls-bar-container {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  position: relative;
  z-index: 80;
}

.branch-filter-capsule {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #E2E8F0;
  font-size: 13px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 220px;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.search-input-field {
  width: 100%;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #E2E8F0;
  font-size: 13px;
  font-weight: 500;
  background: #FFFFFF;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.table-pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-wrap: wrap;
  gap: 12px;
}

.table-pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ─── MONITORING DASHBOARD SECTIONS & ANIMATIONS ─── */
.dashboard-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: none;
}

@keyframes dashboardSlideUp {
  0% {
    opacity: 0;
    transform: translateY(18px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rowStaggerFade {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sectionEntrance {
  0% {
    opacity: 0;
    transform: translateY(14px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.monitoring-section {
  animation: sectionEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.kpi-card-animated {
  animation: dashboardSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
}

.kpi-card-animated:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -4px rgba(15, 23, 42, 0.08);
  border-color: #CBD5E1;
}

.ranking-row-animated {
  animation: rowStaggerFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Stagger utilities */
.stagger-1 { animation-delay: 40ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 160ms; }
.stagger-4 { animation-delay: 220ms; }
.stagger-5 { animation-delay: 280ms; }
.stagger-6 { animation-delay: 340ms; }

/* Progress bar smooth dynamic fill */
.progress-bar-fill {
  transition: width 0.85s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .monitoring-section,
  .kpi-card-animated,
  .ranking-row-animated,
  .progress-bar-fill,
  .fade-in {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}

/* ─── REFACTORED MONITORING DASHBOARD (SPACING & CARDS) ─── */
.dashboard-layout-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px 4px 48px;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.kpi-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 1024px) {
  .kpi-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .dashboard-layout-container {
    padding: 4px 2px 32px;
    gap: 32px;
  }
  .kpi-grid-4 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 14px;
  }
}

.kpi-metric-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E2E8F0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  box-sizing: border-box;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
}

.kpi-metric-card:hover {
  transform: translateY(-2px);
  box-shadow: none;
  border-color: #cbd5e1;
}

.ranking-card-container {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: none;
  overflow: hidden;
}

.ranking-card-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.executive-summary-container {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: none;
  padding: 24px;
  overflow: hidden;
}

.gap-badge-pos {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  background-color: #15803D;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.gap-badge-neg {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  background-color: #DC2626;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.gap-badge-zero {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  background-color: #475569;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  padding: 0;
  border-radius: 0;
  border: none !important;
  background-color: transparent !important;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-height: 44px;
  position: relative;
  box-shadow: none !important;
  transition: color 0.16s ease;
}

.sidebar-nav-item .sidebar-left-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0.35);
  width: 5px;
  height: 25px;
  border-radius: 0 6px 6px 0;
  background-color: #FF1E27;
  box-shadow: 0 0 12px rgba(255, 30, 39, 0.75);
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  z-index: 2;
}

.sidebar-nav-item .sidebar-nav-box {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 11px 24px;
  min-height: 44px;
  border-radius: 0;
  background-color: transparent;
  border: none !important;
  box-sizing: border-box;
  transition: background-color 0.18s ease;
}

.sidebar-nav-item .nav-icon-outline {
  display: block;
  color: rgba(255, 255, 255, 0.72);
  flex-shrink: 0;
  transition: color 0.16s ease;
}

.sidebar-nav-item .nav-icon-filled {
  display: none;
  color: #FF1E27;
  flex-shrink: 0;
  transition: color 0.16s ease;
}

.sidebar-nav-item .sidebar-nav-label {
  display: inline-block;
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.72);
  transition: color 0.16s ease, font-weight 0.16s ease;
}

.sidebar-nav-item.active,
.sidebar-nav-item:hover,
.sidebar-nav-item:focus-visible {
  background-color: transparent !important;
  color: #FFFFFF !important;
  box-shadow: none !important;
  outline: none;
}

.sidebar-nav-item.active .sidebar-left-indicator,
.sidebar-nav-item:hover .sidebar-left-indicator,
.sidebar-nav-item:focus-visible .sidebar-left-indicator {
  opacity: 1;
  transform: translateY(-50%) scaleY(1);
  background-color: #FF1E27 !important;
}

.sidebar-nav-item.active .sidebar-nav-box {
  background: linear-gradient(90deg, rgba(255, 30, 39, 0.24) 0%, rgba(255, 30, 39, 0.06) 100%) !important;
}

.sidebar-nav-item:hover .sidebar-nav-box,
.sidebar-nav-item:focus-visible .sidebar-nav-box {
  background: rgba(255, 30, 39, 0.14) !important;
}

.sidebar-nav-item:focus-visible .sidebar-nav-box {
  outline: 2px solid #FF1E27;
  outline-offset: -2px;
}

.sidebar-nav-item.active .nav-icon-outline,
.sidebar-nav-item:hover .nav-icon-outline,
.sidebar-nav-item:focus-visible .nav-icon-outline {
  display: none;
}

.sidebar-nav-item.active .nav-icon-filled,
.sidebar-nav-item:hover .nav-icon-filled,
.sidebar-nav-item:focus-visible .nav-icon-filled {
  display: block;
  color: #FF1E27 !important;
}

.sidebar-nav-item.active .sidebar-nav-label {
  color: #FFFFFF !important;
  font-weight: 600 !important;
}

.sidebar-nav-item:hover .sidebar-nav-label,
.sidebar-nav-item:focus-visible .sidebar-nav-label {
  color: #FFFFFF !important;
  font-weight: 500 !important;
}

.sidebar-brand-btn:focus-visible {
  outline: 2px solid #FF1E27;
  outline-offset: 4px;
  border-radius: 8px;
}

.sidebar-login-btn {
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease !important;
}

.sidebar-login-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35) !important;
  color: #021329 !important;
  background-color: #FFFFFF !important;
}

.sidebar-login-btn:active {
  transform: translateY(0) scale(0.98);
}

.quick-action-plus-btn:active,
.hero-review-btn:active {
  transform: scale(0.97);
}

.custom-table-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.custom-table-scrollbar::-webkit-scrollbar-track {
  background: #F1F5F9;
  border-radius: 4px;
}

.custom-table-scrollbar::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

.custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}

@media (max-width: 1200px) {
  .dashboard-bottom-grid {
    grid-template-columns: 1fr !important;
  }
}

.app-sidebar {
  height: 100vh;
  min-height: 100dvh;
}

@media (max-width: 1024px) {
  .app-sidebar {
    position: fixed !important;
    left: 0;
    top: 0;
    bottom: 0;
    height: 100vh !important;
    min-height: 100vh !important;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 0 35px rgba(2, 19, 41, 0.7);
  }

  .app-sidebar.mobile-open {
    transform: translateX(0) !important;
  }

  .mobile-hamburger-btn {
    display: flex !important;
  }

  .header-left-zone {
    width: auto !important;
    min-width: auto !important;
  }

  .dashboard-top-row {
    flex-direction: column !important;
  }

  .hero-red-card {
    max-width: 100% !important;
  }

  .saas-main-viewport {
    padding: 16px 20px 40px !important;
  }
}

@media (max-width: 768px) {
  .top-header-bar {
    padding: 0 16px !important;
  }

  .header-breadcrumbs {
    display: none !important;
  }

  .header-profile-text {
    display: none !important;
  }

  .header-segmented-filter {
    display: none !important;
  }

  .saas-main-viewport {
    padding: 14px 14px 32px !important;
  }
}

```

---

## File: `gtm-monitor-frontend/src/apiConfig.js` (64 baris)

```javascript
// Default '' = same-origin (produksi: backend menyajikan frontend; dev: lewat proxy Vite di vite.config.js)
// agar cookie sesi HttpOnly selalu terkirim tanpa masalah lintas-origin.
export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : '';

// Event global saat sesi tidak bisa diperbarui lagi — App.jsx akan me-logout & meminta login ulang
export const UNAUTHORIZED_EVENT = 'gtm:unauthorized';
// Event saat access token berhasil diperbarui (detail: { user, expiresAt })
export const SESSION_REFRESHED_EVENT = 'gtm:session-refreshed';

// Endpoint auth yang tidak boleh memicu refresh otomatis (mencegah loop)
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

let refreshPromise = null;

// Hasil: 'ok' (sesi diperbarui), 'invalid' (wajib login ulang), 'error' (server tak terjangkau)
const requestRefresh = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT, { detail: data }));
      return 'ok';
    }
    // 409 = tab lain baru saja memperbarui sesi; cookie baru sudah tersimpan di browser
    if (res.status === 409) return 'ok';
    if (res.status === 401) return 'invalid';
    return 'error';
  } catch {
    return 'error';
  }
};

// Satu proses refresh untuk banyak request bersamaan; navigator.locks menyerialkan refresh antar-tab
export const refreshSession = () => {
  if (!refreshPromise) {
    const run = navigator.locks?.request
      ? navigator.locks.request('gtm-session-refresh', requestRefresh)
      : requestRefresh();
    refreshPromise = run.finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

// fetch dengan cookie sesi (HttpOnly) — token tidak pernah disentuh JavaScript.
// Access token berumur 15 menit: bila ditolak (401), sesi diperbarui otomatis lalu request diulang sekali.
export const authFetch = async (url, options = {}) => {
  const doFetch = () => fetch(url, { ...options, credentials: 'include' });
  let res = await doFetch();

  if (res.status === 401 && !NO_REFRESH_PATHS.some(path => String(url).includes(path))) {
    const result = await refreshSession();
    if (result === 'ok') {
      res = await doFetch();
      if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    } else if (result === 'invalid') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    // 'error': server tidak terjangkau — sesi dibiarkan, respons 401 diteruskan ke pemanggil
  }
  return res;
};

```

---

## File: `gtm-monitor-frontend/src/lib/queryClient.js` (18 baris)

```javascript
import { QueryClient } from '@tanstack/react-query';

// Server state (TanStack Query): data dianggap segar 60 detik. Setelah itu, saat tab browser aktif kembali,
// data diperbarui diam-diam di latar belakang (tanpa layar loading). Request yang sama otomatis digabung (dedup).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1
    },
    mutations: {
      retry: 0
    }
  }
});

```

---

## File: `gtm-monitor-frontend/src/main.jsx` (21 baris)

```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { queryClient } from './lib/queryClient.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

```

---

## File: `gtm-monitor-frontend/src/App.jsx` (34 baris)

```javascript
// Peta halaman aplikasi (React Router). Hak akses diatur deklaratif oleh guard:
//   pengunjung  : /, /login
//   login       : /dashboard, /upload
//   ADMIN saja  : /branch/:branchName, /admin
import { Routes, Route } from 'react-router';
import AppLayout from './routes/AppLayout';
import { RequireAuth, GuestOnly, FallbackRedirect } from './routes/guards';
import { LandingRoute, LoginRoute, DashboardRoute, BranchRoute, UploadRoute, AdminRoute } from './routes/pages';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<GuestOnly />}>
          <Route index element={<LandingRoute />} />
          <Route path="login" element={<LoginRoute />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="upload" element={<UploadRoute />} />
        </Route>

        <Route element={<RequireAuth roles={['ADMIN']} />}>
          <Route path="branch/:branchName" element={<BranchRoute />} />
          <Route path="admin" element={<AdminRoute />} />
        </Route>

        <Route path="*" element={<FallbackRedirect />} />
      </Route>
    </Routes>
  );
}

```

---

## File: `gtm-monitor-frontend/src/routes/paths.js` (31 baris)

```javascript
// Alamat halaman aplikasi (React Router). `view` = nama halaman yang dipakai komponen lama (menu aktif, animasi).
export const PATHS = {
  landing: '/',
  login: '/login',
  dashboard: '/dashboard',
  branch: (name) => `/branch/${encodeURIComponent(name)}`,
  upload: '/upload',
  admin: '/admin'
};

export function viewFromPath(pathname) {
  if (pathname === '/' || pathname === '') return 'landing';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/branch/')) return 'branch';
  if (pathname.startsWith('/upload')) return 'upload';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

// URL lama berbasis hash (#dashboard, #upload, …) sebelum memakai router → alamat baru
export const LEGACY_HASH_PATHS = {
  '#dashboard': PATHS.dashboard,
  '#monitoring': PATHS.dashboard,
  '#upload': PATHS.upload,
  '#admin': PATHS.admin,
  '#login': PATHS.login,
  '#landing': PATHS.landing,
  '#overview': PATHS.landing
};

```

---

## File: `gtm-monitor-frontend/src/routes/guards.jsx` (29 baris)

```javascript
// Route Guard deklaratif berbasis status login & peran (ADMIN / USER branch)
import { Navigate, Outlet, useOutletContext } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { PATHS } from './paths';

// Halaman khusus akun yang sudah login. `roles` (opsional) = peran yang diizinkan, mis. ['ADMIN'].
// Belum login → Overview; peran tidak sesuai (mis. akun branch membuka /admin) → Dashboard.
export function RequireAuth({ roles }) {
  const { user } = useAuth();
  const context = useOutletContext();
  if (!user) return <Navigate to={PATHS.landing} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={PATHS.dashboard} replace />;
  return <Outlet context={context} />;
}

// Halaman pengunjung (Overview & Login): akun yang sudah login langsung diarahkan ke Dashboard
export function GuestOnly() {
  const { user } = useAuth();
  const context = useOutletContext();
  if (user) return <Navigate to={PATHS.dashboard} replace />;
  return <Outlet context={context} />;
}

// Alamat tidak dikenal → Dashboard (sudah login) atau Overview
export function FallbackRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? PATHS.dashboard : PATHS.landing} replace />;
}

```

---

## File: `gtm-monitor-frontend/src/auth/AuthContext.jsx` (188 baris)

```javascript
// Status login (Universal Auth State). Token sesi ada di cookie HttpOnly (tidak terbaca JS);
// profil user diambil dari server (/api/auth/session), tidak disimpan di localStorage/sessionStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, UNAUTHORIZED_EVENT, SESSION_REFRESHED_EVENT } from '../apiConfig';
import { fetchAuthSession, queryKeys } from '../api/queries';
import { PATHS } from '../routes/paths';

const AuthContext = createContext(null);

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 menit = 900.000 ms

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);
  const lastLoginTimestamp = useRef(0);
  const lastActivityRef = useRef(Date.now());

  // Data monitoring milik akun sebelumnya dibuang saat akun berganti (login/logout)
  const clearAccountData = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.monitoringAll });
  }, [queryClient]);

  // Token sudah dipasang server sebagai cookie HttpOnly; frontend hanya menyimpan profil di memori
  const login = useCallback((newUser, expiresAt) => {
    document.activeElement?.blur();
    lastLoginTimestamp.current = Date.now();
    lastActivityRef.current = Date.now(); // Reset timestamp aktivitas saat login berhasil
    clearAccountData();
    setUser(newUser);
    setSessionExpiresAt(expiresAt || null);

    // Semua akun (Admin & User) selalu masuk ke Dashboard terlebih dahulu
    navigate(PATHS.dashboard, { replace: true });
  }, [clearAccountData, navigate]);

  const logout = useCallback(() => {
    lastActivityRef.current = Date.now(); // Reset timestamp aktivitas saat logout
    // Cookie HttpOnly hanya bisa dihapus oleh server. keepalive: request tetap terkirim walau halaman
    // langsung dimuat ulang / ditutup setelah logout (sesi di server pasti dicabut)
    fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include', keepalive: true })
      .catch(() => { /* server tidak terjangkau: cookie tetap kedaluwarsa sesuai masa aktifnya */ });
    setUser(null);
    setSessionExpiresAt(null);
    clearAccountData();
    navigate(PATHS.landing, { replace: true });
  }, [clearAccountData, navigate]);

  // ─── VALIDASI TOKEN SESI (TOKEN TIDAK SAH / KEDALUWARSA → LOGIN ULANG) ───
  const handleInvalidSession = useCallback(() => {
    logout();
    setSessionExpiredNotice('invalid');
  }, [logout]);

  // ─── OPTIMIZED 15-MINUTE INACTIVITY AUTO-LOGOUT EFFECT (ALL ROLES: ADMIN & USER) ───
  useEffect(() => {
    if (!user) return;

    // Reset timestamp aktivitas saat useEffect sesi diaktifkan untuk akun yang baru login
    lastActivityRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT) {
        logout(); // Terlogout otomatis & kembali ke menu overview (landing)
        setSessionExpiredNotice('inactivity');
      }
    };

    // Listen to user interaction events across the entire window
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

    // Evaluasi otomatis saat tab browser dibuka kembali setelah berada di background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Evaluasi berkala setiap 3 detik
    const intervalId = setInterval(checkInactivity, 3000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user, logout]);

  // Server menolak sesi (401) pada request apa pun yang memakai authFetch
  useEffect(() => {
    const onUnauthorized = () => {
      if (userRef.current) handleInvalidSession();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [handleInvalidSession]);

  // Access token diperbarui otomatis (tiap 15 menit): sinkronkan profil & batas sesi terbaru dari server
  useEffect(() => {
    const onSessionRefreshed = (event) => {
      const data = event.detail;
      if (!userRef.current || !data?.user) return;
      setUser(data.user);
      setSessionExpiresAt(data.expiresAt || null);
    };
    window.addEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed);
    return () => window.removeEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed);
  }, []);

  // Bersihkan sisa penyimpanan token/profil versi lama (sebelum migrasi ke cookie HttpOnly)
  useEffect(() => {
    try {
      ['gtm_token', 'gtm_user', 'token'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch { /* storage diblokir browser: abaikan */ }
  }, []);

  // Saat aplikasi dibuka: tanyakan ke server siapa yang login (cookie HttpOnly terkirim otomatis).
  // /api/auth/session selalu menjawab 200 dan sekaligus memperbarui sesi bila access token sudah habis.
  const sessionQuery = useQuery({
    queryKey: queryKeys.authSession,
    queryFn: () => fetchAuthSession(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  useEffect(() => {
    if (authChecked || !sessionQuery.isFetched) return;
    const data = sessionQuery.data;
    if (data?.authenticated && data.user) {
      setUser(data.user);
      setSessionExpiresAt(data.expiresAt || null);
    }
    // server tidak terjangkau: tampil sebagai pengunjung
    setAuthChecked(true);
  }, [authChecked, sessionQuery.isFetched, sessionQuery.data]);

  // Sesi login berlaku 7 hari sejak login: logout otomatis begitu batas sesi (dari server) habis
  useEffect(() => {
    if (!user || !sessionExpiresAt) return;
    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      handleInvalidSession();
      return;
    }
    // setTimeout maksimal ~24.8 hari; sesi 7 hari aman di bawah batas tersebut
    const timer = setTimeout(handleInvalidSession, Math.min(remaining, 2147483647));
    return () => clearTimeout(timer);
  }, [user, sessionExpiresAt, handleInvalidSession]);

  const value = useMemo(() => ({
    user,
    isAdmin: !!user && user.role === 'ADMIN',
    authChecked,
    sessionExpiresAt,
    login,
    logout,
    sessionExpiredNotice,
    setSessionExpiredNotice,
    lastLoginTimestamp
  }), [user, authChecked, sessionExpiresAt, login, logout, sessionExpiredNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return context;
}

```

---

