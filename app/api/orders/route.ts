import { authenticated, clearSession, expressRequest, json, readJsonBody, sessionToken, validOrigin } from '../../../web/server/api';
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const allowed = ['q', 'status', 'entrega', 'clienteId', 'page', 'pageSize', 'sort', 'direction'];
    if ([...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1)) return json({ message: 'Consulta inválida' }, 400);
    return authenticated(`/v2/orders?${params.toString()}`);
}
export async function POST(request: Request) {
    if (!validOrigin(request)) return json({ message: 'Origem não permitida' }, 403);
    const key = request.headers.get('idempotency-key');
    if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return json({ message: 'Tentativa inválida' }, 400);
    const token = await sessionToken();
    if (!token) return clearSession(json({ message: 'Autenticação necessária' }, 401));
    let body;
    try { body = await readJsonBody(request, 512 * 1024); }
    catch (error) { return json({ message: 'Requisição inválida' }, error instanceof Error && error.message === 'LIMIT' ? 413 : 400); }
    const upstream = await expressRequest('/v2/orders', token, body, { 'Idempotency-Key': key });
    if (upstream.status === 401) return clearSession(json({ message: 'Sessão expirada' }, 401));
    if (!upstream.ok) {
        if ([400, 409].includes(upstream.status)) return json(await upstream.json(), upstream.status);
        return json({ message: 'Não foi possível salvar a ordem' }, upstream.status === 403 ? 403 : 503);
    }
    return json(await upstream.json(), upstream.status);
}
