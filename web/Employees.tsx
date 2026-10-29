'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Employee = { _id: string; username: string; name: string; role: 'admin' | 'tecnico' | 'atendente'; active: boolean; version: number };
type Editor = { current: Employee; etag: string; name: string; role: Employee['role']; password: string };
const input = 'mt-1 w-full rounded-lg border bg-white px-3 py-2';
export function Employees() {
    const router = useRouter();
    const [list, setList] = useState<Employee[]>([]), [page, setPage] = useState(1), [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [newUser, setNewUser] = useState({ username: '', name: '', password: '', role: 'atendente' as Employee['role'] });
    const [editor, setEditor] = useState<Editor | null>(null), [conflict, setConflict] = useState<{ current: Employee; etag: string } | null>(null);
    const controller = useRef<AbortController | null>(null), sessionEpoch = useRef(0);
    const invalidate = useCallback(() => { sessionEpoch.current++; }, []);
    const load = useCallback(async () => {
        const epoch = sessionEpoch.current;
        controller.current?.abort(); const current = new AbortController(); controller.current = current;
        setLoading(true); setError(''); setList([]);
        try {
            const response = await fetch(`/api/employees?page=${page}&pageSize=25`, { cache: 'no-store', signal: current.signal });
            if (response.status === 401) { setEditor(null); router.replace('/login'); return; }
            if (response.status === 403) { setEditor(null); router.replace('/ordens'); return; }
            if (!response.ok) throw new Error('Não foi possível carregar os funcionários.');
            const result = await response.json();
            if (!Array.isArray(result.data) || !result.meta) throw new Error('Resposta inválida da API.');
            if (!current.signal.aborted && epoch === sessionEpoch.current) { setList(result.data); setPages(result.meta.totalPages); }
        } catch (e) { if (!current.signal.aborted && epoch === sessionEpoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão.'); }
        finally { if (!current.signal.aborted && epoch === sessionEpoch.current) setLoading(false); }
    }, [page, router]);
    useEffect(() => {
        void load(); const channel = new BroadcastChannel('ep-session');
        channel.onmessage = () => { sessionEpoch.current++; controller.current?.abort(); setList([]); setEditor(null); router.replace('/login'); };
        const visible = () => { if (document.visibilityState === 'hidden') { sessionEpoch.current++; controller.current?.abort(); setList([]); setEditor(null); } else void load(); };
        document.addEventListener('visibilitychange', visible);
        return () => { invalidate(); controller.current?.abort(); channel.close(); document.removeEventListener('visibilitychange', visible); };
    }, [load, router, invalidate]);
    async function open(user: Employee) {
        const epoch = sessionEpoch.current;
        setError(''); setNotice('');
        const response = await fetch(`/api/employees/${user._id}`, { cache: 'no-store' }).catch(() => null);
        if (epoch !== sessionEpoch.current) return;
        if (response?.status === 401) { setEditor(null); router.replace('/login'); return; }
        if (!response?.ok) { setError('Não foi possível abrir este funcionário.'); return; }
        const { data } = await response.json();
        if (epoch !== sessionEpoch.current) return;
        setEditor({ current: data, etag: response.headers.get('etag') || '', name: data.name, role: data.role, password: '' }); setConflict(null);
    }
    async function create(event: React.FormEvent) {
        const epoch = sessionEpoch.current;
        event.preventDefault(); setBusy(true); setError(''); setNotice('');
        try {
            const response = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser), cache: 'no-store' });
            if (epoch !== sessionEpoch.current) return;
            if (response.status === 401) { setEditor(null); router.replace('/login'); return; }
            if (response.status === 403) throw new Error('Você não tem permissão para cadastrar funcionários.');
            if (!response.ok) throw new Error(response.status === 409 ? 'Este nome de usuário já existe.' : response.status === 400 ? 'Confira nome, usuário e senha (12 a 72 bytes).' : 'Não foi possível cadastrar. Os dados foram mantidos.');
            setNewUser({ username: '', name: '', password: '', role: 'atendente' }); setNotice('Funcionário cadastrado. A sessão atual foi mantida.'); await load();
        } catch (e) { if (epoch === sessionEpoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão.'); }
        finally { if (epoch === sessionEpoch.current) setBusy(false); }
    }
    async function edit(path: string, method: 'PATCH' | 'POST', body: unknown, success: string) {
        if (!editor?.etag) return;
        const epoch = sessionEpoch.current;
        setBusy(true); setError(''); setNotice('');
        try {
            const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'If-Match': editor.etag, 'X-Resource-Version': editor.etag }, body: JSON.stringify(body), cache: 'no-store' });
            if (epoch !== sessionEpoch.current) return;
            if (response.status === 401) { setEditor(null); router.replace('/login'); return; }
            if (response.status === 412) {
                const latest = await fetch(`/api/employees/${editor.current._id}`, { cache: 'no-store' });
                if (latest.ok) { const data = await latest.json(); if (epoch === sessionEpoch.current) setConflict({ current: data.data, etag: latest.headers.get('etag') || '' }); }
                throw new Error('Este cadastro mudou. Seu rascunho foi mantido; compare antes de continuar.');
            }
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(response.status === 409 && result.error?.code === 'LAST_ADMIN' ? 'É necessário manter pelo menos um administrador ativo.' : response.status === 403 ? 'Acesso não permitido.' : response.status === 400 ? 'Confira os dados informados.' : 'Não foi possível salvar. Seu rascunho foi mantido.');
            }
            if (response.status === 204) { setEditor(value => value ? { ...value, password: '' } : value); await open(editor.current); }
            else { const { data } = await response.json(); if (epoch !== sessionEpoch.current) return; setEditor({ current: data, etag: response.headers.get('etag') || '', name: data.name, role: data.role, password: '' }); }
            if (epoch !== sessionEpoch.current) return;
            setConflict(null); setNotice(success); await load();
        } catch (e) { if (epoch === sessionEpoch.current) setError(e instanceof Error ? e.message : 'Falha de conexão.'); }
        finally { if (epoch === sessionEpoch.current) setBusy(false); }
    }
    const target = editor ? `/api/employees/${editor.current._id}` : '';
    return <main className="mx-auto max-w-5xl p-4 md:p-8"><h1 className="text-2xl font-bold">Funcionários</h1><p className="mt-2 text-gray-600">Cadastro e acesso da equipe. Apenas administradores podem alterar estes dados.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}{notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-4 text-green-800">{notice}</p>}
        <form onSubmit={create} className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Cadastrar funcionário</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label>Nome *<input className={input} required maxLength={120} value={newUser.name} onChange={e => setNewUser(v => ({ ...v, name: e.target.value }))} /></label><label>Usuário *<input className={input} required minLength={3} maxLength={100} autoComplete="off" value={newUser.username} onChange={e => setNewUser(v => ({ ...v, username: e.target.value }))} /></label><label>Senha inicial *<input className={input} type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={newUser.password} onChange={e => setNewUser(v => ({ ...v, password: e.target.value }))} /></label><label>Perfil<select className={input} value={newUser.role} onChange={e => setNewUser(v => ({ ...v, role: e.target.value as Employee['role'] }))}><option value="atendente">Atendente</option><option value="tecnico">Técnico</option><option value="admin">Administrador</option></select></label></div><button disabled={busy} className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">Cadastrar</button></form>
        <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Equipe</h2><button className="rounded-lg border bg-white px-3 py-2" onClick={() => void load()} disabled={loading}>Atualizar</button></div>{loading ? <p className="mt-4" role="status">Carregando funcionários...</p> : list.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{list.map(user => <article className="rounded-xl border bg-white p-4" key={user._id}><h3 className="font-semibold">{user.name}</h3><p className="text-sm text-gray-600">{user.username} · {user.role} · {user.active ? 'Ativo' : 'Desativado'}</p><button className="mt-3 text-orange-700 underline" onClick={() => void open(user)}>Gerenciar</button></article>)}</div> : <p className="mt-4 rounded-xl border bg-white p-5">Nenhum funcionário nesta página.</p>}
            <nav aria-label="Paginação de funcionários" className="mt-4 flex items-center gap-3"><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Anterior</button><span>Página {page} de {Math.max(pages, 1)}</span><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(v => v + 1)}>Próxima</button></nav></section>
        {editor && <section className="mt-8 rounded-xl border bg-white p-5" aria-label="Editar funcionário"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Gerenciar {editor.current.username}</h2><p className="text-sm text-gray-600">{editor.current.active ? 'Acesso ativo' : 'Acesso desativado'}</p></div><button className="underline" onClick={() => { setEditor(null); setConflict(null); }}>Fechar</button></div>
            {conflict && <div className="mt-4 rounded-lg bg-amber-50 p-4">Versão atual: {conflict.current.name}, perfil {conflict.current.role}, {conflict.current.active ? 'ativo' : 'desativado'}. Seu rascunho permanece nos campos. <div className="mt-2 flex flex-wrap gap-3"><button className="underline" onClick={() => void open(conflict.current)}>Descartar rascunho e carregar atual</button><button className="underline" onClick={() => { setEditor(value => value ? { ...value, current: conflict.current, etag: conflict.etag } : value); setConflict(null); setError('Revise os campos antes de salvar novamente.'); }}>Manter rascunho para revisar</button></div></div>}
            <form className="mt-4" onSubmit={event => { event.preventDefault(); void edit(target, 'PATCH', { name: editor.name, role: editor.role }, 'Dados do funcionário atualizados.'); }}><div className="grid gap-4 sm:grid-cols-2"><label>Nome<input className={input} disabled={busy} required maxLength={120} value={editor.name} onChange={e => setEditor(v => v ? { ...v, name: e.target.value } : v)} /></label><label>Perfil<select className={input} disabled={busy} value={editor.role} onChange={e => setEditor(v => v ? { ...v, role: e.target.value as Employee['role'] } : v)}><option value="atendente">Atendente</option><option value="tecnico">Técnico</option><option value="admin">Administrador</option></select></label></div><button disabled={busy || !!conflict} className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">Salvar nome e perfil</button></form>
            <div className="mt-6 border-t pt-5"><h3 className="font-semibold">Acesso</h3><p className="mt-1 text-sm text-gray-600">Desativar preserva o histórico e invalida as sessões do funcionário.</p><button disabled={busy || !!conflict} className="mt-3 rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => { if (window.confirm(`${editor.current.active ? 'Desativar' : 'Reativar'} o acesso de ${editor.current.name}?`)) void edit(`${target}/access`, 'PATCH', { active: !editor.current.active }, 'Acesso atualizado; sessões anteriores foram invalidadas.'); }}>{editor.current.active ? 'Desativar acesso' : 'Reativar acesso'}</button></div>
            <form className="mt-6 border-t pt-5" onSubmit={event => { event.preventDefault(); void edit(`${target}/password-reset`, 'POST', { password: editor.password }, 'Senha redefinida; sessões anteriores foram invalidadas. Informe a nova senha presencialmente.'); }}><h3 className="font-semibold">Redefinir senha presencialmente</h3><label className="mt-3 block">Nova senha<input className={input} disabled={busy} type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={editor.password} onChange={e => setEditor(v => v ? { ...v, password: e.target.value } : v)} /></label><button disabled={busy || !!conflict} className="mt-3 rounded-lg border px-4 py-2 disabled:opacity-50">Redefinir senha</button></form>
        </section>}
    </main>;
}
