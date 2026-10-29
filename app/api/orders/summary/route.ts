import { authenticated } from '../../../../web/server/api';

export async function GET() {
  return authenticated('/v2/orders/summary');
}
