import 'server-only';
import { clearSession, expressRequest, json, readJsonBody, sessionToken, validOrigin, type ApiPath } from './api';

function responseWithEtag(data: unknown, status: number, upstream: Response) {
    const response = json(data, status);
    const etag = upstream.headers.get('etag');
    if (etag) response.headers.set('ETag', etag);
    return response;
}
export async function forwardRead(path: ApiPath) {
    const token = await sessionToken();
    if (!token) return clearSession(json({ message: 'Autenticação necessária' }, 401));
    const upstream = await expressRequest(path, token);
    if (upstream.status === 401) return clearSession(json({ message: 'Sessão expirada' }, 401));
    if (!upstream.ok) return json({ message: upstream.status === 403 ? 'Acesso não permitido' : upstream.status === 404 ? 'Recurso não encontrado' : 'Não foi possível carregar os dados' }, [400, 403, 404].includes(upstream.status) ? upstream.status : 503);
    return responseWithEtag(await upstream.json(), upstream.status, upstream);
}
export async function forwardWrite(request: Request, path: ApiPath, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', options: { match?: boolean; key?: boolean; empty?: boolean; limit?: number } = {}) {
    if (!validOrigin(request)) return json({ message: 'Origem não permitida' }, 403);
    const token = await sessionToken();
    if (!token) return clearSession(json({ message: 'Autenticação necessária' }, 401));
    const headers: Record<string, string> = {};
    if (options.match) {
        const match = request.headers.get('if-match');
        // Netlify may append a short response-variant suffix to ETags sent to browsers.
        // Express owns the version check, so forward only the canonical resource tag.
        const pattern = /^"((?:os|user|client|receipt|expense|recurrence)-[a-f\d]{24}-v\d+)(?:-[a-f\d]{1,16})?"$/i;
        // Some hosting proxies alter conditional HTTP headers. A dedicated header
        // carries the same version; Express still enforces it as If-Match.
        const parsed = match?.match(pattern) ?? request.headers.get('x-resource-version')?.match(pattern);
        if (!parsed) return json({ message: 'Versão da alteração ausente ou inválida' }, 428);
        headers['If-Match'] = `"${parsed[1]}"`;
    }
    if (options.key) {
        const key = request.headers.get('idempotency-key');
        if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return json({ message: 'Tentativa inválida' }, 400);
        headers['Idempotency-Key'] = key;
    }
    let body: unknown;
    if (!options.empty) {
        try { body = await readJsonBody(request, options.limit ?? 512 * 1024); }
        catch (error) { return json({ message: 'Requisição inválida' }, error instanceof Error && error.message === 'LIMIT' ? 413 : 400); }
    } else if (method === 'PUT') body = {};
    const upstream = await expressRequest(path, token, body, headers, method);
    if (upstream.status === 401) return clearSession(json({ message: 'Sessão expirada' }, 401));
    if (upstream.status === 204) return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });
    if (!upstream.ok) {
        if ([400, 403, 404, 409, 412, 413, 428].includes(upstream.status)) {
            const data = await upstream.json().catch(() => ({}));
            return json(data, upstream.status);
        }
        return json({ message: 'Serviço temporariamente indisponível' }, 503);
    }
    return responseWithEtag(await upstream.json(), upstream.status, upstream);
}
