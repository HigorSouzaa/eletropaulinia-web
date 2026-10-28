import { forwardRead } from '../../../../../../../../web/server/forward';
import { json } from '../../../../../../../../web/server/api';
type Context = { params: Promise<{ orderId: string; equipmentId: string }> };
export async function GET(_request: Request, context: Context) {
  const { orderId, equipmentId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(orderId) || !/^[a-f\d]{24}$/i.test(equipmentId)) return json({}, 400);
  return forwardRead(`/v2/finance/orders/${orderId}/equipment/${equipmentId}/receipt`);
}
