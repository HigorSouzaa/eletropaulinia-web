import { json } from '../../../../../web/server/api';
import { forwardWrite } from '../../../../../web/server/forward';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return json({ message: 'Ordem inválida' }, 400);
    return forwardWrite(request, `/v2/orders/${id}/equipamentos`, 'POST', { match: true });
}
