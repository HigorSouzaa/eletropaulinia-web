import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export const COOKIE = 'ep_session';
export const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
export type ApiPath = '/auth/login' | '/auth/logout' | '/auth/me' | '/auth/register' | '/orders' | '/v2/orders' | `/v2/orders?${string}` | `/v2/orders/${string}` | '/v2/employees' | `/v2/employees?${string}` | `/v2/employees/${string}` | '/v2/clients/lookup' | '/v2/clients' | `/v2/clients?${string}` | `/v2/clients/${string}` | '/v2/technicians' | `/v2/technicians?${string}` | '/v2/finance/summary' | '/v2/finance/receipts' | `/v2/finance/orders/${string}/equipment/${string}/receipt`;
export async function expressRequest(path: ApiPath, token?: string, body?: unknown, extraHeaders: Record<string, string> = {}, method = body === undefined ? 'GET' : 'POST') {
    const base = process.env.API_INTERNAL_URL || 'http://127.0.0.1:5000/api';
    try {
        return await fetch(base.replace(/\/$/, '') + path, {
            method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extraHeaders },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            cache: 'no-store', signal: AbortSignal.timeout(8000), redirect: 'error',
        });
    }
    catch {
        return new Response(JSON.stringify({ message: 'Serviço temporariamente indisponível' }), { status: 503 });
    }
}
export async function sessionToken() { return (await cookies()).get(COOKIE)?.value; }
export function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: noStore }); }
export function clearSession(response: NextResponse) { response.cookies.set(COOKIE, '', { httpOnly: true, path: '/', sameSite: 'lax', maxAge: 0 }); return response; }
export function validOrigin(request: Request) {
    const configured = process.env.APP_ORIGIN;
    if (!configured)
        return false;
    try {
        return request.headers.get('origin') === new URL(configured).origin
            && request.headers.get('content-type')?.split(';')[0].trim() === 'application/json';
    }
    catch {
        return false;
    }
}
export async function readLoginBody(request: Request) {
    return readJsonBody(request, 4096);
}
export async function readJsonBody(request: Request, limit: number) {
    const reader = request.body?.getReader();
    if (!reader)
        throw new Error('EMPTY');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            throw new Error('LIMIT');
        }
        chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function authenticated(path: '/auth/me' | '/orders' | '/v2/orders' | `/v2/orders?${string}`) {
    const token = await sessionToken();
    if (!token)
        return clearSession(json({ message: 'Autenticação necessária' }, 401));
    const response = await expressRequest(path, token);
    if (response.status === 401)
        return clearSession(json({ message: 'Sessão expirada' }, 401));
    if (!response.ok)
        return json({ message: 'Não foi possível carregar os dados' }, [400, 403].includes(response.status) ? response.status : 503);
    return json(await response.json());
}
