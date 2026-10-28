import { forwardWrite } from '../../../../../web/server/forward';
export async function POST(request: Request) { return forwardWrite(request, '/v2/finance/recurrences/materialize', 'POST', { limit: 2048 }); }
