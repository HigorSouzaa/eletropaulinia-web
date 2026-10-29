'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Summary = { total: number; equipamentos: number; retirados: number; porStatus: { status: string | null; total: number }[] };
type RecentOrder = { _id: string; numero: string; status: string; dataEntrada: string; equipamentos: unknown[] };
const statuses = ['Aguardando', 'Em andamento', 'Pronto', 'Entregue'] as const;

export function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError('');
    setSummary(null);
    setOrders([]);
    try {
      const [summaryResponse, ordersResponse] = await Promise.all([
        fetch('/api/orders/summary', { cache: 'no-store', signal: current.signal }),
        fetch('/api/orders?page=1&pageSize=5&sort=dataEntrada&direction=desc', { cache: 'no-store', signal: current.signal }),
      ]);
      if (summaryResponse.status === 401 || ordersResponse.status === 401) { window.location.replace('/login'); return; }
      if (!summaryResponse.ok || !ordersResponse.ok) throw new Error('Não foi possível carregar a visão geral. Tente novamente.');
      const [summaryResult, ordersResult] = await Promise.all([summaryResponse.json(), ordersResponse.json()]);
      if (!summaryResult.data || !Number.isInteger(summaryResult.data.total) || !Array.isArray(summaryResult.data.porStatus) || !Array.isArray(ordersResult.data)) throw new Error('Resposta inválida da API.');
      if (!current.signal.aborted) { setSummary(summaryResult.data); setOrders(ordersResult.data); }
    } catch (cause) {
      if (!current.signal.aborted) setError(cause instanceof Error ? cause.message : 'Falha de conexão.');
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);

  return <main className="p-4 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Visão geral</h1><p className="mt-2 text-gray-600">Acompanhe o andamento das ordens da loja.</p></div>
      <Link href="/nova-ordem" className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">Nova ordem</Link>
    </div>
    {loading ? <p role="status" className="mt-8">Carregando visão geral...</p> : error ? <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}<button type="button" className="ml-3 underline" onClick={() => void load()}>Tentar novamente</button></div> : summary && <>
      <section aria-labelledby="dashboard-status" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2"><h2 id="dashboard-status" className="text-lg font-semibold">Ordens por andamento</h2><p className="text-sm text-gray-600">{summary.total} ordem(ns) no total</p></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statuses.map(status => <Link key={status} href={`/ordens?status=${encodeURIComponent(status)}`} className="rounded-xl border bg-white p-5 hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-orange-600"><span className="text-sm text-gray-600">{status}</span><strong className="mt-2 block text-3xl text-gray-900">{summary.porStatus.find(row => row.status === status)?.total ?? 0}</strong><span className="mt-2 block text-sm text-orange-700">Ver ordens</span></Link>)}
        </div>
      </section>
      <section aria-labelledby="dashboard-recentes" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="dashboard-recentes" className="text-lg font-semibold">Entradas recentes</h2><p className="mt-1 text-sm text-gray-600">Cinco ordens pela data de entrada.</p></div><Link href="/ordens" className="text-sm font-medium text-orange-700 underline">Ver todas as ordens</Link></div>
        {orders.length === 0 ? <p className="mt-3 rounded-xl border bg-white p-6">Nenhuma ordem cadastrada. Use “Nova ordem” para registrar a primeira.</p> : <ul className="mt-3 divide-y rounded-xl border bg-white">{orders.map(order => <li key={order._id} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><Link href={`/ordens/${order._id}`} className="font-semibold text-orange-700 underline">{order.numero}</Link><p className="mt-1 text-sm text-gray-600">Entrada {order.dataEntrada?.slice(0, 10).split('-').reverse().join('/') || 'não informada'} · {order.equipamentos.length} equipamento(s)</p></div><span className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-800">{order.status}</span></li>)}</ul>}
      </section>
    </>}
  </main>;
}
