import { forwardRead, forwardWrite } from '../../../../web/server/forward';
export async function GET(request: Request) { return forwardRead(`/v2/finance/expenses?${new URL(request.url).searchParams.toString()}`); }
export async function POST(request: Request) { return forwardWrite(request, '/v2/finance/expenses', 'POST', { key: true, limit: 4096 }); }
