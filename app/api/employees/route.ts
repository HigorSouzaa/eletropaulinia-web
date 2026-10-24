import { json } from '../../../web/server/api';
import { forwardRead, forwardWrite } from '../../../web/server/forward';
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => !['page', 'pageSize'].includes(key) || params.getAll(key).length !== 1)) return json({ message: 'Consulta inválida' }, 400);
    return forwardRead(`/v2/employees?${params.toString()}`);
}
export async function POST(request: Request) { return forwardWrite(request, '/auth/register', 'POST', { limit: 16 * 1024 }); }
