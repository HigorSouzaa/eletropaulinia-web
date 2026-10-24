import { json } from '../../../../web/server/api';
import { forwardRead, forwardWrite } from '../../../../web/server/forward';
type Context = { params: Promise<{ id: string }> };
async function target(context: Context) { const { id } = await context.params; return /^[a-f\d]{24}$/i.test(id) ? `/v2/employees/${id}` as const : null; }
export async function GET(_request: Request, context: Context) {
    const path = await target(context); return path ? forwardRead(path) : json({ message: 'Funcionário inválido' }, 400);
}
export async function PATCH(request: Request, context: Context) {
    const path = await target(context); return path ? forwardWrite(request, path, 'PATCH', { match: true, limit: 16 * 1024 }) : json({ message: 'Funcionário inválido' }, 400);
}
