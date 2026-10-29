import { sessionToken } from '../../web/server/api';
import { redirect } from 'next/navigation';
import { AppShell } from '../../web/AppShell';
export default async function Internal({ children }: {
    children: React.ReactNode;
}) { if (!await sessionToken())
    redirect('/login'); return <AppShell>{children}</AppShell>; }
