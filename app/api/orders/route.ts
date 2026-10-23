import { authenticated, json } from '../../../web/server/api';
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const allowed = ['q', 'status', 'entrega', 'page', 'pageSize', 'sort', 'direction'];
    if ([...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1)) return json({ message: 'Consulta inválida' }, 400);
    return authenticated(`/v2/orders?${params.toString()}`);
}
