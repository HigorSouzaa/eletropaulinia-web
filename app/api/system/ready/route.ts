import { json } from '../../../../web/server/api';

export async function GET() {
    const base = process.env.API_INTERNAL_URL;
    if (!base) return json({ ready: false }, 503);
    try {
        const url = new URL('/health/ready', base);
        const response = await fetch(url, {
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(4000),
        });
        return json({ ready: response.ok }, response.ok ? 200 : 503);
    } catch {
        return json({ ready: false }, 503);
    }
}
