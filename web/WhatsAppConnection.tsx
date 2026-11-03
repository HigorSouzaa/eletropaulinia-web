'use client';
import { useCallback, useEffect, useState } from 'react';

type Status = { state: string; changedAt: string; configured: boolean };
const labels: Record<string, string> = { desligado: 'Desligado', iniciando: 'Iniciando', aguardando_qr: 'Aguardando leitura do QR Code', autenticando: 'Autenticando', conectado: 'Conectado', desconectado: 'Desconectado', erro: 'Erro na conexão' };

export function WhatsAppConnection({ manage = false }: { manage?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/whatsapp/status', { cache: 'no-store', signal });
      if (response.status === 401) { window.location.replace('/login'); return; }
      if (!response.ok) throw new Error('Não foi possível consultar o WhatsApp.');
      const result = await response.json();
      if (!signal?.aborted) { setStatus(result.data); setError(''); }
      if (manage && result.data.state === 'aguardando_qr') {
        const qr = await fetch('/api/whatsapp/qr', { cache: 'no-store', signal });
        if (qr.ok) { const data = await qr.json(); if (!signal?.aborted) setImage(data.data.image); }
        else if (!signal?.aborted) setImage('');
      } else if (!signal?.aborted) setImage('');
    } catch { if (!signal?.aborted) setError('Não foi possível consultar o WhatsApp.'); }
  }, [manage]);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(controller.signal); }, 5000);
    const channel = new BroadcastChannel('ep-session');
    channel.onmessage = () => { controller.abort(); setStatus(null); setImage(''); };
    return () => { controller.abort(); clearInterval(timer); channel.close(); };
  }, [refresh]);
  async function change(action: 'connect' | 'disconnect') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/whatsapp/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store' });
      if (response.status === 401) { window.location.replace('/login'); return; }
      if (!response.ok) throw new Error('Não foi possível alterar a conexão.');
      await refresh();
    } catch { setError('Não foi possível alterar a conexão.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border bg-white p-5" aria-label="Estado do WhatsApp">
    <h2 className="text-lg font-semibold">WhatsApp da loja</h2>
    <p className="mt-2" role="status">{status ? !status.configured ? 'Não configurado neste ambiente' : labels[status.state] || 'Estado desconhecido' : 'Consultando...'}</p>
    {status?.configured && <p className="mt-1 text-sm text-gray-600">Última mudança: {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(status.changedAt))}</p>}
    <p className="mt-1 text-sm text-gray-600">Nenhuma mensagem é enviada automaticamente.</p>
    {error && <p role="alert" className="mt-2 text-red-700">{error} <button type="button" className="underline" onClick={() => void refresh()}>Tentar novamente</button></p>}
    {manage && <div className="mt-4 flex gap-2"><button type="button" disabled={busy || !status?.configured || !['desligado', 'desconectado', 'erro'].includes(status.state)} className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => void change('connect')}>Conectar</button><button type="button" disabled={busy || !status || ['desligado', 'desconectado'].includes(status.state)} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => void change('disconnect')}>Desconectar</button></div>}
    {manage && image && <div className="mt-4"><p>Escaneie com o WhatsApp da loja. O código expira rapidamente.</p><img src={image} alt="QR Code temporário para conectar o WhatsApp da loja" className="mt-3 h-64 w-64 max-w-full" /></div>}
  </section>;
}
