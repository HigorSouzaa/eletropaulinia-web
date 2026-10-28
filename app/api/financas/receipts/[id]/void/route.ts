import { forwardWrite } from '../../../../../../web/server/forward';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return forwardWrite(request, `/v2/finance/receipts/${encodeURIComponent(id)}/void`, 'POST', { match: true, limit: 2048 }); }
