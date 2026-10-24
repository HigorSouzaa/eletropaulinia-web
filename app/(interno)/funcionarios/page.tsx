import Link from 'next/link';
import { redirect } from 'next/navigation';
import { expressRequest, sessionToken } from '../../../web/server/api';
import { Employees } from '../../../web/Employees';
export default async function Page() {
    const token = await sessionToken();
    if (!token) redirect('/login');
    const profile = await expressRequest('/auth/me', token);
    if (profile.status === 401) redirect('/login');
    if (!profile.ok) return <main className="p-8" role="alert">Não foi possível verificar sua sessão. <Link href="/ordens" className="underline">Voltar às ordens</Link></main>;
    if ((await profile.json()).role !== 'admin') redirect('/ordens');
    return <Employees />;
}
