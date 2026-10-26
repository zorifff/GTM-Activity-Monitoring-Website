// Uji fungsional Fase 3: React Router (URL & guard per peran), TanStack Query (cache, dedup, refetch), virtualisasi tabel.
import { test, expect } from '@playwright/test';
import { ADMIN, USER, login, logout, settle, navTab } from './helpers.js';

test.describe.configure({ mode: 'serial' });

// Hitung request ke /api/data selama halaman terbuka
const countDataRequests = (page) => {
  const counter = { count: 0 };
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/data') counter.count++; });
  return counter;
};

test.describe('Router & guard: pengunjung', () => {
  for (const path of ['/dashboard', '/upload', '/admin', '/branch/SEMARANG', '/alamat-tidak-ada']) {
    test(`belum login membuka ${path} → Overview`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('#landing-login-btn')).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
    });
  }

  test('link lama #login dialihkan ke /login', async ({ page }) => {
    await page.goto('/#login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#login-submit-btn')).toBeVisible();
  });

  test('tombol login di Overview → /login', async ({ page }) => {
    await page.goto('/');
    await page.locator('#landing-login-btn').click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Router & guard: Admin', () => {
  test('URL tiap menu, halaman branch bisa di-refresh, Back/Forward, logout', async ({ page }) => {
    await login(page, ADMIN);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Detail →' }).first().click();
    await expect(page).toHaveURL(/\/branch\/[^/]+$/);
    const branchUrl = page.url();
    const branchName = decodeURIComponent(branchUrl.split('/branch/')[1]);

    // Halaman branch kini punya URL sendiri: tetap di branch yang sama setelah refresh
    await page.reload();
    await settle(page);
    await expect(page).toHaveURL(branchUrl);
    await expect(page.getByText(new RegExp(branchName, 'i')).first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goForward();
    await expect(page).toHaveURL(branchUrl);

    await navTab(page, 'ACTIVITY').click();
    await expect(page).toHaveURL(/\/upload$/);
    await navTab(page, 'CONTROL').click();
    await expect(page).toHaveURL(/\/admin$/);
    await navTab(page, 'MONITORING').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Sudah login: Overview, Login & alamat tak dikenal → Dashboard
    for (const path of ['/', '/login', '/alamat-tidak-ada']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
    // Link lama berbasis hash
    await page.goto('/#admin');
    await expect(page).toHaveURL(/\/admin$/);

    await logout(page);
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Router & guard: User branch', () => {
  test('tidak bisa membuka Control & detail branch; menu CONTROL tidak tampil', async ({ page }) => {
    await login(page, USER);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(navTab(page, 'CONTROL')).toHaveCount(0);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/branch/SEMARANG');
    await expect(page).toHaveURL(/\/dashboard$/);

    // Detail → di ranking tidak membuka halaman branch untuk akun non-admin
    await page.getByRole('button', { name: 'Detail →' }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await navTab(page, 'ACTIVITY').click();
    await expect(page).toHaveURL(/\/upload$/);
    await logout(page);
  });
});

test.describe('TanStack Query', () => {
  test('pindah menu memakai cache (tanpa request ulang /api/data); refetch saat tab aktif lagi setelah 60 detik', async ({ page }) => {
    await page.clock.install();
    const requests = countDataRequests(page);
    await login(page, ADMIN);
    expect(requests.count).toBe(1);

    for (const label of ['ACTIVITY', 'CONTROL', 'MONITORING', 'ACTIVITY']) {
      await navTab(page, label).click();
      await settle(page, 200);
    }
    expect(requests.count, 'tidak ada request /api/data tambahan saat pindah menu').toBe(1);

    // Data dianggap basi setelah 60 detik → diperbarui di latar belakang saat tab aktif kembali (tanpa layar loading)
    await page.clock.fastForward(61 * 1000);
    // TanStack Query v5 mendeteksi "tab aktif kembali" lewat event visibilitychange
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })));
    await expect.poll(() => requests.count, { timeout: 15000 }).toBe(2);
    await expect(page.getByText('Memuat data dari server')).toHaveCount(0);
  });
});

test.describe('Virtualisasi tabel proyek', () => {
  test('opsi "Semua proyek": semua baris dapat di-scroll, DOM hanya berisi baris yang terlihat', async ({ page }) => {
    await login(page, ADMIN);
    await navTab(page, 'CONTROL').click();
    await settle(page);

    const table = page.locator('.card').filter({ has: page.locator('.table-header') }).first();
    await table.getByRole('button', { name: '25 proyek' }).click();
    await table.getByText('Semua proyek', { exact: true }).click();
    await settle(page, 300);

    const footer = await table.locator('.table-pagination-footer').innerText();
    const total = Number(/dari\s+(\d+)\s+proyek/.exec(footer)[1]);
    expect(footer).toContain(`Menampilkan 1 - ${total} dari ${total} proyek`);
    expect(total).toBeGreaterThan(100);

    const renderedRows = await table.locator('.table-row').count();
    expect(renderedRows, `${renderedRows} baris dirender untuk ${total} proyek`).toBeLessThan(80);

    // Scroll ke bawah → baris terakhir ikut dirender
    const scroller = table.locator('> div').first();
    await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await settle(page, 300);
    const lastIndex = await table.locator('[data-index]').evaluateAll(els => Math.max(...els.map(e => Number(e.dataset.index))));
    expect(lastIndex).toBe(total - 1);
    expect(await table.locator('.table-row').count()).toBeLessThan(80);

    // Expand baris di mode virtual: baris ODP muncul & tinggi baris terukur ulang
    await scroller.evaluate(el => { el.scrollTop = 0; });
    await settle(page, 300);
    const firstRow = table.locator('.table-row').first();
    const before = await table.locator('[data-index="0"]').evaluate(el => el.getBoundingClientRect().height);
    await firstRow.locator('> div').first().click();
    await settle(page, 300);
    const after = await table.locator('[data-index="0"]').evaluate(el => el.getBoundingClientRect().height);
    expect(after).toBeGreaterThan(before);

    // Kembali ke 25 per halaman → tampilan paginasi biasa
    await table.getByRole('button', { name: 'Semua proyek' }).click();
    await table.getByText('25 proyek', { exact: true }).click();
    await expect(table.locator('.table-pagination-footer')).toContainText(`Menampilkan 1 - 25 dari ${total} proyek`);
  });
});
