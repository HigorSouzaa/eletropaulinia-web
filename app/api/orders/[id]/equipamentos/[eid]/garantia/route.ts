import { forwardWrite } from '../../../../../../../web/server/forward';
import { json } from '../../../../../../../web/server/api';
export async function PATCH(request: Request, context: { params: Promise<{ id: string; eid: string }> }) { const { id, eid } = await context.params; if (![id,eid].every(v => /^[a-f\d]{24}$/i.test(v))) return json({},400); return forwardWrite(request, `/v2/orders/${id}/equipamentos/${eid}/garantia`, 'PATCH', { match: true, limit: 4096 }); }
