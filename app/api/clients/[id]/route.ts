import { forwardRead, forwardWrite } from '../../../../web/server/forward';
import { json } from '../../../../web/server/api';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { const { id } = await context.params; if (!/^[a-f\d]{24}$/i.test(id)) return json({}, 400); return forwardRead(`/v2/clients/${id}`); }
export async function PATCH(request: Request, context: Context) { const { id } = await context.params; if (!/^[a-f\d]{24}$/i.test(id)) return json({}, 400); return forwardWrite(request, `/v2/clients/${id}`, 'PATCH', { match: true, limit: 1024 }); }
