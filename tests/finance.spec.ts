import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

const api = 'http://127.0.0.1:5101/api';
test('admin confirma um equipamento; receita não inclui retirada do outro', async ({ page, request }) => {
  const login = await request.post(`${api}/auth/login`, { data: { username: 'teste-a', password: 'Synthetic-test-password-42' } });
  expect(login.status()).toBe(200);
  const token = (await login.json()).token as string;
  const created = await request.post(`${api}/v2/orders`, { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': randomUUID() }, data: {
    cliente: { nome: 'Pessoa financeira sintética', telefone: '19900000943' }, dataEntrada: '2026-10-28',
    equipamentos: [
      { nome: 'Rádio financeiro', solicitacao: { tipo: 'testar' }, avaliacao: { laudo: 'Teste', servicos: [{ descricao: 'Reparo', valorCentavos: 12000 }] } },
      { nome: 'Ventilador financeiro', solicitacao: { tipo: 'testar' }, avaliacao: { laudo: 'Teste', servicos: [{ descricao: 'Troca', valorCentavos: 8000 }] } },
    ],
  } });
  expect(created.status()).toBe(201);
  const order = (await created.json()).data;
  try {
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill('teste-a');
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/ordens/${order._id}`);
    const first = page.getByRole('article').filter({ hasText: 'Rádio financeiro' });
    await expect(first.getByText('Consultando pagamento...')).toBeHidden();
    await first.getByLabel('Valor recebido (R$)').fill('120,00');
    await first.getByLabel('Forma de pagamento (opcional)').selectOption('pix');
    await first.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(first.getByText(/Recebido: R\$\s?120,00/)).toBeVisible();
    await page.goto('/financas');
    await expect(page.getByRole('heading', { name: 'Finanças' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Indicadores' }).getByText(/R\$\s?120,00/).first()).toBeVisible();
    const latest = await request.get(`${api}/v2/orders/${order._id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(latest.status()).toBe(200);
    const pickup = await request.put(`${api}/v2/orders/${order._id}/equipamentos/${order.equipamentos[1]._id}/retirada`, { headers: { Authorization: `Bearer ${token}`, 'If-Match': latest.headers()['etag'] }, data: {} });
    expect(pickup.status()).toBe(200);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Indicadores' }).getByText(/R\$\s?120,00/).first()).toBeVisible();
  } finally {
    expect((await request.post(`http://127.0.0.1:5102/cleanup-finance-test/${order._id}`)).status()).toBe(204);
  }
});

test('admin registra despesa paga e mensalidade prevista sem somar previsão às saídas', async ({ page, request }) => {
  try {
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill('teste-a');
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/financas');
    await expect(page.getByRole('heading', { name: 'Finanças' })).toBeVisible();
    await page.getByRole('button', { name: 'Despesas', exact: true }).click();
    const form = page.locator('form').first();
    await form.getByLabel('Descrição').fill('Energia financeira sintética');
    await form.getByLabel('Valor (R$)').fill('45,00');
    await form.getByLabel('Situação').selectOption('pago');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('status').getByText('Alteração registrada.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Indicadores' }).getByText(/R\$\s?45,00/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Recorrências' }).click();
    await form.getByLabel('Descrição').fill('Internet financeira sintética');
    await form.getByLabel('Valor (R$)').fill('80,00');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Internet financeira sintética').first()).toBeVisible();
    await page.getByRole('button', { name: 'Gerar competências até este mês' }).click();
    await page.getByRole('button', { name: 'Despesas', exact: true }).click();
    await expect(page.getByText('Internet financeira sintética').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Indicadores' }).getByText(/R\$\s?45,00/).first()).toBeVisible();
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { expect((await request.post('http://127.0.0.1:5102/cleanup-finance-ledger')).status()).toBe(204); }
});
