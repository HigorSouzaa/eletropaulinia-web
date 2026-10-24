'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Equipment = { key: string; nome: string; marca: string; modelo: string; numeroSerie: string; tipo: 'relato' | 'testar'; descricao: string };
const item = (): Equipment => ({ key: crypto.randomUUID(), nome: '', marca: '', modelo: '', numeroSerie: '', tipo: 'relato', descricao: '' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function NewOrder() {
    const router = useRouter();
    const [client, setClient] = useState({ nome: '', telefone: '', email: '' });
    const [equipment, setEquipment] = useState<Equipment[]>([item()]);
    const [date, setDate] = useState(today);
    const [saving, setSaving] = useState(false), [error, setError] = useState('');
    const [fields, setFields] = useState<string[]>([]);
    const attempt = useRef<string | null>(null);
    const active = useRef(true);
    useEffect(() => {
        const channel = new BroadcastChannel('ep-session');
        channel.onmessage = () => { active.current = false; router.replace('/login'); };
        return () => { active.current = false; channel.close(); };
    }, [router]);
    function changed() { attempt.current = null; setError(''); setFields([]); }
    function update(index: number, patch: Partial<Equipment>) { changed(); setEquipment(items => items.map((value, i) => i === index ? { ...value, ...patch } : value)); }
    async function save(event: React.FormEvent) {
        event.preventDefault();
        if (saving) return;
        setSaving(true); setError(''); setFields([]);
        if (!attempt.current) attempt.current = crypto.randomUUID();
        const body = {
            cliente: { nome: client.nome, telefone: client.telefone, email: client.email || null },
            equipamentos: equipment.map(({ nome, marca, modelo, numeroSerie, tipo, descricao }) => ({ nome, marca: marca || null, modelo: modelo || null, numeroSerie: numeroSerie || null, solicitacao: { tipo, descricao: tipo === 'testar' ? null : descricao } })),
            dataEntrada: date,
        };
        try {
            const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.current }, body: JSON.stringify(body), cache: 'no-store' });
            if (response.status === 401) { router.replace('/login'); return; }
            if (!response.ok) {
                const failure = await response.json().catch(() => ({}));
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
    return <main className="mx-auto max-w-4xl p-4 md:p-8">
        <Link href="/ordens" className="text-orange-700 underline">Voltar às ordens</Link>
        <h1 className="mt-4 text-2xl font-bold">Nova ordem de serviço</h1>
        <p className="mt-1 text-gray-600">Cadastre o cliente e todos os equipamentos recebidos.</p>
        <form onSubmit={save} className="mt-6 space-y-6">
            <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Cliente</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>Nome *<input className={input} required maxLength={120} value={client.nome} onChange={e => { changed(); setClient(v => ({ ...v, nome: e.target.value })); }} aria-invalid={fields.includes('cliente.nome')} /></label>
                <label>Telefone *<input className={input} required maxLength={32} value={client.telefone} onChange={e => { changed(); setClient(v => ({ ...v, telefone: e.target.value })); }} aria-invalid={fields.includes('cliente.telefone')} /></label>
                <label>E-mail (opcional)<input className={input} type="email" maxLength={254} value={client.email} onChange={e => { changed(); setClient(v => ({ ...v, email: e.target.value })); }} aria-invalid={fields.includes('cliente.email')} /></label>
                <label>Data de entrada *<input className={input} type="date" required value={date} onChange={e => { changed(); setDate(e.target.value); }} aria-invalid={fields.includes('dataEntrada')} /></label>
            </div></section>
            <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Equipamentos</h2><button type="button" className="rounded-lg border bg-white px-4 py-2" onClick={() => { changed(); setEquipment(v => [...v, item()]); }}>Adicionar equipamento</button></div>
                <div className="mt-3 space-y-4">{equipment.map((eq, index) => <fieldset key={eq.key} className="rounded-xl border bg-white p-5"><legend className="px-1 font-medium">Equipamento {index + 1}</legend>
                    <div className="grid gap-4 sm:grid-cols-2"><label>Identificação *<input className={input} required maxLength={160} value={eq.nome} onChange={e => update(index, { nome: e.target.value })} aria-invalid={fields.includes(`equipamentos.${index}.nome`)} /></label>
                        <label>Marca (opcional)<input className={input} maxLength={120} value={eq.marca} onChange={e => update(index, { marca: e.target.value })} /></label>
                        <label>Modelo (opcional)<input className={input} maxLength={120} value={eq.modelo} onChange={e => update(index, { modelo: e.target.value })} /></label>
                        <label>Número de série (opcional)<input className={input} maxLength={120} value={eq.numeroSerie} onChange={e => update(index, { numeroSerie: e.target.value })} /></label>
                    </div><div className="mt-4"><label className="block">Solicitação<select className={input} value={eq.tipo} onChange={e => update(index, { tipo: e.target.value as Equipment['tipo'], descricao: '' })}><option value="relato">Defeito relatado</option><option value="testar">Testar — sem defeito relatado</option></select></label>
                        {eq.tipo === 'relato' && <label className="mt-4 block">Defeito relatado *<textarea className={input} required maxLength={2000} value={eq.descricao} onChange={e => update(index, { descricao: e.target.value })} aria-invalid={fields.includes(`equipamentos.${index}.solicitacao.descricao`)} /></label>}</div>
                    {equipment.length > 1 && <button type="button" className="mt-4 text-red-700 underline" onClick={() => { changed(); setEquipment(v => v.filter(value => value.key !== eq.key)); }}>Remover equipamento {index + 1}</button>}
                </fieldset>)}</div></section>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}{fields.length > 0 && <span className="block text-sm">{fields.join(', ')}</span>}</p>}
            <button disabled={saving} className="rounded-lg bg-orange-600 px-5 py-3 font-medium text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar ordem'}</button>
        </form>
    </main>;
}
