import { test, expect } from '@playwright/test';
async function login(page: import('@playwright/test').Page, username = 'teste-a') {
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill(username);
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/ordens$/);
    await expect(page.getByText('Ventilador de teste', { exact: true })).toBeVisible();
}
test('URL protegida, login inválido, lista real, recarga, cookie e logout revogado', async ({ page, context, request }) => {
    await page.goto('/ordens');
    await expect(page).toHaveURL(/\/login$/);
    await page.screenshot({ path: 'test-results/login.png', fullPage: true });
    await page.getByLabel('Usuário', { exact: true }).fill('teste-a');
    await page.getByLabel('Senha', { exact: true }).fill('incorreta');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Usuário ou senha inválidos');
    await login(page);
    await expect(page.getByText('Olá, Funcionário A')).toBeVisible();
    await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
    await page.reload();
    await expect(page.getByText('Cliente sintético', { exact: true })).toBeVisible();
    const cookie = (await context.cookies()).find(c => c.name === 'ep_session')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    expect(await page.evaluate(() => document.cookie.includes('ep_session'))).toBe(false);
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    const reuse = await request.get('http://127.0.0.1:5101/api/orders', { headers: { Authorization: 'Bearer ' + cookie.value } });
    expect(reuse.status()).toBe(401);
    await login(page, 'teste-b');
    await expect(page.getByText('Olá, Funcionário B')).toBeVisible();
    await expect(page.getByText('Olá, Funcionário A')).toHaveCount(0);
});
test('CSRF negado e dados sem cache público', async ({ page, request }) => {
    expect((await request.post('/api/session/login', { data: { username: 'teste-a', password: 'Synthetic-test-password-42' }, headers: { Origin: 'https://invalid.example' } })).status()).toBe(403);
    expect((await request.post('/api/session/login', { data: { username: 'x'.repeat(5000), password: 'x' }, headers: { Origin: 'http://127.0.0.1:3100' } })).status()).toBe(413);
    await login(page);
    const response = await page.request.get('/api/orders');
    expect(response.headers()['cache-control']).toContain('no-store');
    expect((await response.json()).length).toBeGreaterThan(0);
});
test('erro de consulta e nova tentativa; vazio sem confundir erro', async ({ page }) => {
    await login(page);
    // Falhas/vazio simulados no transporte; login e cenário principal usam banco real.
    await page.route('**/api/orders', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível carregar');
    await page.unroute('**/api/orders');
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('Ventilador de teste', { exact: true })).toBeVisible();
    await page.route('**/api/orders', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(page.getByText('Nenhuma ordem cadastrada.')).toBeVisible();
});
test('401 e troca de sessão entre abas removem dados anteriores', async ({ page, context }) => {
    await login(page);
    const other = await context.newPage();
    await other.goto('/ordens');
    await expect(other.getByText('Ventilador de teste', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(other).toHaveURL(/\/login$/);
    await login(page);
    await page.route('**/api/session/me', r => r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Cliente sintético', { exact: true })).toHaveCount(0);
});
test('mobile, navegação, busca e páginas pendentes', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible();
    await page.getByLabel('Buscar nas ordens carregadas').fill('inexistente');
    await expect(page.getByText('Nenhuma ordem corresponde à busca.')).toBeVisible();
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
    await page.goto('/nova-ordem');
    await expect(page.getByRole('heading', { name: 'Cadastro temporariamente indisponível' })).toBeVisible();
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});
test('API realmente indisponível não vira erro de credencial; sessão preservada no retry', async ({ page, request }) => {
    await login(page);
    await request.post('http://127.0.0.1:5102/stop');
    try {
        await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
        await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível verificar');
        await expect(page).toHaveURL(/\/ordens$/);
        await page.getByRole('button', { name: 'Sair', exact: true }).click();
        await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível encerrar');
        expect((await page.context().cookies()).some(c => c.name === 'ep_session')).toBe(true);
    }
    finally {
        await request.post('http://127.0.0.1:5102/start');
    }
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('Ventilador de teste', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await request.post('http://127.0.0.1:5102/stop');
    try {
        await page.getByLabel('Usuário', { exact: true }).fill('teste-a');
        await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
        await page.getByRole('button', { name: 'Entrar', exact: true }).click();
        await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível entrar');
    }
    finally {
        await request.post('http://127.0.0.1:5102/start');
    }
});
