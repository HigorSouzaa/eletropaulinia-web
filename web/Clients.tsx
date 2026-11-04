'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPhone, formatPhoneInput } from '../shared/phone';
type Address = { cep?: string | null; logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null };
type Client = { _id: string; nome: string; telefone: string; email: string | null; version: number; tipoPessoa?: 'fisica' | 'juridica' | null; documento?: string | null; endereco?: Address | null };
type Order = { _id: string; numero: string; dataEntrada: string; tipoAtendimento: string; equipamentos: { nome: string }[] };
const input = 'mt-1 w-full rounded-lg border p-3';
const emptyAddress = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
const formatDocument = (value: string, type: string) => type === 'fisica' && /^\d{11}$/.test(value) ? value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : type === 'juridica' && /^[A-Z0-9]{12}\d{2}$/.test(value) ? value.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5') : value;
export function Clients({ id }: { id?: string }) {
 const router = useRouter(); const loadedClient = useRef(''); const epoch = useRef(0); const invalidate = useCallback(() => { epoch.current++; }, []);
 const [rows, setRows] = useState<Client[]>([]), [client, setClient] = useState<Client | null>(null), [orders, setOrders] = useState<Order[]>([]);
 const [draft, setDraft] = useState({ nome: '', telefone: '', email: '', tipoPessoa: '', documento: '', endereco: emptyAddress }), [tag, setTag] = useState(''), [admin, setAdmin] = useState(false);
 const [q, setQ] = useState(''), [page, setPage] = useState(1), [pages, setPages] = useState(0), [reload, setReload] = useState(0);
 const [loading, setLoading] = useState(true), [error, setError] = useState(''), [fieldError, setFieldError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
 useEffect(() => {
  epoch.current++; const abort = new AbortController(); let live = true;
  const clear = () => { live = false; epoch.current++; loadedClient.current = ''; abort.abort(); setRows([]); setClient(null); setOrders([]); setDraft({ nome: '', telefone: '', email: '', tipoPessoa: '', documento: '', endereco: emptyAddress }); router.replace('/login'); };
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
     setClient(data); setTag(r.headers.get('etag') || ''); setDraft({ nome: data.nome, telefone: formatPhone(data.telefone), email: data.email || '', tipoPessoa: data.tipoPessoa || '', documento: data.documento ? formatDocument(data.documento, data.tipoPessoa || '') : '', endereco: { ...emptyAddress, ...data.endereco } as typeof emptyAddress }); loadedClient.current = `${id}:${reload}`;
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
  event.preventDefault(); const current = epoch.current; setBusy(true); setError(''); setFieldError(''); setMessage('');
  try {
   const r = await fetch(`/api/clients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'If-Match': tag, 'X-Resource-Version': tag }, body: JSON.stringify({ ...draft, email: draft.email || null, tipoPessoa: draft.tipoPessoa || null, documento: draft.documento || null, endereco: Object.fromEntries(Object.entries(draft.endereco).map(([key, value]) => [key, value || null])) }), cache: 'no-store' });
   if (current !== epoch.current) return;
   if (r.status === 401) { setClient(null); router.replace('/login'); return; }
   if (!r.ok) { const problem = await r.json().catch(() => null); const path = problem?.error?.fields?.[0]?.path; if (typeof path === 'string') setFieldError(path); throw Error(r.status === 412 ? 'O cadastro mudou. Seu rascunho foi mantido; compare com o cadastro em outra aba antes de recarregar.' : r.status === 409 ? problem?.error?.code === 'DOCUMENT_IN_USE' ? 'Este documento já pertence a outro cliente.' : 'Este telefone já pertence a outro cliente.' : r.status === 403 ? 'Somente administrador pode editar.' : path ? `Confira o campo ${path.replace('endereco.', '')}; seu rascunho foi mantido.` : 'Não foi possível salvar. Seu rascunho foi mantido.'); }
   const result = (await r.json()).data; if (current !== epoch.current) return; setClient(result); setTag(r.headers.get('etag') || ''); setMessage('Cadastro atualizado. As ordens anteriores mantêm os dados históricos.');
  } catch (e) { if (current === epoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão. Rascunho mantido.'); }
  finally { if (current === epoch.current) setBusy(false); }
 }
 return <main className="mx-auto max-w-4xl p-4 md:p-8">{id && <Link href="/clientes" className="text-orange-700 underline">Voltar aos clientes</Link>}<h1 className="mb-6 mt-4 text-2xl font-bold">{id ? 'Cadastro do cliente' : 'Clientes'}</h1>
 {!id && <label>Buscar nome ou telefone<input className={input} value={q} maxLength={100} onChange={e => { setQ(e.target.value); setPage(1); }} /></label>}
 {error && <div role="alert" className="my-4 rounded bg-red-50 p-4">{error}<button className="ml-3 underline" onClick={() => { if (!id || window.confirm('Recarregar descarta o rascunho. Continuar?')) setReload(v => v + 1); }}>Recarregar dados</button></div>}{message && <p role="status">{message}</p>}
 {loading ? <p role="status" className="mt-4">Carregando...</p> : id && client ? <><form onSubmit={save} className="space-y-4 rounded-xl border bg-white p-5"><label className="block">Nome *<input className={input} required maxLength={120} readOnly={!admin} value={draft.nome} onChange={e => setDraft({ ...draft, nome: e.target.value })} /></label><label className="block">Telefone *<input className={input} type="tel" required maxLength={40} readOnly={!admin} value={draft.telefone} onChange={e => setDraft({ ...draft, telefone: formatPhoneInput(e.target.value) })} /></label><label className="block">E-mail (opcional)<input className={input} type="email" maxLength={254} readOnly={!admin} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>{admin && <fieldset className="space-y-4 border-t pt-5"><legend className="text-lg font-semibold">Dados adicionais</legend><p className="text-sm text-slate-600">O documento é opcional e não aparece na abertura de OS.</p><div className="grid gap-4 md:grid-cols-2"><label className="block">Tipo de pessoa<select className={input} value={draft.tipoPessoa} onChange={e => { const next = e.target.value; if (draft.documento && next !== draft.tipoPessoa && !window.confirm('Mudar o tipo de pessoa remove o documento do rascunho. Continuar?')) return; setDraft({ ...draft, tipoPessoa: next, documento: next === draft.tipoPessoa ? draft.documento : '' }); }}><option value="">Não informado</option><option value="fisica">Pessoa física</option><option value="juridica">Pessoa jurídica</option></select></label><label className="block">{draft.tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF'} (opcional)<input className={input} value={draft.documento} maxLength={18} autoComplete="off" disabled={!draft.tipoPessoa} aria-invalid={fieldError === 'documento'} aria-describedby={fieldError === 'documento' ? 'client-document-error' : undefined} onChange={e => setDraft({ ...draft, documento: e.target.value })} />{fieldError === 'documento' && <span id="client-document-error" className="text-sm text-red-700">Documento inválido; confira os dígitos verificadores.</span>}</label>{([['cep', 'CEP', 9], ['logradouro', 'Logradouro', 160], ['numero', 'Número', 20], ['complemento', 'Complemento', 100], ['bairro', 'Bairro', 100], ['cidade', 'Cidade', 100], ['uf', 'UF', 2]] as const).map(([key, label, max]) => <label key={key} className="block">{label} (opcional)<input className={input} value={draft.endereco[key] || ''} maxLength={max} aria-invalid={fieldError === `endereco.${key}`} aria-describedby={fieldError === `endereco.${key}` ? `client-${key}-error` : undefined} onChange={e => setDraft({ ...draft, endereco: { ...draft.endereco, [key]: e.target.value } })} />{fieldError === `endereco.${key}` && <span id={`client-${key}-error`} className="text-sm text-red-700">Confira este campo.</span>}</label>)}</div></fieldset>}{admin && <button disabled={busy} className="rounded bg-orange-600 px-4 py-3 text-white">Salvar cadastro</button>}</form><h2 className="my-4 text-xl font-semibold">Histórico de ordens</h2>{orders.length ? <ul className="space-y-3">{orders.map(order => <li key={order._id} className="rounded border bg-white p-4"><Link className="text-orange-700 underline" href={`/ordens/${order._id}`}>{order.numero}</Link> · {order.dataEntrada.split('-').reverse().join('/')} · {order.tipoAtendimento === 'retorno' ? 'Retorno' : 'Normal'}<p>{order.equipamentos.map(eq => eq.nome).join(', ')}</p></li>)}</ul> : <p>Nenhuma ordem vinculada. Registros antigos podem depender de reconciliação.</p>}</> : !id && <ul className="mt-4 space-y-3">{rows.map(row => <li key={row._id} className="rounded border bg-white p-4"><Link href={`/clientes/${row._id}`} className="font-medium text-orange-700 underline">{row.nome}</Link><p>{formatPhone(row.telefone)}</p></li>)}{!rows.length && !error && <li>Nenhum cliente encontrado.</li>}</ul>}
 <nav aria-label="Paginação" className="mt-5 flex items-center gap-4"><button disabled={page <= 1 || loading} onClick={() => setPage(v => v - 1)}>Anterior</button><span>Página {page} de {Math.max(1, pages)}</span><button disabled={page >= pages || loading} onClick={() => setPage(v => v + 1)}>Próxima</button></nav></main>;
}
