import { clearSession, expressRequest, json, sessionToken } from '../../../../web/server/api';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return json({ message: 'Ordem inválida' }, 400);
    const token = await sessionToken();
    if (!token) return clearSession(json({ message: 'Autenticação necessária' }, 401));
    const upstream = await expressRequest(`/v2/orders/${id}`, token);
    if (upstream.status === 401) return clearSession(json({ message: 'Sessão expirada' }, 401));
    if (!upstream.ok) return json({ message: upstream.status === 404 ? 'Ordem não encontrada' : 'Não foi possível carregar a ordem' }, upstream.status === 404 ? 404 : 503);
    const result = json(await upstream.json());
    const etag = upstream.headers.get('etag');
    if (etag) result.headers.set('ETag', etag);
    return result;
}
