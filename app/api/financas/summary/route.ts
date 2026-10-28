import { forwardRead } from '../../../../web/server/forward';
export async function GET(request: Request) { const query = new URL(request.url).searchParams.toString(); return forwardRead(`/v2/finance/summary${query ? `?${query}` : ''}`); }
