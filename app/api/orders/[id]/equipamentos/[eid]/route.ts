import { json } from '../../../../../../web/server/api';
import { forwardWrite } from '../../../../../../web/server/forward';
type Context = { params: Promise<{ id: string; eid: string }> };
async function path(context: Context) {
    const { id, eid } = await context.params;
    return /^[a-f\d]{24}$/i.test(id) && /^[a-f\d]{24}$/i.test(eid) ? `/v2/orders/${id}/equipamentos/${eid}` as const : null;
}
export async function PATCH(request: Request, context: Context) {
    const target = await path(context);
    return target ? forwardWrite(request, target, 'PATCH', { match: true }) : json({ message: 'Identificador inválido' }, 400);
}
export async function DELETE(request: Request, context: Context) {
    const target = await path(context);
    return target ? forwardWrite(request, target, 'DELETE', { match: true, empty: true }) : json({ message: 'Identificador inválido' }, 400);
}
