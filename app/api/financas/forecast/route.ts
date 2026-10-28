import { forwardRead } from '../../../../web/server/forward';
export async function GET(request: Request) { return forwardRead(`/v2/finance/forecast?${new URL(request.url).searchParams.toString()}`); }
