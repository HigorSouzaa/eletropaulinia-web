import { forwardRead } from '../../../../web/server/forward';
export async function GET() { return forwardRead('/v2/whatsapp/qr'); }
