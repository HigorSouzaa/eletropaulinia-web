import { forwardWrite } from '../../../../web/server/forward';
export async function POST(request: Request) { return forwardWrite(request, '/v2/finance/receipts', 'POST', { key: true, limit: 4096 }); }
