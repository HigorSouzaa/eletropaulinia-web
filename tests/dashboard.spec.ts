import { expect, test } from '@playwright/test';

test('Dashboard usa contagens reais e abre Ordens com o status escolhido', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuário', { exact: true }).fill('teste-a');
  await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/ordens$/);
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('27 ordem(ns) no total')).toBeVisible();
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(5);
  await page.screenshot({ path: 'test-results/dashboard-primeira-desktop.png', fullPage: true });
  await page.getByRole('link', { name: /Pronto.*Ver ordens/ }).click();
  await expect(page).toHaveURL(/\/ordens\?status=Pronto$/);
  await expect(page.getByLabel('Filtrar status')).toHaveValue('Pronto');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/dashboard-primeira-mobile.png', fullPage: true });
});
