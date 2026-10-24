import { json } from '../../../../../web/server/api';
import { forwardWrite } from '../../../../../web/server/forward';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return /^[a-f\d]{24}$/i.test(id) ? forwardWrite(request, `/v2/employees/${id}/access`, 'PATCH', { match: true, limit: 1024 }) : json({ message: 'Funcionário inválido' }, 400);
}
