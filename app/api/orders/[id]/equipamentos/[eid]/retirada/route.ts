import { json } from '../../../../../../../web/server/api';
import { forwardWrite } from '../../../../../../../web/server/forward';
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; eid: string }> }) {
    const { id, eid } = await params;
    if (!/^[a-f\d]{24}$/i.test(id) || !/^[a-f\d]{24}$/i.test(eid)) return json({ message: 'Identificador inválido' }, 400);
    return forwardWrite(request, `/v2/orders/${id}/equipamentos/${eid}/retirada`, 'PUT', { match: true, empty: true });
}
