import { forwardWrite } from '../../../../web/server/forward';
export async function POST(request: Request) { return forwardWrite(request, '/v2/whatsapp/disconnect', 'POST', { empty: true }); }
