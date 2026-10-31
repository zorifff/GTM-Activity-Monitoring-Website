// Regresi tampilan: setiap halaman & keadaan penting dibandingkan piksel-per-piksel dengan acuan di e2e/__screenshots__/
// (direkam dari kode SEBELUM refaktor Fase 3). Rekam ulang acuan: npm run test:e2e -- --update-snapshots
// Navigasi sengaja lewat klik UI (bukan URL) agar skenario yang sama berlaku untuk kode lama & baru.
import { test, expect } from '@playwright/test';
import { ADMIN, USER, login, logout, settle, navTab, waitForCaptcha } from './helpers.js';

const shot = (page, name, options = {}) => expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, ...options });

test.describe.configure({ mode: 'serial' });

test.describe('Pengunjung (belum login)', () => {
  test('overview & login', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await shot(page, '01-landing');
    await page.locator('#landing-login-btn').click();
    await settle(page);
    // Isi iframe captcha milik Cloudflare (animasi, teks bahasa) tidak deterministik → area widget ditutup mask
    await waitForCaptcha(page);
    await shot(page, '02-login', { mask: [page.locator('.cf-turnstile')] });
  });
});

test.describe('Admin', () => {
  test('dashboard, branch, tabel proyek & review', async ({ page }) => {
    await login(page, ADMIN);
    await shot(page, '10-admin-dashboard');

    // Detail branch pertama di ranking
    await page.getByRole('button', { name: 'Detail →' }).first().click();
    await settle(page);
    await shot(page, '11-admin-branch');

    // Baris proyek pertama di-expand (baris ODP)
    await page.locator('.table-row').first().locator('> div').first().click();
    await settle(page, 400);
    await shot(page, '12-admin-branch-expanded');

    // Modal review proyek
    await page.getByRole('button', { name: 'Review', exact: true }).first().click();
    await settle(page, 400);
    await shot(page, '13-admin-review-modal', { fullPage: false });
    await page.getByRole('button', { name: '✕' }).first().click();
  });

  test('activity, control, program & cek pairing', async ({ page }) => {
    await login(page, ADMIN);
    await navTab(page, 'ACTIVITY').click();
    await settle(page);
    await shot(page, '20-admin-activity');

    await navTab(page, 'CONTROL').click();
    await settle(page);
    await shot(page, '21-admin-control-monitoring');
    await page.getByRole('button', { name: 'Update Data Mingguan' }).click();
    await settle(page);
    await shot(page, '22-admin-control-excel');

    await page.locator('.main-top-nav').getByText('PROGRAM', { exact: true }).click();
    await settle(page, 400);
    await shot(page, '23-admin-program-dropdown', { fullPage: false });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 450);

    await page.locator('.main-top-nav').getByText('CEK PAIRING', { exact: true }).click();
    await settle(page, 400);
    await shot(page, '24-admin-cek-pairing', { fullPage: false });
    await page.mouse.click(5, 450);

    await page.locator('.main-top-nav').getByRole('button').last().click();
    await settle(page, 300);
    await shot(page, '25-admin-profile-menu', { fullPage: false });
    await page.getByRole('button', { name: 'Log Out' }).click();
    await settle(page, 300);
    await shot(page, '26-admin-logout-confirm', { fullPage: false });
    await page.getByRole('button', { name: 'Ya, Log Out' }).click();
    await settle(page);
    await shot(page, '27-after-logout');
  });
});

test.describe('User branch', () => {
  test('dashboard & activity (hanya branch sendiri)', async ({ page }) => {
    await login(page, USER);
    await shot(page, '30-user-dashboard');
    await navTab(page, 'ACTIVITY').click();
    await settle(page);
    await shot(page, '31-user-activity');
    await logout(page);
  });
});

test.describe('Tampilan ponsel', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('overview, dashboard & activity', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await shot(page, '40-mobile-landing');
    await login(page, ADMIN);
    await shot(page, '41-mobile-dashboard');
    // Menu ponsel memiliki animasi CSS berkelanjutan → klik tanpa menunggu elemen "diam"
    await navTab(page, 'ACTIVITY').click({ force: true });
    await settle(page);
    await shot(page, '42-mobile-activity', { fullPage: false }); // halaman penuh di lebar ponsel sangat panjang
  });
});
