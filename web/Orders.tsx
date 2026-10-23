'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, LogOut, RotateCw } from 'lucide-react';
type User = {
    _id: string;
    name: string;
    role: string;
};
type Order = {
    _id: string;
    numero: string;
    cliente: string;
    telefone: string;
    equipamento: string;
    status: string;
    dataEntrada: string;
};
export function Orders() {
    const [user, setUser] = useState<User | null>(null), [orders, setOrders] = useState<Order[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [query, setQuery] = useState(''), [menu, setMenu] = useState(false), [leaving, setLeaving] = useState(false);
    const controller = useRef<AbortController | null>(null);
    const load = useCallback(async () => {
        controller.current?.abort();
        const current = new AbortController();
        controller.current = current;
        setUser(null);
        setOrders([]);
        setLoading(true);
        setError('');
        try {
            const me = await fetch('/api/session/me', { cache: 'no-store', signal: current.signal });
            if (me.status === 401) {
                window.location.replace('/login');
                return;
            }
            if (!me.ok)
                throw new Error('Não foi possível verificar sua sessão. Tente novamente.');
            const profile = await me.json();
            const response = await fetch('/api/orders', { cache: 'no-store', signal: current.signal });
            if (response.status === 401) {
                window.location.replace('/login');
                return;
            }
            if (!response.ok)
                throw new Error('Não foi possível carregar as ordens. Tente novamente.');
            const data = await response.json();
            if (!Array.isArray(data))
                throw new Error('Resposta inválida da API.');
            if (!current.signal.aborted) {
                setUser(profile);
                setOrders(data);
            }
        }
        catch (e) {
            if (!current.signal.aborted)
                setError(e instanceof Error ? e.message : 'Falha de conexão.');
        }
        finally {
            if (!current.signal.aborted)
                setLoading(false);
        }
    }, []);
    useEffect(() => {
        void load();
        const channel = new BroadcastChannel('ep-session');
        const clear = () => { controller.current?.abort(); setOrders([]); setUser(null); setLoading(true); };
        const changed = () => { clear(); window.location.reload(); };
        const visible = () => { if (document.visibilityState === 'hidden')
            clear();
        else
            void load(); };
        const show = (event: PageTransitionEvent) => { if (event.persisted)
            void load(); };
        channel.onmessage = changed;
        document.addEventListener('visibilitychange', visible);
        window.addEventListener('pageshow', show);
        window.addEventListener('pagehide', clear);
        return () => { controller.current?.abort(); channel.close(); document.removeEventListener('visibilitychange', visible); window.removeEventListener('pageshow', show); window.removeEventListener('pagehide', clear); };
    }, [load]);
    async function logout() {
        setLeaving(true);
        setError('');
        controller.current?.abort();
        setOrders([]);
        setUser(null);
        try {
            const response = await fetch('/api/session/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            if (!response.ok)
                throw new Error('Não foi possível encerrar a sessão. Tente novamente.');
            const channel = new BroadcastChannel('ep-session');
            channel.postMessage('changed');
            channel.close();
            window.location.replace('/login');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Falha ao sair.');
            setLoading(false);
            setLeaving(false);
        }
    }
    const visible = orders.filter(o => [o.numero, o.cliente, o.telefone, o.equipamento].some(value => value?.toLowerCase().includes(query.toLowerCase())));
    return <div className="min-h-screen md:flex">
 <aside className={`border-r bg-white p-6 md:block md:w-64 md:shrink-0 ${menu ? 'block' : 'hidden'}`}>
 <p className="text-xl font-bold">⚡ Eletro Paulínia</p><nav aria-label="Menu principal" className="mt-8"><Link href="/ordens" aria-current="page" className="block rounded-lg bg-orange-50 p-3 font-medium text-orange-700">Ordens de serviço</Link></nav></aside>
 <div className="min-w-0 flex-1"><header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-4 md:px-8">
 <button className="md:hidden" aria-label="Abrir menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu /></button>
 <span className="ml-auto text-sm">{user ? 'Olá, ' + user.name : 'Eletro Paulínia'}</span>
 <button onClick={logout} disabled={leaving} className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100" aria-label="Sair"><LogOut size={20}/>{leaving ? 'Saindo...' : 'Sair'}</button></header>
 <main className="p-4 md:p-8"><h1 className="text-2xl font-bold">Ordens de serviço</h1><p className="mt-2 text-gray-600">Consulte as ordens da equipe.</p>
 <div className="my-6 flex flex-wrap gap-3"><div className="min-w-0 flex-1"><label htmlFor="search" className="mb-1 block text-sm">Buscar nas ordens carregadas</label><input id="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Número, cliente, telefone ou equipamento" className="w-full rounded-lg border bg-white px-3 py-2"/></div>
 <button onClick={() => void load()} disabled={loading || leaving} className="flex items-center gap-2 self-end rounded-lg border bg-white p-2"><RotateCw size={18}/>Atualizar</button></div>
 {loading ? <p role="status">Carregando ordens...</p> : error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}<button className="ml-3 underline" onClick={() => void load()}>Tentar novamente</button></div> :
            <><p className="mb-3 text-sm text-gray-600">{visible.length} ordem(ns) exibida(s)</p>{visible.length === 0 ? <p className="rounded-xl border bg-white p-8">{orders.length ? 'Nenhuma ordem corresponde à busca.' : 'Nenhuma ordem cadastrada.'}</p> :
                    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Ordens de serviço da equipe</caption><thead className="border-b bg-gray-50"><tr>{['Número', 'Cliente', 'Telefone', 'Equipamento', 'Status', 'Entrada'].map(h => <th key={h} scope="col" className="whitespace-nowrap p-4">{h}</th>)}</tr></thead><tbody>{visible.map(o => <tr key={o._id} className="border-b last:border-0"><td className="p-4 font-medium">{o.numero}</td><td className="p-4">{o.cliente}</td><td className="whitespace-nowrap p-4">{o.telefone}</td><td className="p-4">{o.equipamento}</td><td className="whitespace-nowrap p-4"><span className="rounded-full bg-orange-50 px-3 py-1 text-orange-800">{o.status}</span></td><td className="whitespace-nowrap p-4">{o.dataEntrada?.slice(0, 10).split('-').reverse().join('/')}</td></tr>)}</tbody></table></div>}</>}
 </main></div></div>;
}
