import { clearSession, expressRequest, json, sessionToken, validOrigin } from '../../../../web/server/api';
export async function POST(request: Request) {
    if (!validOrigin(request))
        return json({ message: 'Origem não permitida' }, 403);
    const token = await sessionToken();
    if (token) {
        const upstream = await expressRequest('/auth/logout', token, {});
        if (!upstream.ok && upstream.status !== 401)
            return json({ message: 'Não foi possível encerrar a sessão. Tente novamente.' }, 503);
    }
    return clearSession(json({ ok: true }));
}
