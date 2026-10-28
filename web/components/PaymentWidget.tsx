'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Receipt = { _id: string; amountCentavos: number; confirmedAt: string; method: string | null };
const currency = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export function PaymentWidget({ orderId, equipmentId, budget, admin, onPaid }: { orderId: string; equipmentId: string; budget: number | null; admin: boolean; onPaid: () => void }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null), [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ recordedPartsCostCentavos: number | null; partialResultCentavos: number | null } | null>(null);
  const [amount, setAmount] = useState(budget === null ? '' : (budget / 100).toFixed(2).replace('.', ','));
  const [method, setMethod] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null);
  const refreshResult = useCallback(async (signal?: AbortSignal) => { const response = await fetch(`/api/financas/orders/${orderId}/equipment/${equipmentId}/result`, { cache: 'no-store', signal }); if (response.ok) { const data = (await response.json()).data; if (!signal?.aborted) setResult(data); } }, [orderId, equipmentId]);
  useEffect(() => {
    const abort = new AbortController();
    const clear = () => { abort.abort(); setReceipt(null); setResult(null); setLoading(true); };
    const channel = new BroadcastChannel('ep-session'); channel.onmessage = clear;
    void fetch(`/api/financas/orders/${orderId}/equipment/${equipmentId}/receipt`, { cache: 'no-store', signal: abort.signal })
      .then(async response => { if (response.status === 401) { window.location.replace('/login'); return; } if (!response.ok) throw new Error('Não foi possível consultar o pagamento.'); if (!abort.signal.aborted) setReceipt((await response.json()).data); })
      .catch(() => { if (!abort.signal.aborted) setError('Não foi possível consultar o pagamento.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    void refreshResult(abort.signal).catch(() => {});
    return () => { abort.abort(); channel.close(); };
  }, [orderId, equipmentId, refreshResult]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = amount.trim().replace(',', '.');
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) { setError('Informe um valor válido.'); return; }
    const [whole, fraction = ''] = text.split('.');
    const amountCentavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!amountCentavos) { setError('O pagamento precisa ser maior que zero.'); return; }
    if (budget !== null && budget !== amountCentavos && !reason.trim()) { setError('Explique a diferença entre orçamento e pagamento.'); return; }
    setBusy(true); setError(''); key.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/financas/receipts', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key.current }, body: JSON.stringify({ orderId, equipmentId, amountCentavos, method: method || null, differenceReason: reason.trim() || null }) });
      if (response.status === 401) { window.location.replace('/login'); return; }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409 && data.error?.code === 'ALREADY_PAID') throw new Error('Este equipamento já possui um pagamento. Atualize a página.');
        if (response.status === 403) throw new Error('Somente administradores podem registrar pagamentos.');
        throw new Error(response.status === 503 ? 'Serviço indisponível. Tente novamente.' : 'Não foi possível registrar o pagamento. Confira os dados.');
      }
      setReceipt((await response.json()).data); key.current = null; void refreshResult().catch(() => {}); onPaid();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha de conexão.'); }
    finally { setBusy(false); }
  }
  return <section className="mt-4 border-t pt-3" aria-label="Pagamento do equipamento">
    <h4 className="font-semibold">Pagamento</h4>
    {loading ? <p role="status">Consultando pagamento...</p> : receipt ? <p>Recebido: {currency(receipt.amountCentavos)} · {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(receipt.confirmedAt))}</p> : !admin ? <p>Pagamento ainda não confirmado.</p> : <form onSubmit={save} className="mt-2 grid gap-3 sm:grid-cols-2">
      <label>Valor recebido (R$)<input required inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); key.current = null; }} className="mt-1 block w-full rounded border p-2" /></label>
      <label>Forma de pagamento (opcional)<select value={method} onChange={event => { setMethod(event.target.value); key.current = null; }} className="mt-1 block w-full rounded border p-2"><option value="">Não informada</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outra</option></select></label>
      <label className="sm:col-span-2">Motivo da diferença (se houver)<textarea maxLength={500} value={reason} onChange={event => { setReason(event.target.value); key.current = null; }} className="mt-1 block w-full rounded border p-2" /></label>
      <button disabled={busy} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Registrando...' : 'Confirmar pagamento'}</button>
    </form>}
    {error && <p role="alert" className="mt-2 text-red-700">{error} <button onClick={() => window.location.reload()} className="underline">Atualizar</button></p>}
    {result?.recordedPartsCostCentavos !== null && result?.recordedPartsCostCentavos !== undefined && <p className="mt-2 text-sm">Peças pagas registradas: {currency(result.recordedPartsCostCentavos)}. {result.partialResultCentavos === null ? 'Resultado parcial ainda não calculável sem pagamento confirmado.' : `Resultado parcial após peças registradas: ${currency(result.partialResultCentavos)}.`} Outros custos não informados não estão incluídos.</p>}
    <p className="mt-2 text-xs text-gray-600">A retirada e o orçamento não confirmam pagamento. <Link href="/financas" className="underline">Ver receita registrada</Link>{admin && <> · <Link href={`/financas?orderId=${orderId}&equipmentId=${equipmentId}`} className="underline">Registrar custo de peça</Link></>}.</p>
  </section>;
}
