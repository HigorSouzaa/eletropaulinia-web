'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPhone, formatPhoneInput } from '../shared/phone';
type Client = { _id: string; nome: string; telefone: string; email: string | null; version: number };
type Order = { _id: string; numero: string; dataEntrada: string; tipoAtendimento: string; equipamentos: { nome: string }[] };
const input = 'mt-1 w-full rounded-lg border p-3';
export function Clients({ id }: { id?: string }) {
 const router = useRouter(); const loadedClient = useRef(''); const epoch = useRef(0); const invalidate = useCallback(() => { epoch.current++; }, []);
 const [rows, setRows] = useState<Client[]>([]), [client, setClient] = useState<Client | null>(null), [orders, setOrders] = useState<Order[]>([]);
 const [draft, setDraft] = useState({ nome: '', telefone: '', email: '' }), [tag, setTag] = useState(''), [admin, setAdmin] = useState(false);
 const [q, setQ] = useState(''), [page, setPage] = useState(1), [pages, setPages] = useState(0), [reload, setReload] = useState(0);
 const [loading, setLoading] = useState(true), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
 useEffect(() => {
  epoch.current++; const abort = new AbortController(); let live = true;
  const clear = () => { live = false; epoch.current++; loadedClient.current = ''; abort.abort(); setRows([]); setClient(null); setOrders([]); setDraft({ nome: '', telefone: '', email: '' }); router.replace('/login'); };
  const channel = new BroadcastChannel('ep-session'); channel.onmessage = clear;
  setLoading(true); setError('');
  void (async () => {
   try {
    const me = await fetch('/api/session/me', { signal: abort.signal, cache: 'no-store' }); if (me.status === 401) { clear(); return; } if (!me.ok) throw Error('Não foi possível verificar a sessão.');
    const user = await me.json(); if (!live) return; setAdmin(user.role === 'admin');
    if (id) {
     if (loadedClient.current !== `${id}:${reload}`) {
     const r = await fetch(`/api/clients/${id}`, { signal: abort.signal, cache: 'no-store' }); if (r.status === 401) { clear(); return; } if (!r.ok) throw Error(r.status === 404 ? 'Cliente não encontrado.' : 'Não foi possível carregar o cliente.');
     const data = (await r.json()).data as Client; if (!live) return;
     setClient(data); setTag(r.headers.get('etag') || ''); setDraft({ nome: data.nome, telefone: formatPhone(data.telefone), email: data.email || '' }); loadedClient.current = `${id}:${reload}`;
     }
     const list = await fetch(`/api/orders?clienteId=${id}&page=${page}`, { signal: abort.signal, cache: 'no-store' }); if (list.status === 401) { clear(); return; } if (!list.ok) throw Error('Não foi possível carregar o histórico.');
     const history = await list.json(); if (live) { setOrders(history.data); setPages(history.meta.totalPages); }
    } else {
     const r = await fetch(`/api/clients?q=${encodeURIComponent(q)}&page=${page}`, { signal: abort.signal, cache: 'no-store' }); if (r.status === 401) { clear(); return; } if (!r.ok) throw Error('Não foi possível carregar os clientes.');
     const data = await r.json(); if (live) { setRows(data.data); setPages(data.meta.totalPages); }
    }
   } catch (e) { if (live && !abort.signal.aborted) setError(e instanceof Error ? e.message : 'Falha de conexão.'); }
   finally { if (live) setLoading(false); }
  })();
  return () => { live = false; invalidate(); abort.abort(); channel.close(); };
 }, [id, q, page, reload, router, invalidate]);
 async function save(event: React.FormEvent) {
  event.preventDefault(); const current = epoch.current; setBusy(true); setError(''); setMessage('');
  try {
   const r = await fetch(`/api/clients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'If-Match': tag, 'X-Resource-Version': tag }, body: JSON.stringify({ ...draft, email: draft.email || null }), cache: 'no-store' });
   if (current !== epoch.current) return;
   if (r.status === 401) { setClient(null); router.replace('/login'); return; }
   if (!r.ok) throw Error(r.status === 412 ? 'O cadastro mudou. Seu rascunho foi mantido; compare com o cadastro em outra aba antes de recarregar.' : r.status === 409 ? 'Este telefone já pertence a outro cliente.' : r.status === 403 ? 'Somente administrador pode editar.' : 'Não foi possível salvar. Confira os campos; seu rascunho foi mantido.');
   const result = (await r.json()).data; if (current !== epoch.current) return; setClient(result); setTag(r.headers.get('etag') || ''); setMessage('Cadastro atualizado. As ordens anteriores mantêm os dados históricos.');
  } catch (e) { if (current === epoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão. Rascunho mantido.'); }
  finally { if (current === epoch.current) setBusy(false); }
 }
 return <main className="mx-auto max-w-4xl p-4 md:p-8">{id && <Link href="/clientes" className="text-orange-700 underline">Voltar aos clientes</Link>}<h1 className="mb-6 mt-4 text-2xl font-bold">{id ? 'Cadastro do cliente' : 'Clientes'}</h1>
 {!id && <label>Buscar nome ou telefone<input className={input} value={q} maxLength={100} onChange={e => { setQ(e.target.value); setPage(1); }} /></label>}
 {error && <div role="alert" className="my-4 rounded bg-red-50 p-4">{error}<button className="ml-3 underline" onClick={() => { if (!id || window.confirm('Recarregar descarta o rascunho. Continuar?')) setReload(v => v + 1); }}>Recarregar dados</button></div>}{message && <p role="status">{message}</p>}
 {loading ? <p role="status" className="mt-4">Carregando...</p> : id && client ? <><form onSubmit={save} className="space-y-4 rounded-xl border bg-white p-5"><label className="block">Nome *<input className={input} required maxLength={120} readOnly={!admin} value={draft.nome} onChange={e => setDraft({ ...draft, nome: e.target.value })} /></label><label className="block">Telefone *<input className={input} type="tel" required maxLength={40} readOnly={!admin} value={draft.telefone} onChange={e => setDraft({ ...draft, telefone: formatPhoneInput(e.target.value) })} /></label><label className="block">E-mail (opcional)<input className={input} type="email" maxLength={254} readOnly={!admin} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>{admin && <button disabled={busy} className="rounded bg-orange-600 px-4 py-3 text-white">Salvar cadastro</button>}</form><h2 className="my-4 text-xl font-semibold">Histórico de ordens</h2>{orders.length ? <ul className="space-y-3">{orders.map(order => <li key={order._id} className="rounded border bg-white p-4"><Link className="text-orange-700 underline" href={`/ordens/${order._id}`}>{order.numero}</Link> · {order.dataEntrada.split('-').reverse().join('/')} · {order.tipoAtendimento === 'retorno' ? 'Retorno' : 'Normal'}<p>{order.equipamentos.map(eq => eq.nome).join(', ')}</p></li>)}</ul> : <p>Nenhuma ordem vinculada. Registros antigos podem depender de reconciliação.</p>}</> : !id && <ul className="mt-4 space-y-3">{rows.map(row => <li key={row._id} className="rounded border bg-white p-4"><Link href={`/clientes/${row._id}`} className="font-medium text-orange-700 underline">{row.nome}</Link><p>{formatPhone(row.telefone)}</p></li>)}{!rows.length && !error && <li>Nenhum cliente encontrado.</li>}</ul>}
 <nav aria-label="Paginação" className="mt-5 flex items-center gap-4"><button disabled={page <= 1 || loading} onClick={() => setPage(v => v - 1)}>Anterior</button><span>Página {page} de {Math.max(1, pages)}</span><button disabled={page >= pages || loading} onClick={() => setPage(v => v + 1)}>Próxima</button></nav></main>;
}
