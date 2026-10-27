'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClientLookup, type ClientSelection } from './components/ClientLookup';

type Equipment = { key: string; nome: string; marca: string; modelo: string; numeroSerie: string; tipo: 'relato' | 'testar'; descricao: string };
const item = (): Equipment => ({ key: crypto.randomUUID(), nome: '', marca: '', modelo: '', numeroSerie: '', tipo: 'relato', descricao: '' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function NewOrder() {
    const router = useRouter();
    const [client, setClient] = useState<ClientSelection | null>(null);
    const [lookupRefresh, setLookupRefresh] = useState(0);
    const [expired, setExpired] = useState(false);
    const [equipment, setEquipment] = useState<Equipment[]>([item()]);
    const [date, setDate] = useState(today);
    const [saving, setSaving] = useState(false), [error, setError] = useState('');
    const [fields, setFields] = useState<string[]>([]);
    const attempt = useRef<string | null>(null);
    const active = useRef(true);
    const savingRequest = useRef<AbortController | null>(null);
    const expireSession = useCallback(() => {
        active.current = false; savingRequest.current?.abort(); setClient(null); setExpired(true);
        setEquipment([item()]); setFields([]); setError(''); router.replace('/login');
    }, [router]);
    const selectClient = useCallback((value: ClientSelection | null) => {
        setClient(value); attempt.current = null; setFields([]);
    }, []);
    useEffect(() => {
        active.current = true;
        const channel = new BroadcastChannel('ep-session');
        channel.onmessage = expireSession;
        return () => { active.current = false; savingRequest.current?.abort(); channel.close(); };
    }, [expireSession]);
    useEffect(() => { if (fields.length) document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [fields]);
    const fieldError = (path: string, id: string, label: string) => fields.includes(path) ? <span id={id} className="block text-sm text-red-700">Confira {label}.</span> : null;
    function changed() { attempt.current = null; setError(''); setFields([]); }
    function update(index: number, patch: Partial<Equipment>) { changed(); setEquipment(items => items.map((value, i) => i === index ? { ...value, ...patch } : value)); }
    async function save(event: React.FormEvent) {
        event.preventDefault();
        if (saving || !client || !active.current) return;
        setSaving(true); setError(''); setFields([]);
        if (!attempt.current) attempt.current = crypto.randomUUID();
        const body = {
            ...client,
            equipamentos: equipment.map(({ nome, marca, modelo, numeroSerie, tipo, descricao }) => ({ nome, marca: marca || null, modelo: modelo || null, numeroSerie: numeroSerie || null, solicitacao: { tipo, descricao: tipo === 'testar' ? null : descricao } })),
            dataEntrada: date,
        };
        const controller = new AbortController(); savingRequest.current = controller;
        try {
            const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.current }, body: JSON.stringify(body), cache: 'no-store', signal: controller.signal });
            if (!active.current || controller.signal.aborted) return;
            if (response.status === 401) { expireSession(); return; }
            if (!response.ok) {
                const failure = await response.json().catch(() => ({}));
                if (!active.current || controller.signal.aborted) return;
                if (['CLIENT_REVIEW_REQUIRED', 'CLIENT_CHANGED'].includes(failure.error?.code)) {
                    setClient(null); setLookupRefresh(value => value + 1);
                    setError('O cadastro deste telefone mudou ou já existe. Confira o resultado da nova consulta antes de salvar; os equipamentos foram mantidos.');
                    return;
                }
                if (response.status === 400 && Array.isArray(failure.error?.fields)) setFields(failure.error.fields.map((field: { path: string }) => field.path));
                setError(response.status === 400 ? 'Confira os campos indicados.' : response.status === 409 ? 'Esta tentativa já foi usada com outros dados. Revise antes de tentar novamente.' : 'Não foi possível salvar. Seus dados foram mantidos; tente novamente.');
                return;
            }
            const result = await response.json();
            if (!result.data?._id) throw new Error('INVALID_RESPONSE');
            if (active.current) router.replace(`/ordens/${result.data._id}`);
        } catch { if (active.current) setError('Falha de conexão. Seus dados foram mantidos; tente novamente.'); }
        finally { if (active.current) setSaving(false); }
    }
    const input = 'w-full rounded-lg border bg-white px-3 py-2';
    if (expired) return <main className="p-6" role="status">Sessão encerrada. Abrindo o login...</main>;
    return <main className="mx-auto max-w-4xl p-4 md:p-8">
        <Link href="/ordens" className="text-orange-700 underline">Voltar às ordens</Link>
        <h1 className="mt-4 text-2xl font-bold">Nova ordem de serviço</h1>
        <p className="mt-1 text-gray-600">Cadastre o cliente e todos os equipamentos recebidos.</p>
        <form onSubmit={save} className="mt-6"><fieldset disabled={saving} className="min-w-0 space-y-6"><legend className="sr-only">Nova ordem</legend>
            <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Cliente</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ClientLookup onChange={selectClient} onSessionExpired={expireSession} refresh={lookupRefresh} fields={fields} />
                <label>Data de entrada *<input className={input} type="date" required value={date} onChange={e => { changed(); setDate(e.target.value); }} aria-invalid={fields.includes('dataEntrada')} aria-describedby={fields.includes('dataEntrada') ? 'entry-date-error' : undefined} />{fieldError('dataEntrada', 'entry-date-error', 'a data de entrada')}</label>
            </div></section>
            <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Equipamentos</h2><button type="button" className="rounded-lg border bg-white px-4 py-2" onClick={() => { changed(); setEquipment(v => [...v, item()]); }}>Adicionar equipamento</button></div>
                <div className="mt-3 space-y-4">{equipment.map((eq, index) => <fieldset key={eq.key} className="rounded-xl border bg-white p-5"><legend className="px-1 font-medium">Equipamento {index + 1}</legend>
                    <div className="grid gap-4 sm:grid-cols-2"><label>Identificação *<input className={input} required maxLength={160} value={eq.nome} onChange={e => update(index, { nome: e.target.value })} aria-invalid={fields.includes(`equipamentos.${index}.nome`)} aria-describedby={fields.includes(`equipamentos.${index}.nome`) ? `equipment-${index}-name-error` : undefined} />{fieldError(`equipamentos.${index}.nome`, `equipment-${index}-name-error`, 'a identificação do equipamento')}</label>
                        <label>Marca (opcional)<input className={input} maxLength={120} value={eq.marca} onChange={e => update(index, { marca: e.target.value })} /></label>
                        <label>Modelo (opcional)<input className={input} maxLength={120} value={eq.modelo} onChange={e => update(index, { modelo: e.target.value })} /></label>
                        <label>Número de série (opcional)<input className={input} maxLength={120} value={eq.numeroSerie} onChange={e => update(index, { numeroSerie: e.target.value })} /></label>
                    </div><div className="mt-4"><label className="block">Solicitação<select className={input} value={eq.tipo} onChange={e => update(index, { tipo: e.target.value as Equipment['tipo'], descricao: '' })}><option value="relato">Defeito relatado</option><option value="testar">Testar — sem defeito relatado</option></select></label>
                        {eq.tipo === 'relato' && <label className="mt-4 block">Defeito relatado *<textarea className={input} required maxLength={2000} value={eq.descricao} onChange={e => update(index, { descricao: e.target.value })} aria-invalid={fields.includes(`equipamentos.${index}.solicitacao.descricao`)} aria-describedby={fields.includes(`equipamentos.${index}.solicitacao.descricao`) ? `equipment-${index}-description-error` : undefined} />{fieldError(`equipamentos.${index}.solicitacao.descricao`, `equipment-${index}-description-error`, 'o relato')}</label>}</div>
                    {equipment.length > 1 && <button type="button" className="mt-4 text-red-700 underline" onClick={() => { changed(); setEquipment(v => v.filter(value => value.key !== eq.key)); }}>Remover equipamento {index + 1}</button>}
                </fieldset>)}</div></section>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
            <button disabled={saving || !client} className="rounded-lg bg-orange-600 px-5 py-3 font-medium text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar ordem'}</button>
            </fieldset>
        </form>
    </main>;
}
