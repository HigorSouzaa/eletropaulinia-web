'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Equipment = { _id: string; nome: string | null; marca: string | null; modelo: string | null; numeroSerie: string | null; solicitacao: { tipo: string; descricao: string | null }; andamento: string | null; retirada: { retiradoEm: string | null; origem: string } | null; historicoRetiradas?: { tipo: 'retirada' | 'correcao'; em: string; motivo?: string | null }[] };
type Order = { _id: string; numero: string; cliente: { nome: string | null; telefone: string | null; email: string | null }; equipamentos: Equipment[]; dataEntrada: string; dataPrevista: string | null; tecnico: string | null; observacoes: string | null; status: string; entrega: { retirados: number; total: number }; compatibility?: { legacy: boolean; readOnly: boolean; requiresReconciliation: boolean } };
const when = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Horário histórico desconhecido';
const civil = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value || 'Não informada';
export function OrderDetail({ id }: { id: string }) {
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null), [etag, setEtag] = useState(''), [role, setRole] = useState('');
    const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
    const [pickup, setPickup] = useState<Equipment | null>(null), [correction, setCorrection] = useState<Equipment | null>(null), [reason, setReason] = useState(''), [deleting, setDeleting] = useState(false), [confirmNumber, setConfirmNumber] = useState('');
    const controller = useRef<AbortController | null>(null), epoch = useRef(0), pickupButton = useRef<HTMLButtonElement | null>(null), correctionButton = useRef<HTMLButtonElement | null>(null), deleteButton = useRef<HTMLButtonElement | null>(null);
    const pickupConfirm = useRef<HTMLButtonElement | null>(null), correctionInput = useRef<HTMLTextAreaElement | null>(null), deleteInput = useRef<HTMLInputElement | null>(null);
    const invalidate = useCallback(() => { epoch.current++; }, []);
    const load = useCallback(async () => {
        const requestEpoch = ++epoch.current;
        controller.current?.abort(); const current = new AbortController(); controller.current = current;
        setOrder(null); setEtag(''); setRole(''); setError(''); setLoading(true);
        try {
            const me = await fetch('/api/session/me', { cache: 'no-store', signal: current.signal });
            if (me.status === 401) { router.replace('/login'); return; }
            if (!me.ok) throw new Error('Não foi possível verificar a sessão.');
            const profile = await me.json();
            const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: 'no-store', signal: current.signal });
            if (response.status === 401) { router.replace('/login'); return; }
            if (response.status === 404) throw new Error('Ordem não encontrada.');
            if (!response.ok) throw new Error('Não foi possível carregar a ordem.');
            const result = await response.json();
            if (!result.data?._id) throw new Error('Resposta inválida da API.');
            if (!current.signal.aborted && requestEpoch === epoch.current) { setOrder(result.data); setEtag(response.headers.get('etag') || ''); setRole(profile.role); }
        } catch (e) { if (!current.signal.aborted && requestEpoch === epoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão.'); }
        finally { if (!current.signal.aborted && requestEpoch === epoch.current) setLoading(false); }
    }, [id, router]);
    useEffect(() => {
        void load();
        const channel = new BroadcastChannel('ep-session');
        channel.onmessage = () => { epoch.current++; controller.current?.abort(); setOrder(null); router.replace('/login'); };
        const visible = () => { if (document.visibilityState === 'visible') void load(); else { epoch.current++; controller.current?.abort(); setOrder(null); } };
        document.addEventListener('visibilitychange', visible);
        return () => { invalidate(); controller.current?.abort(); channel.close(); document.removeEventListener('visibilitychange', visible); };
    }, [load, router, invalidate]);
    useEffect(() => { if (pickup) pickupConfirm.current?.focus(); else if (correction) correctionInput.current?.focus(); else if (deleting) deleteInput.current?.focus(); }, [pickup, correction, deleting]);
    function closePickup() { setPickup(null); requestAnimationFrame(() => pickupButton.current?.focus()); }
    function closeCorrection() { setCorrection(null); setReason(''); requestAnimationFrame(() => correctionButton.current?.focus()); }
    function closeDelete() { setDeleting(false); setConfirmNumber(''); requestAnimationFrame(() => deleteButton.current?.focus()); }
    async function change(path: string, method: 'PATCH' | 'PUT' | 'POST' | 'DELETE', body?: unknown) {
        if (!etag) { setError('Atualize a ordem antes de alterar.'); return; }
        const requestEpoch = epoch.current;
        setBusy(true); setError('');
        try {
            const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'If-Match': etag, 'X-Resource-Version': etag }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store' });
            if (requestEpoch !== epoch.current) return;
            if (response.status === 401) { setOrder(null); router.replace('/login'); return; }
            if (response.status === 204) { router.replace('/ordens'); return; }
            if (response.status === 412) throw new Error('Outra pessoa alterou esta ordem. Atualize a página antes de tentar novamente.');
            if (response.status === 403) throw new Error('Você não tem permissão para esta ação.');
            if (response.status === 404) throw new Error('Ordem ou equipamento não encontrado.');
            if (!response.ok) throw new Error(response.status === 503 ? 'Serviço indisponível. Tente novamente.' : 'Não foi possível concluir a operação.');
            const result = await response.json();
            if (requestEpoch !== epoch.current) return;
            setOrder(result.data); setEtag(response.headers.get('etag') || '');
            closePickup(); closeCorrection(); closeDelete();
        } catch (e) { if (requestEpoch === epoch.current) { setError(e instanceof Error ? e.message : 'Falha de conexão.'); if (method !== 'POST') { closePickup(); closeCorrection(); closeDelete(); } } }
        finally { if (requestEpoch === epoch.current) setBusy(false); }
    }
    const path = `/api/orders/${id}`;
    const dialogKey = (event: React.KeyboardEvent<HTMLDivElement>, close: () => void) => {
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')];
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    return <main className="mx-auto max-w-4xl p-4 md:p-8"><Link href="/ordens" className="text-orange-700 underline">Voltar às ordens</Link>
        {loading ? <p className="mt-6" role="status">Carregando ordem...</p> : error && !order ? <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void load()}>Tentar novamente</button></div> : order && <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">Ordem {order.numero}</h1><p className="mt-2 text-gray-600">{order.status} · {order.entrega.retirados} de {order.entrega.total} retirado(s)</p></div>
                {!order.compatibility?.legacy && <div className="flex flex-wrap gap-2"><Link href={`/editar-ordem/${id}`} className="rounded-lg border bg-white px-4 py-2">Editar</Link>{role === 'admin' && <button ref={deleteButton} className="rounded-lg border border-red-300 px-4 py-2 text-red-700" onClick={() => setDeleting(true)}>Excluir OS</button>}</div>}</div>
            {order.compatibility?.legacy && <p className="mt-3 rounded-lg bg-amber-50 p-4 text-amber-900">Registro antigo somente para leitura. Requer reconciliação antes de alterações.</p>}
            {error && <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void load()}>Atualizar dados</button></div>}
            <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Cliente e ordem</h2><dl className="mt-3 grid gap-2 sm:grid-cols-2"><div><dt className="font-medium">Nome</dt><dd>{order.cliente.nome || 'Não informado'}</dd></div><div><dt className="font-medium">Telefone</dt><dd>{order.cliente.telefone || 'Não informado'}</dd></div><div><dt className="font-medium">E-mail</dt><dd>{order.cliente.email || 'Não informado'}</dd></div><div><dt className="font-medium">Entrada</dt><dd>{civil(order.dataEntrada)}</dd></div><div><dt className="font-medium">Previsão</dt><dd>{civil(order.dataPrevista)}</dd></div><div><dt className="font-medium">Técnico</dt><dd>{order.tecnico || 'Não informado'}</dd></div><div className="sm:col-span-2"><dt className="font-medium">Observações</dt><dd className="whitespace-pre-wrap">{order.observacoes || 'Nenhuma'}</dd></div></dl></section>
            <section className="mt-6"><h2 className="text-lg font-semibold">Equipamentos</h2><div className="mt-3 space-y-3">{order.equipamentos.map((eq, index) => <article key={eq._id} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">{index + 1}. {eq.nome || 'Não informado'}</h3><p className="mt-1 text-sm text-gray-600">{eq.andamento || 'Andamento não informado'} · {eq.retirada ? 'Retirado' : 'Na empresa'}</p><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-medium">Marca</dt><dd>{eq.marca || 'Não informada'}</dd></div><div><dt className="font-medium">Modelo</dt><dd>{eq.modelo || 'Não informado'}</dd></div><div><dt className="font-medium">Série</dt><dd>{eq.numeroSerie || 'Não informada'}</dd></div><div><dt className="font-medium">Solicitação</dt><dd>{eq.solicitacao.tipo === 'testar' ? 'Testar' : eq.solicitacao.descricao || 'Não informada'}</dd></div></dl>
                {eq.retirada && <p className="mt-3 text-sm">Retirada: {when(eq.retirada.retiradoEm)}</p>}
                {!!eq.historicoRetiradas?.length && <details className="mt-3 text-sm"><summary className="cursor-pointer">Histórico de retiradas e correções</summary><ol className="mt-2 list-inside list-decimal">{eq.historicoRetiradas.map((event, eventIndex) => <li key={eventIndex}>{event.tipo === 'retirada' ? 'Retirada' : 'Correção'} em {when(event.em)}{event.motivo ? ` — ${event.motivo}` : ''}</li>)}</ol></details>}
                {!order.compatibility?.legacy && eq.retirada?.origem === 'operacao' && <button ref={correctionButton} disabled={busy} className="mt-3 rounded-lg border px-4 py-2" onClick={event => { correctionButton.current = event.currentTarget; setCorrection(eq); }}>Corrigir retirada</button>}
                {!order.compatibility?.legacy && !eq.retirada && <div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-sm">Andamento<select disabled={busy} aria-label={`Andamento de ${eq.nome}`} value={eq.andamento || 'Aguardando'} onChange={event => void change(`${path}/equipamentos/${eq._id}`, 'PATCH', { andamento: event.target.value })} className="ml-2 rounded-lg border p-2"><option>Aguardando</option><option>Em andamento</option><option>Pronto</option></select></label>
                    <button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-white" onClick={event => { pickupButton.current = event.currentTarget; setPickup(eq); }}>Registrar retirada</button></div>}
            </article>)}</div></section>
            {pickup && <div role="dialog" aria-modal="true" aria-labelledby="pickup-title" onKeyDown={event => dialogKey(event, closePickup)} className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6"><h2 id="pickup-title" className="text-lg font-bold">Confirmar retirada</h2><p className="mt-3">Registrar a retirada de <strong>{pickup.nome}</strong>? A data e a hora serão registradas pela API.</p>{pickup.andamento !== 'Pronto' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">Este equipamento ainda não está Pronto. Confirme que o cliente decidiu retirá-lo mesmo assim.</p>}<div className="mt-5 flex gap-3"><button ref={pickupConfirm} disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-white" onClick={() => void change(`${path}/equipamentos/${pickup._id}/retirada`, 'PUT')}>Confirmar retirada</button><button disabled={busy} className="rounded-lg border px-4 py-2" onClick={closePickup}>Cancelar</button></div></div></div>}
            {correction && <div role="dialog" aria-modal="true" aria-labelledby="correction-title" onKeyDown={event => dialogKey(event, closeCorrection)} className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6"><h2 id="correction-title" className="text-lg font-bold">Corrigir retirada</h2><p className="mt-3">A retirada de <strong>{correction.nome}</strong> foi registrada por engano? O evento anterior permanecerá no histórico.</p><label className="mt-4 block text-sm">Motivo da correção<textarea ref={correctionInput} className="mt-1 w-full rounded-lg border p-2" maxLength={500} required value={reason} onChange={event => setReason(event.target.value)} /></label>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-5 flex gap-3"><button disabled={busy || !reason.trim()} className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => void change(`${path}/equipamentos/${correction._id}/correcoes-retirada`, 'POST', { motivo: reason.trim() })}>Confirmar correção</button><button disabled={busy} className="rounded-lg border px-4 py-2" onClick={closeCorrection}>Cancelar</button></div></div></div>}
            {deleting && <div role="dialog" aria-modal="true" aria-labelledby="delete-title" onKeyDown={event => dialogKey(event, closeDelete)} className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6"><h2 id="delete-title" className="text-lg font-bold">Excluir ordem</h2><p className="mt-3">A OS e seus equipamentos serão removidos da base ativa. Digite <strong>{order.numero}</strong> para confirmar.</p><label className="mt-4 block">Número da OS<input ref={deleteInput} className="mt-1 w-full rounded-lg border p-2" value={confirmNumber} onChange={event => setConfirmNumber(event.target.value)} /></label><div className="mt-5 flex gap-3"><button disabled={busy || confirmNumber !== order.numero} className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void change(path, 'DELETE')}>Excluir definitivamente</button><button disabled={busy} className="rounded-lg border px-4 py-2" onClick={closeDelete}>Cancelar</button></div></div></div>}
        </>}
    </main>;
}
