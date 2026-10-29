'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';

type Profile = { name: string; role: string };

const sections = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ordens', label: 'Ordens de serviço' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/financas', label: 'Finanças' },
  { href: '/funcionarios', label: 'Funcionários', admin: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);

  const verify = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setProfile(null);
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/session/me', { cache: 'no-store', signal: current.signal });
      if (response.status === 401) { window.location.replace('/login'); return; }
      if (!response.ok) throw new Error('Não foi possível verificar sua sessão. Tente novamente.');
      const data = await response.json();
      if (!data || typeof data.name !== 'string' || typeof data.role !== 'string') throw new Error('Resposta inválida da sessão.');
      if (!current.signal.aborted) setProfile(data);
    } catch (cause) {
      if (!current.signal.aborted) setError(cause instanceof Error ? cause.message : 'Falha de conexão.');
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void verify();
    const channel = new BroadcastChannel('ep-session');
    channel.onmessage = () => { controller.current?.abort(); setProfile(null); window.location.replace('/login'); };
    const visibility = () => {
      if (document.visibilityState === 'hidden') { controller.current?.abort(); setProfile(null); setLoading(true); }
      else void verify();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => { controller.current?.abort(); channel.close(); document.removeEventListener('visibilitychange', visibility); };
  }, [verify]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function logout() {
    const previousProfile = profile;
    setLeaving(true);
    setError('');
    controller.current?.abort();
    setProfile(null);
    try {
      const response = await fetch('/api/session/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão. Tente novamente.');
      const channel = new BroadcastChannel('ep-session');
      channel.postMessage('changed');
      channel.close();
      window.location.replace('/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao sair.');
      setProfile(previousProfile);
      setLeaving(false);
    }
  }

  const links = sections.filter(section => !section.admin || profile?.role === 'admin');
  return <div className="min-h-screen bg-gray-50">
    <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Ir para o conteúdo</a>
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 md:px-8">
        <button ref={menuButton} type="button" className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-orange-600 md:hidden" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="menu-principal" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} onKeyDown={event => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); event.currentTarget.focus(); } }}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        <Link href="/ordens" className="font-bold text-gray-900">⚡ Eletro Paulínia</Link>
        <div className="ml-auto flex items-center gap-2 text-sm"><span className="hidden sm:inline">{profile ? `Olá, ${profile.name}` : 'Eletro Paulínia'}</span><button type="button" onClick={logout} disabled={!profile || leaving} className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-orange-600 disabled:opacity-50" aria-label="Sair"><LogOut size={18} aria-hidden="true" />{leaving ? 'Saindo...' : 'Sair'}</button></div>
      </div>
      <nav id="menu-principal" aria-label="Menu principal" onKeyDown={event => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } }} className={`${menuOpen ? 'block' : 'hidden'} border-t md:block`}>
        <div className="mx-auto flex max-w-7xl flex-col px-4 py-2 md:flex-row md:gap-2 md:px-8 md:py-0">
          {links.map(section => {
            const active = pathname === section.href || (section.href === '/ordens' && (pathname.startsWith('/ordens/') || pathname.startsWith('/nova-ordem') || pathname.startsWith('/editar-ordem/'))) || (section.href === '/clientes' && pathname.startsWith('/clientes/'));
            return <Link key={section.href} href={section.href} aria-current={active ? 'page' : undefined} onClick={() => setMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-orange-600 md:rounded-b-none ${active ? 'bg-orange-50 text-orange-800 md:border-b-2 md:border-orange-600' : 'text-gray-700 hover:bg-gray-100'}`}>{section.label}</Link>;
          })}
        </div>
      </nav>
    </header>
    <div id="conteudo-principal" className="mx-auto max-w-7xl" tabIndex={-1}>
      {loading ? <p className="p-4 md:p-8" role="status">Verificando sessão...</p> : error ? <div className="m-4 rounded-lg bg-red-50 p-4 text-red-800 md:m-8" role="alert">{error} <button className="underline" onClick={() => void verify()}>Tentar novamente</button></div> : profile ? children : null}
    </div>
  </div>;
}
