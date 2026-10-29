'use client';
import { useEffect, useState } from 'react';
export function LoginForm() {
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [service, setService] = useState<'checking' | 'ready' | 'starting' | 'unavailable'>('checking');
    const [checkCycle, setCheckCycle] = useState(0);
    useEffect(() => {
        // Remover apenas as chaves de sessão do frontend legado, sem migrar tokens.
        try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* armazenamento desabilitado */ }
    }, []);
    useEffect(() => {
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const started = Date.now();
        const check = async () => {
            try {
                const response = await fetch('/api/system/ready', { cache: 'no-store' });
                if (!active) return;
                if (response.ok) {
                    setService('ready');
                    return;
                }
            } catch { /* serviço ainda indisponível */ }
            if (!active) return;
            if (Date.now() - started >= 90000) {
                setService('unavailable');
                return;
            }
            setService('starting');
            timer = setTimeout(check, 5000);
        };
        setService('checking');
        void check();
        return () => { active = false; if (timer) clearTimeout(timer); };
    }, [checkCycle]);
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError('');
        const form = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/session/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message);
                if (response.status === 503) setCheckCycle(cycle => cycle + 1);
                return;
            }
            const channel = new BroadcastChannel('ep-session');
            channel.postMessage('changed');
            channel.close();
            window.location.replace('/dashboard');
        }
        catch {
            setError('Não foi possível conectar. Tente novamente.');
        }
        finally {
            setBusy(false);
        }
    }
    return <main className="flex min-h-screen bg-white">
 <section className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-md">
 <h1 className="text-3xl font-bold">Eletro <span className="text-orange-500">Paulínia</span></h1><p className="mt-1 text-gray-600">Assistência Técnica</p>
 <h2 className="mt-10 text-2xl font-bold">Acesse sua conta</h2><p className="mt-2 text-gray-600">Informe seu usuário e senha.</p>
 <form onSubmit={submit} className="mt-8 space-y-5">
 {service === 'checking' || service === 'starting' ? <p role="status" className="rounded-lg bg-orange-50 p-3 text-orange-900">Preparando o sistema. No plano gratuito, isso pode levar cerca de um minuto.</p> : service === 'unavailable' ? <div role="status" className="rounded-lg bg-orange-50 p-3 text-orange-900">O serviço ainda não respondeu. <button type="button" className="underline" onClick={() => setCheckCycle(cycle => cycle + 1)}>Verificar novamente</button></div> : null}
 <div><label htmlFor="username" className="mb-2 block font-medium">Usuário</label><input id="username" name="username" autoComplete="username" required maxLength={100} className="w-full rounded-lg border px-4 py-3"/></div>
 <div><label htmlFor="password" className="mb-2 block font-medium">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded-lg border px-4 py-3"/></div>
 {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
 <button disabled={busy} className="w-full rounded-lg bg-gray-900 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Entrando...' : 'Entrar'}</button>
 </form></div></section>
 <aside className="hidden flex-1 items-center justify-center bg-gray-600 p-12 lg:flex"><img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&auto=format&fit=crop&q=80" alt="Técnico consertando equipamento eletrônico" className="h-[600px] w-full max-w-lg rounded-2xl object-cover shadow-xl"/></aside>
 </main>;
}
