'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatPhone } from '../shared/phone';
import { Menu, LogOut, RotateCw } from 'lucide-react';
type User = {
    _id: string;
    name: string;
    role: string;
};
type Order = {
    _id: string;
    numero: string;
    cliente: { nome: string | null; telefone: string | null };
    equipamentos: { _id: string; nome: string | null }[];
    entrega: { situacao: string; retirados: number; total: number };
    compatibility?: { legacy: boolean };
    status: string;
    dataEntrada: string;
};
export function Orders() {
    const [user, setUser] = useState<User | null>(null), [orders, setOrders] = useState<Order[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [query, setQuery] = useState(''), [menu, setMenu] = useState(false), [leaving, setLeaving] = useState(false);
    const [page, setPage] = useState(1), [total, setTotal] = useState(0), [pages, setPages] = useState(0), [status, setStatus] = useState(''), [delivery, setDelivery] = useState('');
    const controller = useRef<AbortController | null>(null);
    const load = useCallback(async () => {
        controller.current?.abort();
        const current = new AbortController();
        controller.current = current;
        setUser(null);
        setOrders([]);
        setTotal(0); setPages(0);
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
            const params = new URLSearchParams({ page: String(page), pageSize: '25', q: query, status, entrega: delivery });
            const response = await fetch('/api/orders?' + params, { cache: 'no-store', signal: current.signal });
            if (response.status === 401) {
                window.location.replace('/login');
                return;
            }
            if (!response.ok)
                throw new Error('Não foi possível carregar as ordens. Tente novamente.');
            const data = await response.json();
            if (!Array.isArray(data.data) || !data.meta || !Number.isInteger(data.meta.total))
                throw new Error('Resposta inválida da API.');
            if (!current.signal.aborted) {
                setUser(profile);
                setOrders(data.data); setTotal(data.meta.total); setPages(data.meta.totalPages);
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
    }, [page, query, status, delivery]);
    useEffect(() => {
        void load();
        const channel = new BroadcastChannel('ep-session');
        const clear = () => { controller.current?.abort(); setOrders([]); setTotal(0); setPages(0); setUser(null); setLoading(true); };
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
    const visible = orders;
    return <div className="min-h-screen md:flex">
 <aside className={`border-r bg-white p-6 md:block md:w-64 md:shrink-0 ${menu ? 'block' : 'hidden'}`}>
 <p className="text-xl font-bold">⚡ Eletro Paulínia</p><nav aria-label="Menu principal" className="mt-8"><Link href="/ordens" aria-current="page" className="block rounded-lg bg-orange-50 p-3 font-medium text-orange-700">Ordens de serviço</Link>{user?.role === 'admin' && <Link href="/funcionarios" className="mt-2 block rounded-lg p-3 hover:bg-orange-50">Funcionários</Link>}</nav></aside>
 <div className="min-w-0 flex-1"><header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-4 md:px-8">
 <button className="md:hidden" aria-label="Abrir menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu /></button>
 <span className="ml-auto text-sm">{user ? 'Olá, ' + user.name : 'Eletro Paulínia'}</span>
 <button onClick={logout} disabled={leaving} className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100" aria-label="Sair"><LogOut size={20}/>{leaving ? 'Saindo...' : 'Sair'}</button></header>
 <main className="p-4 md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Ordens de serviço</h1><p className="mt-2 text-gray-600">Consulte as ordens da equipe.</p></div><Link href="/nova-ordem" className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white">Nova ordem</Link></div>
 <div className="my-6 flex flex-wrap gap-3"><div className="min-w-0 basis-full sm:basis-0 sm:flex-1"><label htmlFor="search" className="mb-1 block text-sm">Buscar ordens</label><input id="search" maxLength={100} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Número, cliente, telefone ou equipamento" className="w-full rounded-lg border bg-white px-3 py-2"/></div>
 <label className="text-sm">Status<select aria-label="Filtrar status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="block rounded-lg border p-2"><option value="">Todos</option>{['Aguardando', 'Em andamento', 'Pronto', 'Entregue'].map(value => <option key={value}>{value}</option>)}</select></label>
 <label className="text-sm">Retirada<select aria-label="Filtrar retirada" value={delivery} onChange={e => { setDelivery(e.target.value); setPage(1); }} className="block rounded-lg border p-2"><option value="">Todas</option><option value="nenhuma">Nenhuma</option><option value="parcial">Parcial</option><option value="completa">Completa</option></select></label>
 <button onClick={() => void load()} disabled={loading || leaving} className="flex items-center gap-2 self-end rounded-lg border bg-white p-2"><RotateCw size={18}/>Atualizar</button></div>
 {loading ? <p role="status">Carregando ordens...</p> : error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}<button className="ml-3 underline" onClick={() => void load()}>Tentar novamente</button></div> :
            <><p className="mb-3 text-sm text-gray-600">{visible.length} de {total} ordem(ns)</p>{visible.length === 0 ? <p className="rounded-xl border bg-white p-8">{query || status || delivery ? 'Nenhuma ordem corresponde à busca.' : page > 1 ? 'Nenhuma ordem nesta página.' : 'Nenhuma ordem cadastrada.'}</p> :
                    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Ordens de serviço da equipe</caption><thead className="border-b bg-gray-50"><tr>{['Número', 'Cliente', 'Telefone', 'Equipamentos', 'Status', 'Entrada'].map(h => <th key={h} scope="col" className="whitespace-nowrap p-4">{h}</th>)}</tr></thead><tbody>{visible.map(o => <tr key={o._id} className="border-b last:border-0"><td className="p-4 font-medium"><Link href={`/ordens/${o._id}`} className="text-orange-700 underline">{o.numero}</Link>{o.compatibility?.legacy && <span className="block text-xs font-normal">Registro antigo</span>}</td><td className="p-4">{o.cliente.nome || 'Não informado'}</td><td className="whitespace-nowrap p-4">{formatPhone(o.cliente.telefone) || 'Não informado'}</td><td className="p-4"><ul>{o.equipamentos.map(item => <li key={item._id}>{item.nome || 'Não informado'}</li>)}</ul></td><td className="whitespace-nowrap p-4"><span className="rounded-full bg-orange-50 px-3 py-1 text-orange-800">{o.status || 'Não informado'}</span>{o.entrega.situacao === 'parcial' && <span className="mt-2 block">Retirada parcial ({o.entrega.retirados}/{o.entrega.total})</span>}</td><td className="whitespace-nowrap p-4">{o.dataEntrada?.slice(0, 10).split('-').reverse().join('/') || 'Não informada'}</td></tr>)}</tbody></table></div>}
 <nav aria-label="Paginação" className="mt-4 flex flex-wrap items-center gap-4"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border p-2 disabled:opacity-40">Anterior</button><span>Página {page} de {Math.max(1, pages)}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded border p-2 disabled:opacity-40">Próxima</button></nav></>}
 </main></div></div>;
}
