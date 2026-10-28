import { forwardRead } from '../../../web/server/forward';
export async function GET(request: Request) { return forwardRead(`/v2/clients?${new URL(request.url).searchParams.toString()}`); }
