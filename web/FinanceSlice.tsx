'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export function FinanceSlice() {
  const [summary, setSummary] = useState<{ receivedCentavos: number; payments: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const abort = new AbortController();
    const clear = () => { abort.abort(); setSummary(null); setLoading(true); };
    const channel = new BroadcastChannel('ep-session'); channel.onmessage = clear;
    void fetch('/api/financas/summary', { cache: 'no-store', signal: abort.signal })
      .then(async response => { if (response.status === 401) { window.location.replace('/login'); return; } if (!response.ok) throw new Error('Não foi possível carregar as Finanças.'); if (!abort.signal.aborted) setSummary((await response.json()).data); })
      .catch(() => { if (!abort.signal.aborted) setError('Não foi possível carregar as Finanças.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => { abort.abort(); channel.close(); };
  }, []);
  return <main className="mx-auto max-w-4xl p-4 md:p-8"><Link href="/ordens" className="text-orange-700 underline">Voltar às ordens</Link><h1 className="mt-5 text-2xl font-bold">Finanças</h1><p className="mt-2 text-gray-600">Primeira etapa: pagamentos confirmados por equipamento.</p>
    {loading ? <p className="mt-6" role="status">Carregando...</p> : error ? <p className="mt-6 text-red-700" role="alert">{error} <button className="underline" onClick={() => window.location.reload()}>Tentar novamente</button></p> : summary && <div className="mt-6 rounded-xl border bg-white p-5"><h2 className="font-semibold">Receita confirmada desde o início</h2><p className="mt-2 text-3xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.receivedCentavos / 100)}</p><p className="mt-1 text-gray-600">{summary.payments} pagamento(s) registrado(s)</p></div>}
  </main>;
}
