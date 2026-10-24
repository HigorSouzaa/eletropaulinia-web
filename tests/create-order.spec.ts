import { test, expect } from '@playwright/test';

test('funcionário cria três equipamentos e consulta a OS real por URL após recarga', async ({ page, request }) => {
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill('teste-b');
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/ordens$/);
    await page.getByRole('link', { name: 'Nova ordem' }).click();
    for (const width of [360, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByLabel('Nome *').fill('Cliente de teste da etapa 04');
    await page.getByLabel('Telefone *').fill('19900000000');
    const first = page.getByRole('group', { name: 'Equipamento 1' });
    await first.getByLabel('Identificação *').fill('Ventilador de teste novo');
    await first.getByLabel('Defeito relatado *').fill('Não liga');
    await page.getByRole('button', { name: 'Adicionar equipamento' }).click();
    const second = page.getByRole('group', { name: 'Equipamento 2' });
    await second.getByLabel('Identificação *').fill('Rádio sem marca');
    await second.getByLabel('Solicitação').selectOption('testar');
    await page.getByRole('button', { name: 'Adicionar equipamento' }).click();
    const third = page.getByRole('group', { name: 'Equipamento 3' });
    await third.getByLabel('Identificação *').fill('Ferro de passar');
    await third.getByLabel('Marca (opcional)').fill('Marca sintética');
    await third.getByLabel('Defeito relatado *').fill('Aquecimento intermitente');
    await page.getByRole('button', { name: 'Salvar ordem' }).click();
    await expect(page).toHaveURL(/\/ordens\/[a-f0-9]{24}$/);
    await expect(page.getByRole('heading', { name: /^Ordem OS-/ })).toBeVisible();
    await expect(page.getByText('Cliente de teste da etapa 04')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Rádio sem marca/ })).toBeVisible();
    await expect(page.getByText('Testar', { exact: true })).toBeVisible();
    await expect(page.getByText('Marca sintética')).toBeVisible();
    const url = page.url();
    await page.reload();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { name: /Ventilador de teste novo/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ferro de passar/ })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar às ordens' }).click();
    await expect(page.getByText('Cliente de teste da etapa 04')).toBeVisible();
    // Limpeza somente no Mongo descartável do runner, pela API administrativa real.
    const id = new URL(url).pathname.split('/').at(-1)!;
    const login = await request.post('http://127.0.0.1:5101/api/auth/login', { data: { username: 'teste-a', password: 'Synthetic-test-password-42' } });
    expect(login.ok()).toBe(true);
    const { token } = await login.json();
    const target = `http://127.0.0.1:5101/api/v2/orders/${id}`;
    const current = await request.get(target, { headers: { Authorization: `Bearer ${token}` } });
    expect(current.ok()).toBe(true);
    const removed = await request.delete(target, { headers: { Authorization: `Bearer ${token}`, 'If-Match': current.headers()['etag'] } });
    expect(removed.status()).toBe(204);
});

test('transporte de criação exige sessão e origem permitida', async ({ request }) => {
    const key = 'synthetic-attempt-key-42';
    const data = { cliente: { nome: 'Sintético', telefone: '19900000000' }, dataEntrada: '2026-10-24', equipamentos: [{ nome: 'Teste', solicitacao: { tipo: 'testar' } }] };
    const denied = await request.post('/api/orders', { data, headers: { Origin: 'http://127.0.0.1:3100', 'Idempotency-Key': key } });
    expect(denied.status()).toBe(401);
    const csrf = await request.post('/api/orders', { data, headers: { Origin: 'https://invalid.example', 'Idempotency-Key': key } });
    expect(csrf.status()).toBe(403);
});
