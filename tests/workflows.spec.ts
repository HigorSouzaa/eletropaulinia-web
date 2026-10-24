import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const api = 'http://127.0.0.1:5101/api';
const password = 'Synthetic-test-password-42';
async function login(page: Page, username: string) {
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill(username);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/ordens$/);
}
async function token(request: APIRequestContext, username = 'teste-a') {
    const response = await request.post(`${api}/auth/login`, { data: { username, password } });
    expect(response.status()).toBe(200);
    return (await response.json()).token as string;
}
async function createOrder(request: APIRequestContext, auth: string) {
    const response = await request.post(`${api}/v2/orders`, { headers: { Authorization: `Bearer ${auth}`, 'Idempotency-Key': randomUUID() }, data: {
        cliente: { nome: 'Cliente fluxo sintético', telefone: '19900000000' }, dataEntrada: '2026-10-24',
        equipamentos: ['Ventilador fluxo', 'Rádio fluxo', 'Ferro fluxo'].map(nome => ({ nome, marca: 'Marca sintética', solicitacao: { tipo: 'testar' } })),
    } });
    expect(response.status()).toBe(201);
    return (await response.json()).data as { _id: string; numero: string; equipamentos: { _id: string }[] };
}
async function removeOrder(request: APIRequestContext, id: string, auth: string) {
    const target = `${api}/v2/orders/${id}`;
    const latest = await request.get(target, { headers: { Authorization: `Bearer ${auth}` } });
    if (latest.status() === 404) return;
    const removed = await request.delete(target, { headers: { Authorization: `Bearer ${auth}`, 'If-Match': latest.headers()['etag'] } });
    expect(removed.status()).toBe(204);
}

test('edição, conflito, retirada parcial/completa e exclusão real', async ({ page, request }) => {
    const admin = await token(request);
    const order = await createOrder(request, admin);
    try {
        await login(page, 'teste-b');
        await page.goto(`/editar-ordem/${order._id}`);
        await expect(page.getByRole('heading', { name: `Editar ordem ${order.numero}` })).toBeVisible();
        for (const width of [360, 768, 1280]) {
            await page.setViewportSize({ width, height: 800 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (width === 360) await page.screenshot({ path: 'test-results/etapa04-edicao-mobile.png', fullPage: true });
        }
        const equipment = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Equipamento 1' }) });
        await equipment.getByLabel('Marca (opcional)').fill('');
        await equipment.getByRole('button', { name: 'Salvar equipamento' }).click();
        await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Alteração salva.' })).toBeVisible();
        await page.reload();
        await expect(page.locator('form').filter({ has: page.getByRole('heading', { name: 'Equipamento 1' }) }).getByLabel('Marca (opcional)')).toHaveValue('');
        const target = `${api}/v2/orders/${order._id}`;
        const current = await request.get(target, { headers: { Authorization: `Bearer ${admin}` } });
        const external = await request.patch(target, { headers: { Authorization: `Bearer ${admin}`, 'If-Match': current.headers()['etag'] }, data: { observacoes: 'Alteração externa sintética' } });
        expect(external.status()).toBe(200);
        await page.getByLabel('Nome do cliente *').fill('Rascunho preservado');
        await page.getByRole('button', { name: 'Salvar dados da ordem' }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'mudou enquanto você editava' })).toBeVisible();
        await expect(page.getByLabel('Nome do cliente *')).toHaveValue('Rascunho preservado');
        await page.getByRole('button', { name: 'Descartar meu rascunho' }).click();
        await page.goto(`/ordens/${order._id}`);
        for (const width of [360, 768, 1280]) {
            await page.setViewportSize({ width, height: 800 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (width === 360) await page.screenshot({ path: 'test-results/etapa04-detalhe-mobile.png', fullPage: true });
        }
        for (const name of ['Ventilador fluxo', 'Rádio fluxo', 'Ferro fluxo']) {
            await page.getByLabel(`Andamento de ${name}`).selectOption('Pronto');
        }
        const firstPickup = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /Ventilador fluxo/ }) }).getByRole('button', { name: 'Registrar retirada' });
        await firstPickup.click();
        await expect(page.getByRole('button', { name: 'Confirmar retirada' })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(firstPickup).toBeFocused();
        await firstPickup.click();
        await expect(page.getByRole('dialog')).toContainText('Ventilador fluxo');
        await page.getByRole('button', { name: 'Confirmar retirada' }).click();
        await expect(page.getByText('1 de 3 retirado(s)')).toBeVisible();
        await page.reload();
        await expect(page.getByText('1 de 3 retirado(s)')).toBeVisible();
        await expect(page.getByRole('article').filter({ has: page.getByRole('heading', { name: /Rádio fluxo/ }) })).toContainText('Na empresa');
        for (const name of ['Rádio fluxo', 'Ferro fluxo']) {
            await page.getByRole('article').filter({ has: page.getByRole('heading', { name: new RegExp(name) }) }).getByRole('button', { name: 'Registrar retirada' }).click();
            await page.getByRole('button', { name: 'Confirmar retirada' }).click();
        }
        await expect(page.getByText('3 de 3 retirado(s)')).toBeVisible();
        await expect(page.getByText(/^Entregue/)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Excluir OS' })).toHaveCount(0);
        await page.goto('/ordens'); await page.getByRole('button', { name: 'Sair' }).click();
        await expect(page).toHaveURL(/\/login$/);
        await login(page, 'teste-a');
        await page.goto(`/ordens/${order._id}`);
        await page.getByRole('button', { name: 'Excluir OS' }).click();
        await expect(page.getByLabel('Número da OS')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Excluir OS' })).toBeFocused();
        await page.getByRole('button', { name: 'Excluir OS' }).click();
        await page.getByLabel('Número da OS').fill(order.numero);
        await page.getByRole('button', { name: 'Excluir definitivamente' }).click();
        await expect(page).toHaveURL(/\/ordens$/);
        expect((await request.get(target, { headers: { Authorization: `Bearer ${admin}` } })).status()).toBe(404);
    } finally { await removeOrder(request, order._id, admin); }
});

test('admin gerencia funcionários e desativação revoga sessão anterior', async ({ page, request, browser }) => {
    await login(page, 'teste-a');
    await page.goto('/funcionarios');
    await expect(page.getByRole('heading', { name: 'Funcionários', exact: true })).toBeVisible();
    for (const width of [360, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width === 360) await page.screenshot({ path: 'test-results/etapa04-funcionarios-mobile.png', fullPage: true });
        if (width === 1280) await page.screenshot({ path: 'test-results/etapa04-funcionarios-desktop.png', fullPage: true });
    }
    const username = `func-${randomUUID().slice(0, 8)}`;
    await page.getByLabel('Nome *').fill('Funcionário sintético');
    await page.getByLabel('Usuário *').fill(username);
    await page.getByLabel('Senha inicial *').fill(password);
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Funcionário cadastrado' })).toBeVisible();
    await page.getByRole('article').filter({ hasText: username }).getByRole('button', { name: 'Gerenciar' }).click();
    await page.getByRole('region', { name: 'Editar funcionário' }).getByLabel('Nome').fill('Funcionário atualizado');
    await page.getByRole('button', { name: 'Salvar nome e perfil' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Dados do funcionário atualizados' })).toBeVisible();
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, username);
    await expect(otherPage.getByText('Ventilador de teste', { exact: true })).toBeVisible();
    page.once('dialog', dialog => void dialog.accept());
    await page.getByRole('button', { name: 'Desativar acesso' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'sessões anteriores foram invalidadas' })).toBeVisible();
    expect((await otherPage.request.get('/api/session/me')).status()).toBe(401);
    await other.close();
    page.once('dialog', dialog => void dialog.accept());
    await page.getByRole('button', { name: 'Reativar acesso' }).click();
    await expect(page.getByRole('button', { name: 'Desativar acesso' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Editar funcionário' })).toContainText('Acesso ativo');
    await page.getByLabel('Nova senha').fill('New-synthetic-password-43');
    await page.getByRole('button', { name: 'Redefinir senha' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Senha redefinida' })).toBeVisible();
    const newLogin = await request.post(`${api}/auth/login`, { data: { username, password: 'New-synthetic-password-43' } });
    expect(newLogin.status()).toBe(200);
});

test('não admin não acessa Funcionários nem altera conta', async ({ page, request }) => {
    await login(page, 'teste-b');
    await page.goto('/funcionarios');
    await expect(page).toHaveURL(/\/ordens$/);
    expect((await page.request.get('/api/employees')).status()).toBe(403);
    const staffToken = await token(request, 'teste-b');
    expect((await request.get(`${api}/v2/employees`, { headers: { Authorization: `Bearer ${staffToken}` } })).status()).toBe(403);
});
