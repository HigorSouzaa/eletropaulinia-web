import { COOKIE, clearSession, expressRequest, json, validOrigin, readLoginBody } from '../../../../web/server/api';
export async function POST(request: Request) {
    if (!validOrigin(request))
        return json({ message: 'Origem não permitida' }, 403);
    let body;
    try {
        body = await readLoginBody(request);
    }
    catch (error) {
        return json({ message: 'Requisição inválida' }, error instanceof Error && error.message === 'LIMIT' ? 413 : 400);
    }
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string')
        return json({ message: 'Preencha usuário e senha' }, 400);
    const upstream = await expressRequest('/auth/login', undefined, { username: body.username, password: body.password });
    if (!upstream.ok) {
        if (upstream.status === 429) {
            const result = json({ message: 'Muitas tentativas. Aguarde antes de tentar novamente.' }, 429);
            const retryAfter = upstream.headers.get('retry-after');
            if (retryAfter && /^\d+$/.test(retryAfter)) result.headers.set('Retry-After', retryAfter);
            return result;
        }
        return json({ message: upstream.status === 401 ? 'Usuário ou senha inválidos' : 'Não foi possível entrar. Tente novamente.' }, [400, 401].includes(upstream.status) ? upstream.status : 503);
    }
    const data = await upstream.json();
    let expires: number;
    try {
        expires = JSON.parse(Buffer.from(data.token.split('.')[1], 'base64url').toString()).exp;
    }
    catch {
        return json({ message: 'Resposta inválida da API' }, 502);
    }
    if (!Number.isFinite(expires) || expires * 1000 <= Date.now())
        return clearSession(json({ message: 'Sessão inválida' }, 502));
    const result = json({ user: { _id: data._id, username: data.username, name: data.name, role: data.role } });
    result.cookies.set(COOKIE, data.token, { httpOnly: true, path: '/', sameSite: 'lax', secure: new URL(process.env.APP_ORIGIN!).protocol === 'https:', expires: new Date(expires * 1000) });
    return result;
}
