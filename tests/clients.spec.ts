import { randomUUID } from 'node:crypto';
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const api = 'http://127.0.0.1:5101/api';
const origin = 'http://127.0.0.1:3100';
async function login(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill('teste-b');
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/ordens$/);
    await page.goto('/nova-ordem');
}
async function admin(request: APIRequestContext) {
    const response = await request.post(`${api}/auth/login`, { data: { username: 'teste-a', password: 'Synthetic-test-password-42' } });
    expect(response.status()).toBe(200);
    return (await response.json()).token as string;
}
async function remove(request: APIRequestContext, ids: string[], token: string) {
    for (const id of ids) {
        const url = `${api}/v2/orders/${id}`;
        const current = await request.get(url, { headers: { Authorization: `Bearer ${token}` } });
        expect(current.status()).toBe(200);
        expect((await request.delete(url, { headers: { Authorization: `Bearer ${token}`, 'If-Match': current.headers()['etag'] } })).status()).toBe(204);
    }
}
async function seed(request: APIRequestContext, token: string, telefone: string, nome: string) {
    const response = await request.post(`${api}/v2/orders`, { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': randomUUID() },
        data: { cliente: { nome, telefone }, dataEntrada: '2026-10-27', equipamentos: [{ nome: 'Equipamento sintético', solicitacao: { tipo: 'testar' } }] } });
    expect(response.status()).toBe(201);
    return (await response.json()).data;
}
async function equipment(page: Page, name: string) {
    await page.getByLabel('Identificação *').fill(name);
    await page.getByLabel('Solicitação').selectOption('testar');
}
async function save(page: Page) {
    await page.getByRole('button', { name: 'Salvar ordem', exact: true }).click();
    await expect(page).toHaveURL(/\/ordens\/[a-f\d]{24}$/);
    const id = new URL(page.url()).pathname.split('/').at(-1)!;
    const read = await page.request.get(`/api/orders/${id}`);
    expect(read.status()).toBe(200);
    return (await read.json()).data;
}

test('telefone primeiro: cria cliente e duas OS reais, preenche cadastro e preserva vínculo após recarga', async ({ page, request }) => {
    const token = await admin(request), ids: string[] = [];
    try {
        await login(page);
        expect(await page.locator('form input').first().getAttribute('type')).toBe('tel');
        await page.getByLabel('Telefone *').fill('+55 (19) 90000-0211');
        await expect(page.getByLabel('Telefone *')).toHaveValue('(19) 90000-0211');
        await expect(page.getByRole('status')).toContainText('Cliente não encontrado');
        await page.getByLabel('Nome *').fill('Pessoa sintética da jornada');
        await page.getByLabel('E-mail (opcional)').fill('jornada@example.invalid');
        await equipment(page, 'Equipamento da primeira OS');
        const first = await save(page); ids.push(first._id);
        expect(first.clienteId).toMatch(/^[a-f\d]{24}$/);
        await page.reload();
        await expect(page.getByText('Pessoa sintética da jornada', { exact: true })).toBeVisible();
        await expect(page.getByText('(19) 90000-0211', { exact: true })).toBeVisible();
        await page.goto('/nova-ordem');
        await page.getByLabel('Telefone *').fill('19900000211');
        await expect(page.getByRole('status')).toContainText('Cliente encontrado');
        await expect(page.getByLabel('Nome *')).toHaveValue('Pessoa sintética da jornada');
        await expect(page.getByLabel('Nome *')).toHaveAttribute('readonly', '');
        await expect(page.getByLabel('E-mail (opcional)')).toHaveValue('jornada@example.invalid');
        for (const width of [360, 768, 1280]) {
            await page.setViewportSize({ width, height: 800 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.screenshot({ path: `test-results/clientes-telefone-${width}.png`, fullPage: true });
        }
        await equipment(page, 'Equipamento da segunda OS');
        const second = await save(page); ids.push(second._id);
        expect(second.clienteId).toBe(first.clienteId); expect(second._id).not.toBe(first._id);
        await page.reload();
        const read = await page.request.get(`/api/orders/${second._id}`);
        expect((await read.json()).data.clienteId).toBe(first.clienteId);
        // Snapshot is not an alternative path for changing a master customer.
        const denied = await page.request.patch(`/api/orders/${first._id}`, { headers: { Origin: origin, 'If-Match': '"os-' + first._id + '-v1"' }, data: { cliente: { nome: 'Alteração indevida' } } });
        expect(denied.status()).toBe(409);
    } finally { await remove(request, ids, token); }
});

test('resposta atrasada de outro telefone não preenche o cliente atual', async ({ page, request }) => {
    const token = await admin(request);
    const a = await seed(request, token, '19900000221', 'Pessoa sintética A atrasada');
    const b = await seed(request, token, '19900000222', 'Pessoa sintética B atual');
    let release!: () => void, began!: () => void, ended!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { began = resolve; });
    const finished = new Promise<void>(resolve => { ended = resolve; });
    try {
        await login(page);
        // Only delivery timing is intercepted; response body comes from the real API.
        await page.route('**/api/clients/lookup', async route => {
            if (route.request().postDataJSON().telefone !== '+5519900000221') return route.continue();
            const response = await route.fetch(); began(); await gate;
            try { await route.fulfill({ response }); } finally { ended(); }
        });
        await page.getByLabel('Telefone *').fill('19900000221'); await started;
        await page.getByLabel('Telefone *').fill('19900000222');
        await expect(page.getByLabel('Nome *')).toHaveValue('Pessoa sintética B atual');
        release(); await finished;
        await expect(page.getByLabel('Nome *')).toHaveValue('Pessoa sintética B atual');
        await page.getByLabel('Telefone *').fill('19900');
        await expect(page.getByLabel('Nome *')).toHaveValue('');
        await expect(page.getByRole('button', { name: 'Salvar ordem', exact: true })).toBeDisabled();
    } finally { release(); await remove(request, [a._id, b._id], token); }
});

test('falha de lookup não vira cadastro novo; máscara permite teclado, edição e número inválido sem truncar', async ({ page }) => {
    await login(page);
    await page.route('**/api/clients/lookup', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    const phone = page.getByLabel('Telefone *');
    await phone.pressSequentially('19900000231');
    await expect(phone).toHaveValue('(19) 90000-0231');
    await expect(page.getByRole('status')).toContainText('Não foi possível consultar');
    await expect(page.getByRole('button', { name: 'Salvar ordem', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Nome *')).toHaveAttribute('readonly', '');
    await page.unroute('**/api/clients/lookup');
    await page.getByRole('button', { name: 'Tentar consulta novamente' }).click();
    await expect(page.getByRole('status')).toContainText('Cliente não encontrado');
    await page.getByLabel('Nome *').fill('Rascunho sintético');
    await phone.focus(); await phone.press('End'); await phone.press('Backspace');
    await expect(phone).toHaveValue('(19) 9000-0023');
    await expect(page.getByLabel('Nome *')).toHaveValue('');
    await phone.fill('199000002311');
    await expect(phone).toHaveValue('199000002311');
    await expect(page.getByRole('status')).toContainText('Confira o telefone');
    await phone.fill('(19) 90000-0231');
    await phone.evaluate((element: HTMLInputElement) => element.setSelectionRange(11, 11));
    await phone.press('Backspace');
    expect((await phone.inputValue()).replace(/\D/g, '')).toHaveLength(10);
});

test('resposta de criação perdida após commit repete a mesma chave sem duplicar OS ou cliente', async ({ page, request }) => {
    const token = await admin(request), ids: string[] = [], keys: string[] = [];
    try {
        await login(page);
        await page.getByLabel('Telefone *').fill('19900000241');
        await expect(page.getByRole('status')).toContainText('Cliente não encontrado');
        await page.getByLabel('Nome *').fill('Pessoa sintética de resposta perdida');
        await equipment(page, 'Equipamento para retry real');
        await page.route('**/api/orders', async route => {
            if (route.request().method() !== 'POST') return route.continue();
            keys.push(route.request().headers()['idempotency-key']);
            if (keys.length > 1) return route.continue();
            const committed = await route.fetch();
            expect(committed.status()).toBe(201); ids.push((await committed.json()).data._id);
            await route.abort('failed'); // Simulates only a lost response, after a real commit.
        });
        await page.getByRole('button', { name: 'Salvar ordem', exact: true }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'Seus dados foram mantidos' })).toBeVisible();
        await expect(page.getByLabel('Nome *')).toHaveValue('Pessoa sintética de resposta perdida');
        const replayed = await save(page);
        expect(replayed._id).toBe(ids[0]); expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
        const list = await page.request.get('/api/orders?q=Pessoa%20sint%C3%A9tica%20de%20resposta%20perdida');
        expect((await list.json()).meta.total).toBe(1);
    } finally { await remove(request, ids, token); }
});

test('lookup exige origem/sessão e troca de conta elimina os campos do cadastro anterior', async ({ page, request }) => {
    const denied = await request.post('/api/clients/lookup', { headers: { Origin: origin }, data: { telefone: '19900000251' } });
    expect(denied.status()).toBe(401);
    await login(page);
    const csrf = await page.request.post('/api/clients/lookup', { headers: { Origin: 'https://invalid.example' }, data: { telefone: '19900000251' } });
    expect(csrf.status()).toBe(403);
    await page.getByLabel('Telefone *').fill('19900000251');
    await expect(page.getByRole('status')).toContainText('Cliente não encontrado');
    await page.getByLabel('Nome *').fill('Rascunho de outra sessão');
    await page.evaluate(() => { const channel = new BroadcastChannel('ep-session'); channel.postMessage('changed'); channel.close(); });
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Nome *')).toHaveCount(0);
});

test('área Clientes lista histórico real e limita edição ao administrador', async ({ page, request }) => {
 const auth = await admin(request), ids: string[] = [];
 try {
  const order = await seed(request, auth, '19900000301', 'Cliente área sintético'); ids.push(order._id);
  await login(page); await page.goto(`/clientes/${order.clienteId}`);
  await expect(page.getByRole('link', { name: order.numero, exact: true })).toBeVisible();
  await expect(page.getByLabel('Nome *')).toHaveAttribute('readonly', '');
  const read = await page.request.get(`/api/clients/${order.clienteId}`);
  expect((await page.request.patch(`/api/clients/${order.clienteId}`, { headers: { Origin: origin, 'If-Match': read.headers()['etag'] }, data: { nome: 'Não autorizado' } })).status()).toBe(403);
  await page.goto('/login'); await page.getByLabel('Usuário', { exact: true }).fill('teste-a'); await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/ordens$/); await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await page.getByLabel('Buscar nome ou telefone').fill('19900000301'); await page.getByRole('link', { name: 'Cliente área sintético', exact: true }).click();
  await page.getByLabel('Nome *').fill('Cliente corrigido sintético'); await page.getByLabel('Telefone *').fill('19900000302');
  await page.getByRole('button', { name: 'Salvar cadastro' }).click(); await expect(page.getByRole('status')).toContainText('Cadastro atualizado');
  await page.reload(); await expect(page.getByLabel('Nome *')).toHaveValue('Cliente corrigido sintético'); await page.setViewportSize({ width: 360, height: 780 }); await page.screenshot({ path: 'test-results/clientes-cadastro-360.png', fullPage: true });
  await page.getByRole('link', { name: order.numero, exact: true }).click(); await expect(page.getByText('Cliente área sintético', { exact: true })).toBeVisible();
 } finally { await remove(request, ids, auth); }
});

test('laudo, serviços, técnico e retorno opcional persistem na jornada real', async ({ page, request }) => {
 const auth = await admin(request), ids: string[] = [];
 try {
  await login(page); await page.getByLabel('Telefone *').fill('19900000311'); await expect(page.getByRole('status')).toContainText('Cliente não encontrado');
  await page.getByLabel('Nome *').fill('Cliente retorno sintético'); await equipment(page, 'Equipamento de retorno');
  await page.getByRole('combobox', { name: 'Técnico (opcional)', exact: true }).selectOption({ label: 'Funcionário A' });
  await page.getByLabel('Laudo técnico (opcional)').fill('Trocar componente sintético');
  await page.getByRole('button', { name: 'Adicionar serviço', exact: true }).click(); await page.getByLabel('Serviço 1', { exact: true }).fill('Mão de obra'); await page.getByLabel('Valor em R$').fill('12,34');
  const first = await save(page); ids.push(first._id); expect(first.equipamentos[0].avaliacao.totalCentavos).toBe(1234); expect(first.tecnicoId).toBeTruthy();
  await page.reload(); await expect(page.getByText('Trocar componente sintético', { exact: true })).toBeVisible();
  const read = await request.get(`${api}/v2/orders/${first._id}`, { headers: { Authorization: `Bearer ${auth}` } });
  const pickup = await request.put(`${api}/v2/orders/${first._id}/equipamentos/${first.equipamentos[0]._id}/retirada`, { headers: { Authorization: `Bearer ${auth}`, 'If-Match': read.headers()['etag'] }, data: {} }); expect(pickup.status()).toBe(200);
  await page.goto('/nova-ordem'); await page.getByLabel('Telefone *').fill('19900000311'); await expect(page.getByRole('status')).toContainText('Cliente encontrado');
  await page.getByLabel('Tipo de atendimento').selectOption('retorno');
  await expect(page.getByLabel('Atendimento anterior (opcional)').locator('option')).toHaveCount(2);
  await page.getByLabel('Atendimento anterior (opcional)').selectOption(`${first._id}/${first.equipamentos[0]._id}`);
  await page.getByLabel('Solicitação').selectOption('testar');
  const second = await save(page); ids.push(second._id); expect(second.tipoAtendimento).toBe('retorno'); expect(second.equipamentos[0].garantia.situacao).toBe('dentro');
  await expect(page.getByText('Dentro da referência de 90 dias', { exact: true })).toBeVisible(); await page.setViewportSize({ width: 360, height: 780 }); await page.screenshot({ path: 'test-results/retorno-360.png', fullPage: true });
  await page.getByRole('link', { name: 'Editar', exact: true }).click(); await page.getByLabel('Laudo técnico (opcional)').first().fill('Reavaliado'); await page.getByRole('button', { name: 'Salvar equipamento', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Alteração salva'); await page.reload(); await expect(page.getByLabel('Laudo técnico (opcional)').first()).toHaveValue('Reavaliado');
  await page.goto('/login'); await page.getByLabel('Usuário', { exact: true }).fill('teste-a'); await page.getByLabel('Senha', { exact: true }).fill('Synthetic-test-password-42'); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page).toHaveURL(/\/ordens$/);
  await page.goto(`/ordens/${first._id}`); await page.getByText('Atualizar garantia — administrador', { exact: true }).click();
  await page.getByLabel('Nova data final da garantia').fill('2027-12-31'); await page.getByLabel('Motivo da atualização').fill('Extensão autorizada para ensaio sintético');
  const savedWarranty = page.waitForResponse(r => r.url().endsWith('/garantia') && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Registrar atualização da garantia' }).click(); expect((await savedWarranty).status()).toBe(200);
  await page.reload(); await page.getByText('Histórico de ajustes de garantia', { exact: true }).click(); await expect(page.getByText(/Extensão autorizada para ensaio sintético/)).toBeVisible();

 } finally { await remove(request, ids.reverse(), auth); }
});

test('responsável textual histórico é preservado até escolher explicitamente Sem técnico', async ({ page }) => {
 await login(page);
 const list = await page.request.get('/api/orders?q=Cliente%20v2%200'); const row = (await list.json()).data[0];
 await page.goto(`/editar-ordem/${row._id}`);
 const select = page.getByRole('combobox', { name: /^Técnico \(opcional\)/ });
 await expect(select).toHaveValue('legacy');
 await page.getByLabel('Observações (opcional)').fill('Mantendo responsável histórico');
 await page.getByRole('button', { name: 'Salvar dados da ordem' }).click(); await expect(page.getByRole('status')).toContainText('Alteração salva');
 expect((await (await page.request.get(`/api/orders/${row._id}`)).json()).data.tecnico).toBe('Técnico histórico sintético');
 await select.selectOption(''); await page.getByRole('button', { name: 'Salvar dados da ordem' }).click(); await expect(select).toHaveValue('');
 await expect.poll(async () => (await (await page.request.get(`/api/orders/${row._id}`)).json()).data.tecnico).toBeNull();
});
