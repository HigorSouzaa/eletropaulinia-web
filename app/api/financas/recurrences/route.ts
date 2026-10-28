import { forwardRead, forwardWrite } from '../../../../web/server/forward';
export async function GET() { return forwardRead('/v2/finance/recurrences'); }
export async function POST(request: Request) { return forwardWrite(request, '/v2/finance/recurrences', 'POST', { key: true, limit: 4096 }); }
