import { forwardRead } from '../../../../../../../../web/server/forward';
export async function GET(_request: Request, context: { params: Promise<{ orderId: string; equipmentId: string }> }) { const { orderId, equipmentId } = await context.params; return forwardRead(`/v2/finance/orders/${encodeURIComponent(orderId)}/equipment/${encodeURIComponent(equipmentId)}/result`); }
