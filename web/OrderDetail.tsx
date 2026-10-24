'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Equipment = { _id: string; nome: string | null; marca: string | null; modelo: string | null; numeroSerie: string | null; solicitacao: { tipo: string; descricao: string | null }; andamento: string | null; retirada: { retiradoEm: string | null; origem: string } | null };
type Order = { _id: string; numero: string; cliente: { nome: string | null; telefone: string | null; email: string | null }; equipamentos: Equipment[]; dataEntrada: string; status: string; entrega: { retirados: number; total: number }; compatibility?: { legacy: boolean; readOnly: boolean; requiresReconciliation: boolean } };
export function OrderDetail({ id }: { id: string }) {
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
    const load = useCallback(async (signal: AbortSignal) => {
        setOrder(null); setError(''); setLoading(true);
        try {
            const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: 'no-store', signal });
            if (response.status === 401) { router.replace('/login'); return; }
            if (!response.ok) { setError(response.status === 404 ? 'Ordem não encontrada.' : 'Não foi possível carregar a ordem.'); return; }
            const result = await response.json();
            if (!result.data?._id) throw new Error('INVALID_RESPONSE');
            if (!signal.aborted) setOrder(result.data);
        } catch { if (!signal.aborted) setError('Falha de conexão. Tente novamente.'); }
        finally { if (!signal.aborted) setLoading(false); }
    }, [id, router]);
    useEffect(() => {
        const controller = new AbortController();
        const channel = new BroadcastChannel('ep-session');
        channel.onmessage = () => { controller.abort(); setOrder(null); router.replace('/login'); };
        void load(controller.signal);
        return () => { controller.abort(); channel.close(); };
    }, [load, router]);
    return <main className="mx-auto max-w-4xl p-4 md:p-8"><Link href="/ordens" className="text-orange-700 underline">Voltar às ordens</Link>
        {loading ? <p className="mt-6" role="status">Carregando ordem...</p> : error ? <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => { const c = new AbortController(); void load(c.signal); }}>Tentar novamente</button></div> : order && <>
            <h1 className="mt-4 text-2xl font-bold">Ordem {order.numero}</h1>
            {order.compatibility?.legacy && <p className="mt-3 rounded-lg bg-amber-50 p-4 text-amber-900">Registro antigo somente para leitura. Requer reconciliação antes de alterações.</p>}
            <p className="mt-2 text-gray-600">{order.status} · {order.entrega.retirados} de {order.entrega.total} retirado(s)</p>
            <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Cliente</h2><dl className="mt-3 grid gap-2 sm:grid-cols-2"><div><dt className="font-medium">Nome</dt><dd>{order.cliente.nome || 'Não informado'}</dd></div><div><dt className="font-medium">Telefone</dt><dd>{order.cliente.telefone || 'Não informado'}</dd></div><div><dt className="font-medium">E-mail</dt><dd>{order.cliente.email || 'Não informado'}</dd></div><div><dt className="font-medium">Entrada</dt><dd>{order.dataEntrada || 'Não informada'}</dd></div></dl></section>
            <section className="mt-6"><h2 className="text-lg font-semibold">Equipamentos</h2><div className="mt-3 space-y-3">{order.equipamentos.map((eq, index) => <article key={eq._id} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">{index + 1}. {eq.nome || 'Não informado'}</h3><p className="mt-1 text-sm text-gray-600">{eq.andamento || 'Andamento não informado'} · {eq.retirada ? 'Retirado' : 'Na empresa'}</p><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-medium">Marca</dt><dd>{eq.marca || 'Não informada'}</dd></div><div><dt className="font-medium">Modelo</dt><dd>{eq.modelo || 'Não informado'}</dd></div><div><dt className="font-medium">Série</dt><dd>{eq.numeroSerie || 'Não informada'}</dd></div><div><dt className="font-medium">Solicitação</dt><dd>{eq.solicitacao.tipo === 'testar' ? 'Testar' : eq.solicitacao.descricao || 'Não informada'}</dd></div></dl></article>)}</div></section>
            {!order.compatibility?.legacy && <p className="mt-6 text-sm text-gray-600">Edição e retirada serão habilitadas após a validação deste primeiro fluxo.</p>}
        </>}
    </main>;
}
