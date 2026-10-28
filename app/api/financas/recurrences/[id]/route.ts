import { forwardWrite } from '../../../../../web/server/forward';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return forwardWrite(request, `/v2/finance/recurrences/${encodeURIComponent(id)}`, 'PATCH', { match: true, limit: 4096 }); }
