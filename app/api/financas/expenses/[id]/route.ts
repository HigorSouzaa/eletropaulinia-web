import { forwardRead, forwardWrite } from '../../../../../web/server/forward';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return forwardRead(`/v2/finance/expenses/${encodeURIComponent(id)}`); }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return forwardWrite(request, `/v2/finance/expenses/${encodeURIComponent(id)}`, 'PATCH', { match: true, limit: 4096 }); }
