import { expect, test } from '@playwright/test';

test('admin vê estado local sem QR ou envio; funcionário não abre QR', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuário', { exact: true }).fill('teste-a');
  await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('region', { name: 'Estado do WhatsApp' })).toContainText(/Não configurado neste ambiente|Desligado/);
  await page.getByRole('link', { name: 'WhatsApp' }).click();
  await expect(page.getByRole('heading', { name: 'WhatsApp', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /QR Code/ })).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: 'test-results/whatsapp-local-first-slice.png', fullPage: true });
  const denied = await page.request.get('/api/whatsapp/qr');
  expect(denied.status()).toBe(404);
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.getByLabel('Usuário', { exact: true }).fill('teste-b');
  await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('region', { name: 'Estado do WhatsApp' })).toContainText(/Não configurado neste ambiente|Desligado/);
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveCount(0);
  expect((await page.request.get('/api/whatsapp/qr')).status()).toBe(403);
});
