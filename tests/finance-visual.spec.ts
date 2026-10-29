import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

const api = 'http://127.0.0.1:5101/api';

test('finanças agrupa indicadores e mostra despesas pagas por categoria', async ({ page, request }) => {
  const login = await request.post(`${api}/auth/login`, { data: { username: 'teste-a', password: 'Synthetic-test-password-42' } });
  expect(login.status()).toBe(200);
  const token = (await login.json()).token as string;
  try {
    for (const [category, amountCentavos] of [['energia', 4500], ['internet', 3000]] as const) {
      const created = await request.post(`${api}/v2/finance/expenses`, {
        headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': randomUUID() },
        data: { description: `Despesa ${category} sintética`, category, amountCentavos, state: 'pago' },
      });
      expect(created.status()).toBe(201);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill('teste-a');
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/ordens$/);
    await page.goto('/financas');
    await expect(page.getByRole('heading', { name: 'Dinheiro movimentado' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Valores previstos' })).toBeVisible();
    const chart = page.getByRole('region', { name: 'Indicadores' });
    await expect(chart.getByRole('heading', { name: 'Despesas pagas por categoria' })).toBeVisible();
    await expect(chart.getByRole('cell', { name: 'Energia' })).toBeVisible();
    await expect(chart.getByRole('cell', { name: 'Internet' })).toBeVisible();
    await expect(chart.getByRole('heading', { name: 'Despesas pagas', exact: true }).locator('..').getByText(/R\$\s?75,00/)).toBeVisible();
    await page.screenshot({ path: 'test-results/financas-primeira-tela-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: 'test-results/financas-primeira-tela-mobile.png', fullPage: true });
  } finally {
    expect((await request.post('http://127.0.0.1:5102/cleanup-finance-ledger')).status()).toBe(204);
  }
});
