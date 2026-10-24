import { json } from '../../../../web/server/api';
import { forwardRead, forwardWrite } from '../../../../web/server/forward';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return json({ message: 'Ordem inválida' }, 400);
    return forwardRead(`/v2/orders/${id}`);
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return json({ message: 'Ordem inválida' }, 400);
    return forwardWrite(request, `/v2/orders/${id}`, 'PATCH', { match: true });
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return json({ message: 'Ordem inválida' }, 400);
    return forwardWrite(request, `/v2/orders/${id}`, 'DELETE', { match: true, empty: true });
}
