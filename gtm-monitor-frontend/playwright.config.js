// Uji E2E & regresi tampilan (Playwright): npm run test:e2e
// Backend (port 3105, antrean uji QUEUE_PREFIX=gtm-test) menyajikan hasil build frontend (dist) — sama seperti produksi.
// Memakai Google Chrome yang terpasang di komputer (channel: 'chrome'), tidak perlu mengunduh browser Playwright.
import { defineConfig } from '@playwright/test';

export const E2E_PORT = 3105;

export default defineConfig({
  testDir: './e2e',
  timeout: 120 * 1000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    timeout: 15 * 1000,
    // Tampilan wajib identik dengan acuan (direkam dari kode sebelum refaktor)
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 }
  },
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node ../gtm-monitor-backend/server.js',
    url: `http://localhost:${E2E_PORT}/api/health`,
    env: { PORT: String(E2E_PORT), QUEUE_PREFIX: 'gtm-test' },
    reuseExistingServer: false,
    timeout: 60 * 1000
  }
});
