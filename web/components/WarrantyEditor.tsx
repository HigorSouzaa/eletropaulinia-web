'use client';
import { useState } from 'react';
export function WarrantyEditor({ end, disabled, onSave }: { end: string | null; disabled: boolean; onSave: (fim: string, motivo: string) => void }) {
 const [fim, setFim] = useState(end || ''), [motivo, setMotivo] = useState('');
 return <details className="mt-4 rounded border p-3"><summary className="cursor-pointer font-medium">Atualizar garantia — administrador</summary><form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); onSave(fim, motivo); }}><p className="text-sm">A alteração mantém a retirada original e registra o prazo anterior no histórico.</p><label className="block">Nova data final da garantia<input className="mt-1 w-full rounded border p-2" type="date" required value={fim} onChange={e => setFim(e.target.value)} /></label><label className="block">Motivo da atualização<textarea className="mt-1 w-full rounded border p-2" required maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} /></label><button disabled={disabled} className="rounded bg-orange-600 px-4 py-2 text-white">Registrar atualização da garantia</button></form></details>;
}
