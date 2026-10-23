import { sessionToken } from '../../web/server/api';
import { redirect } from 'next/navigation';
export default async function Internal({ children }: {
    children: React.ReactNode;
}) { if (!await sessionToken())
    redirect('/login'); return children; }
