'use client';
import { useEffect, useRef, useState } from 'react';
import { formatPhoneInput, normalizePhone } from '../../shared/phone';

type Client = { _id: string; nome: string; telefone: string; email: string | null; version: number };
export type ClientSelection = { cliente: { nome: string; telefone: string; email: string | null } }
    | { clienteId: string; clienteVersion: number };
type Status = 'incomplete' | 'invalid' | 'loading' | 'found' | 'new' | 'error';
const input = 'w-full min-w-0 rounded-lg border bg-white px-3 py-2 read-only:bg-gray-50 disabled:bg-gray-100';

export function ClientLookup({ onChange, onSessionExpired, refresh = 0, fields }: {
    onChange: (selection: ClientSelection | null) => void;
    onSessionExpired: () => void;
    refresh?: number;
    fields: string[];
}) {
    const [phone, setPhone] = useState(''), [name, setName] = useState(''), [email, setEmail] = useState('');
    const [status, setStatus] = useState<Status>('incomplete'), [retry, setRetry] = useState(0);
    const generation = useRef(0), phoneElement = useRef<HTMLInputElement>(null);
    const controller = useRef<AbortController | null>(null);
    useEffect(() => {
        const current = ++generation.current;
        const abort = new AbortController(); controller.current = abort;
        onChange(null); setName(''); setEmail('');
        const normalized = normalizePhone(phone);
        if (!normalized) {
            setStatus(phone.replace(/\D/g, '').length >= 10 || /[^\d ()+-]/.test(phone) ? 'invalid' : 'incomplete');
            return () => { abort.abort(); };
        }
        setStatus('loading');
        const timeout = setTimeout(async () => {
            const isCurrent = () => !abort.signal.aborted && current === generation.current;
            try {
                const response = await fetch('/api/clients/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: normalized }), cache: 'no-store', signal: abort.signal });
                if (!isCurrent()) return;
                if (response.status === 401) { onSessionExpired(); return; }
                if (!response.ok) throw new Error('LOOKUP_FAILED');
                const result = await response.json();
                if (!isCurrent()) return;
                if (result.data === null) {
                    setStatus('new');
                    onChange({ cliente: { nome: '', telefone: normalized, email: null } });
                } else {
                    const client = result.data as Client;
                    if (!client?._id || client.telefone !== normalized || typeof client.nome !== 'string' || !Number.isSafeInteger(client.version)) throw new Error('INVALID_RESPONSE');
                    setName(client.nome); setEmail(client.email || ''); setStatus('found');
                    onChange({ clienteId: client._id, clienteVersion: client.version });
                }
            } catch { if (isCurrent()) setStatus('error'); }
        }, 350);
        return () => { clearTimeout(timeout); abort.abort(); };
    }, [phone, retry, refresh, onChange, onSessionExpired]);

    function changePhone(event: React.ChangeEvent<HTMLInputElement>) {
        generation.current++; controller.current?.abort(); onChange(null);
        setName(''); setEmail(''); setStatus('incomplete');
        let raw = event.target.value;
        let before = raw.slice(0, event.target.selectionStart ?? raw.length).replace(/\D/g, '').length;
        const type = (event.nativeEvent as InputEvent).inputType || '';
        // Backspace/Delete over a mask separator must still make progress.
        if (type.startsWith('delete') && raw.replace(/\D/g, '').length === phone.replace(/\D/g, '').length && raw !== phone) {
            const digits = raw.replace(/\D/g, '');
            const position = type === 'deleteContentBackward' ? Math.max(0, before - 1) : before;
            raw = digits.slice(0, position) + digits.slice(position + 1);
            if (type === 'deleteContentBackward') before = Math.max(0, before - 1);
        }
        const formatted = formatPhoneInput(raw);
        // +55 is removed only after a full valid international input is known.
        if (normalizePhone(raw) && raw.replace(/\D/g, '').length > 11) before = Math.max(0, before - 2);
        setPhone(formatted);
        requestAnimationFrame(() => {
            if (phoneElement.current?.value !== formatted || document.activeElement !== phoneElement.current) return;
            let caret = 0, digits = 0;
            while (caret < formatted.length && digits < before) { if (/\d/.test(formatted[caret])) digits++; caret++; }
            phoneElement.current.setSelectionRange(caret, caret);
        });
    }
    function changeDetails(nextName: string, nextEmail: string) {
        setName(nextName); setEmail(nextEmail);
        const telefone = normalizePhone(phone);
        if (status === 'new' && telefone) onChange({ cliente: { nome: nextName, telefone, email: nextEmail || null } });
    }
    const messages: Record<Status, string> = {
        incomplete: 'Informe o telefone com DDD para consultar o cadastro.',
        invalid: 'Confira o telefone: use DDD e número fixo ou celular completo.',
        loading: 'Buscando cliente...',
        found: 'Cliente encontrado. Nome e e-mail do cadastro serão usados nesta ordem.',
        new: 'Cliente não encontrado. Informe o nome; o cadastro será criado ao salvar a ordem.',
        error: 'Não foi possível consultar o cliente. Tente novamente antes de salvar.',
    };
    return <>
        <label className="min-w-0">Telefone *<input ref={phoneElement} className={input} type="tel" autoComplete="tel" required maxLength={40}
            value={phone} onChange={changePhone} aria-invalid={status === 'invalid' || fields.includes('cliente.telefone')}
            aria-describedby="client-lookup-status" /></label>
        <p id="client-lookup-status" role="status" aria-live="polite" className={`text-sm sm:col-span-2 ${status === 'error' || status === 'invalid' ? 'text-red-700' : 'text-gray-600'}`}>
            {messages[status]}{status === 'error' && <button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>Tentar consulta novamente</button>}
        </p>
        <label className="min-w-0">Nome *<input className={input} required maxLength={120} autoComplete="off" readOnly={status !== 'new'} value={name}
            onChange={e => changeDetails(e.target.value, email)} aria-invalid={fields.includes('cliente.nome')} aria-describedby={fields.includes('cliente.nome') ? 'client-name-error' : undefined} />
            {fields.includes('cliente.nome') && <span id="client-name-error" className="text-sm text-red-700">Confira o nome do cliente.</span>}</label>
        <label className="min-w-0">E-mail (opcional)<input className={input} type="email" maxLength={254} autoComplete="off" readOnly={status !== 'new'} value={email}
            onChange={e => changeDetails(name, e.target.value)} aria-invalid={fields.includes('cliente.email')} aria-describedby={fields.includes('cliente.email') ? 'client-email-error' : undefined} />
            {fields.includes('cliente.email') && <span id="client-email-error" className="text-sm text-red-700">Confira o e-mail ou deixe em branco.</span>}</label>
    </>;
}
