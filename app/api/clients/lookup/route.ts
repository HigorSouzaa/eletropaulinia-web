import { forwardWrite } from '../../../../web/server/forward';

export async function POST(request: Request) {
    return forwardWrite(request, '/v2/clients/lookup', 'POST', { limit: 1024 });
}
