import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from '@playwright/test';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gtm-monitor-backend');
process.loadEnvFile(path.join(backendDir, '.env'));

export const ADMIN = { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD };
export const USER = { username: process.env.E2E_USER_USERNAME, password: process.env.E2E_USER_PASSWORD };

// Tunggu halaman benar-benar diam: request selesai, font termuat, animasi indikator menu selesai
export async function settle(page, ms = 700) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

// Login lewat UI (halaman Overview → tombol login → form) — berlaku untuk kode lama maupun baru
export async function login(page, { username, password }) {
  await page.goto('/');
  await page.locator('#landing-login-btn').click();
  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[placeholder="••••••••••••"]').fill(password);
  await page.locator('#login-submit-btn').click();
  await expect(page.locator('.main-top-nav')).toBeVisible({ timeout: 30000 });
  await settle(page);
}

export async function logout(page) {
  await page.locator('.main-top-nav').getByRole('button').last().click();
  await page.getByRole('button', { name: 'Log Out' }).click();
  // Tunggu server selesai mencabut sesi (request logout berjalan di latar belakang)
  await Promise.all([
    page.waitForResponse(res => new URL(res.url()).pathname === '/api/auth/logout'),
    page.getByRole('button', { name: 'Ya, Log Out' }).click()
  ]);
  await expect(page.locator('#landing-login-btn')).toBeVisible();
}

export const navTab = (page, label) => page.locator('.main-top-nav').getByText(label, { exact: true });
