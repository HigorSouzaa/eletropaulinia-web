'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Item = { _id: string; nome: string | null; marca: string | null; modelo: string | null; numeroSerie: string | null; solicitacao: { tipo: 'relato' | 'testar'; descricao: string | null }; retirada: unknown };
type Order = { _id: string; numero: string; cliente: { nome: string; telefone: string; email: string | null }; equipamentos: Item[]; dataEntrada: string; dataPrevista: string | null; tecnico: string | null; observacoes: string | null; compatibility?: { legacy: boolean } };
type Main = { nome: string; telefone: string; email: string; dataEntrada: string; dataPrevista: string; tecnico: string; observacoes: string };
type ItemDraft = { nome: string; marca: string; modelo: string; numeroSerie: string; tipo: 'relato' | 'testar'; descricao: string };
const mainOf = (o: Order): Main => ({ nome: o.cliente.nome || '', telefone: o.cliente.telefone || '', email: o.cliente.email || '', dataEntrada: o.dataEntrada || '', dataPrevista: o.dataPrevista || '', tecnico: o.tecnico || '', observacoes: o.observacoes || '' });
const itemOf = (i: Item): ItemDraft => ({ nome: i.nome || '', marca: i.marca || '', modelo: i.modelo || '', numeroSerie: i.numeroSerie || '', tipo: i.solicitacao.tipo, descricao: i.solicitacao.descricao || '' });
const emptyItem = (): ItemDraft => ({ nome: '', marca: '', modelo: '', numeroSerie: '', tipo: 'relato', descricao: '' });
const payload = (i: ItemDraft) => ({ nome: i.nome, marca: i.marca || null, modelo: i.modelo || null, numeroSerie: i.numeroSerie || null, solicitacao: { tipo: i.tipo, descricao: i.tipo === 'testar' ? null : i.descricao } });
const input = 'mt-1 w-full rounded-lg border bg-white px-3 py-2';
export function EditOrder({ id }: { id: string }) {
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null), [etag, setEtag] = useState(''), [main, setMain] = useState<Main | null>(null);
    const [items, setItems] = useState<Record<string, ItemDraft>>({}), [added, setAdded] = useState<ItemDraft>(emptyItem);
    const [conflict, setConflict] = useState<{ order: Order; etag: string } | null>(null);
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
    const controller = useRef<AbortController | null>(null), epoch = useRef(0);
    const invalidate = useCallback(() => { epoch.current++; }, []);
    const apply = useCallback((value: Order, version: string) => { setOrder(value); setEtag(version); setMain(mainOf(value)); setItems(Object.fromEntries(value.equipamentos.map(eq => [eq._id, itemOf(eq)]))); setAdded(emptyItem()); setConflict(null); }, []);
    const load = useCallback(async () => {
        const requestEpoch = ++epoch.current;
        controller.current?.abort(); const current = new AbortController(); controller.current = current;
        setLoading(true); setError(''); setOrder(null); setMain(null);
        try {
            const response = await fetch(`/api/orders/${id}`, { cache: 'no-store', signal: current.signal });
            if (response.status === 401) { router.replace('/login'); return; }
            if (!response.ok) throw new Error(response.status === 404 ? 'Ordem não encontrada.' : 'Não foi possível carregar a ordem.');
            const result = await response.json();
            if (!result.data?._id) throw new Error('Resposta inválida da API.');
            if (!current.signal.aborted && requestEpoch === epoch.current) apply(result.data, response.headers.get('etag') || '');
        } catch (e) { if (!current.signal.aborted && requestEpoch === epoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão.'); }
        finally { if (!current.signal.aborted && requestEpoch === epoch.current) setLoading(false); }
    }, [id, router, apply]);
    useEffect(() => {
        void load(); const channel = new BroadcastChannel('ep-session');
        channel.onmessage = () => { epoch.current++; controller.current?.abort(); setOrder(null); router.replace('/login'); };
        const visible = () => { if (document.visibilityState === 'hidden') { epoch.current++; controller.current?.abort(); setOrder(null); } else void load(); };
        document.addEventListener('visibilitychange', visible);
        return () => { invalidate(); controller.current?.abort(); channel.close(); document.removeEventListener('visibilitychange', visible); };
    }, [load, router, invalidate]);
    async function save(path: string, method: 'PATCH' | 'POST' | 'DELETE', body?: unknown) {
        if (!etag) { setError('Atualize a ordem antes de alterar.'); return; }
        const requestEpoch = epoch.current;
        setBusy(true); setError(''); setSuccess('');
        try {
            const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'If-Match': etag }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store' });
            if (requestEpoch !== epoch.current) return;
            if (response.status === 401) { setOrder(null); router.replace('/login'); return; }
            if (response.status === 412) {
                const latest = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
                if (latest.ok) { const data = await latest.json(); if (requestEpoch === epoch.current) setConflict({ order: data.data, etag: latest.headers.get('etag') || '' }); }
                throw new Error('Esta ordem mudou enquanto você editava. Compare antes de continuar; seu rascunho foi mantido.');
            }
            if (response.status === 403) throw new Error('Você não tem permissão para esta ação.');
            if (!response.ok) {
                throw new Error(response.status === 400 ? 'Confira os campos obrigatórios e os formatos informados. Seu rascunho foi mantido.' : response.status === 503 ? 'Serviço indisponível. Seu rascunho foi mantido.' : 'Não foi possível salvar. Seu rascunho foi mantido.');
            }
            const result = await response.json();
            if (requestEpoch !== epoch.current) return;
            const updated: Order = result.data;
            setOrder(updated); setEtag(response.headers.get('etag') || ''); setConflict(null);
            if (path === `/api/orders/${id}`) setMain(mainOf(updated));
            else if (method === 'PATCH') {
                const equipmentId = path.split('/').at(-1)!;
                const saved = updated.equipamentos.find(eq => eq._id === equipmentId);
                if (saved) setItems(value => ({ ...value, [equipmentId]: itemOf(saved) }));
            } else if (method === 'POST') {
                setItems(value => ({ ...value, ...Object.fromEntries(updated.equipamentos.filter(eq => !value[eq._id]).map(eq => [eq._id, itemOf(eq)])) }));
                setAdded(emptyItem());
            } else if (method === 'DELETE') {
                const equipmentId = path.split('/').at(-1)!;
                setItems(value => { const next = { ...value }; delete next[equipmentId]; return next; });
            }
            setSuccess('Alteração salva.');
        } catch (e) { if (requestEpoch === epoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão. Seu rascunho foi mantido.'); }
        finally { if (requestEpoch === epoch.current) setBusy(false); }
    }
    const path = `/api/orders/${id}`;
    const compositionLocked = !!order?.equipamentos.some(eq => eq.retirada);
    const mainField = (key: keyof Main, label: string, options: { required?: boolean; type?: string; max?: number } = {}) => <label className="block text-sm">{label}<input className={input} type={options.type || 'text'} required={options.required} maxLength={options.max} value={main?.[key] || ''} onChange={event => setMain(value => value ? { ...value, [key]: event.target.value } : value)} /></label>;
    const itemFields = (draft: ItemDraft, update: (patch: Partial<ItemDraft>) => void) => <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Identificação *<input className={input} required maxLength={160} value={draft.nome} onChange={e => update({ nome: e.target.value })} /></label>
        <label className="text-sm">Marca (opcional)<input className={input} maxLength={120} value={draft.marca} onChange={e => update({ marca: e.target.value })} /></label>
        <label className="text-sm">Modelo (opcional)<input className={input} maxLength={120} value={draft.modelo} onChange={e => update({ modelo: e.target.value })} /></label>
        <label className="text-sm">Série (opcional)<input className={input} maxLength={120} value={draft.numeroSerie} onChange={e => update({ numeroSerie: e.target.value })} /></label>
        <label className="text-sm">Solicitação<select className={input} value={draft.tipo} onChange={e => update({ tipo: e.target.value as ItemDraft['tipo'], descricao: '' })}><option value="relato">Defeito relatado</option><option value="testar">Testar — sem relato</option></select></label>
        {draft.tipo === 'relato' && <label className="text-sm sm:col-span-2">Defeito relatado *<textarea className={input} required maxLength={2000} value={draft.descricao} onChange={e => update({ descricao: e.target.value })} /></label>}
    </div>;
    return <main className="mx-auto max-w-4xl p-4 md:p-8"><Link href={`/ordens/${id}`} className="text-orange-700 underline">Voltar à ordem</Link><h1 className="mt-4 text-2xl font-bold">Editar ordem {order?.numero || ''}</h1>
        {loading ? <p role="status" className="mt-6">Carregando ordem...</p> : !order ? <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{error}<button className="ml-3 underline" onClick={() => void load()}>Tentar novamente</button></div> : order.compatibility?.legacy ? <p className="mt-6 rounded-lg bg-amber-50 p-4">Registro antigo somente para leitura; depende de reconciliação.</p> : <>
            <p className="mt-2 text-gray-600">Salve os dados da OS e cada equipamento separadamente.</p>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}{success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-4 text-green-800">{success}</p>}
            {conflict && <section className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4" aria-label="Conflito de edição"><h2 className="font-semibold">Outra alteração foi salva</h2><p className="mt-2">Versão atual: cliente {conflict.order.cliente.nome}, {conflict.order.equipamentos.length} equipamento(s). Seu formulário permanece preenchido. Compare com a <Link className="underline" href={`/ordens/${id}`} target="_blank">ordem atual em outra aba</Link>.</p><div className="mt-3 flex flex-wrap gap-3"><button className="rounded border bg-white px-3 py-2" onClick={() => apply(conflict.order, conflict.etag)}>Descartar meu rascunho</button><button className="rounded border bg-white px-3 py-2" onClick={() => { setEtag(conflict.etag); setOrder(conflict.order); setConflict(null); setError('Confira cada campo antes de salvar novamente.'); }}>Manter rascunho para revisar</button></div></section>}
            <form className="mt-6 rounded-xl border bg-white p-5" onSubmit={event => { event.preventDefault(); if (main) void save(path, 'PATCH', { cliente: { nome: main.nome, telefone: main.telefone, email: main.email || null }, dataEntrada: main.dataEntrada, dataPrevista: main.dataPrevista || null, tecnico: main.tecnico || null, observacoes: main.observacoes || null }); }}><h2 className="text-lg font-semibold">Dados da ordem</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{mainField('nome', 'Nome do cliente *', { required: true, max: 120 })}{mainField('telefone', 'Telefone *', { required: true, max: 32 })}{mainField('email', 'E-mail (opcional)', { type: 'email', max: 254 })}{mainField('dataEntrada', 'Data de entrada *', { type: 'date', required: true })}{mainField('dataPrevista', 'Data prevista (opcional)', { type: 'date' })}{mainField('tecnico', 'Técnico (opcional)', { max: 120 })}<label className="text-sm sm:col-span-2">Observações (opcional)<textarea className={input} maxLength={5000} value={main?.observacoes || ''} onChange={e => setMain(value => value ? { ...value, observacoes: e.target.value } : value)} /></label></div><button disabled={busy} className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">Salvar dados da ordem</button></form>
            <h2 className="mt-8 text-lg font-semibold">Equipamentos</h2><div className="mt-3 space-y-4">{order.equipamentos.map((eq, index) => <form key={eq._id} className="rounded-xl border bg-white p-5" onSubmit={event => { event.preventDefault(); void save(`${path}/equipamentos/${eq._id}`, 'PATCH', payload(items[eq._id])); }}><h3 className="font-semibold">Equipamento {index + 1}</h3><div className="mt-4">{itemFields(items[eq._id] || itemOf(eq), patch => setItems(value => ({ ...value, [eq._id]: { ...(value[eq._id] || itemOf(eq)), ...patch } })))}</div><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">Salvar equipamento</button>{!compositionLocked && order.equipamentos.length > 1 && <button type="button" disabled={busy} className="rounded-lg border border-red-300 px-4 py-2 text-red-700" onClick={() => { if (window.confirm(`Remover ${eq.nome} desta ordem?`)) void save(`${path}/equipamentos/${eq._id}`, 'DELETE'); }}>Remover</button>}</div></form>)}</div>
            {!compositionLocked && <form className="mt-6 rounded-xl border bg-white p-5" onSubmit={event => { event.preventDefault(); void save(`${path}/equipamentos`, 'POST', payload(added)); }}><h2 className="font-semibold">Adicionar equipamento</h2><div className="mt-4">{itemFields(added, patch => setAdded(value => ({ ...value, ...patch })))}</div><button disabled={busy} className="mt-4 rounded-lg border px-4 py-2 disabled:opacity-50">Adicionar</button></form>}
            {compositionLocked && <p className="mt-6 rounded-lg bg-amber-50 p-4">Após a primeira retirada, a composição da OS não pode ser alterada. Os dados descritivos continuam editáveis.</p>}
        </>}
    </main>;
}
