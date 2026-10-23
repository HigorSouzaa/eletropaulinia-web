import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { createInput } from './orderInput.js';

function civil(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  return typeof value === 'string' ? value.slice(0, 10) : null;
}
const displayText = value => typeof value === 'string' ? value : null;
// Read projection: incomplete legacy records remain visible, never silently repaired.
export function legacyView(raw) {
  const delivered = raw.status === 'Entregue';
  const id = new mongoose.Types.ObjectId(createHash('sha256').update(`legacy-equipment:${raw._id}`).digest('hex').slice(0, 24));
  return { _id: raw._id, numero: displayText(raw.numero), schemaVersion: 1, version: null,
    cliente: { nome: displayText(raw.cliente), telefone: displayText(raw.telefone), email: displayText(raw.email) },
    equipamentos: [{ _id: id, nome: displayText(raw.equipamento), marca: displayText(raw.marca), modelo: displayText(raw.modelo),
      numeroSerie: displayText(raw.numeroSerie), solicitacao: typeof raw.defeito === 'string' && raw.defeito.trim() ? { tipo: 'relato', descricao: raw.defeito } : null,
      andamento: delivered ? null : displayText(raw.status),
      retirada: delivered ? { origem: 'legado', retiradoEm: null, registradoPor: null } : null }],
    dataEntrada: civil(raw.dataEntrada), dataPrevista: civil(raw.dataPrevista), tecnico: displayText(raw.tecnico),
    observacoes: displayText(raw.observacoes), status: displayText(raw.status), createdBy: raw.createdBy ?? null,
    createdAt: raw.createdAt ?? null, updatedAt: raw.updatedAt ?? null,
    compatibility: { legacy: true, readOnly: true, requiresReconciliation: true } };
}
// Pure transformation only. Original values are retained in migration.original and
// are never included in API DTOs. Applying it does not write to any database.
export function transformLegacy(raw) {
  if (raw.schemaVersion === 2) return { document: raw, issues: [] };
  const view = legacyView(raw);
  const issues = [];
  for (const field of ['numero', 'cliente', 'telefone', 'email', 'equipamento', 'marca', 'modelo', 'numeroSerie', 'defeito', 'tecnico', 'observacoes']) {
    if (raw[field] != null && typeof raw[field] !== 'string') issues.push(field);
  }
  const match = /^OS-(\d{4,})$/.exec(raw.numero || '');
  const sequence = match ? Number(match[1]) : 0;
  if (!Number.isSafeInteger(sequence) || sequence < 1) issues.push('numero');
  if (!['Aguardando', 'Em andamento', 'Pronto', 'Entregue'].includes(raw.status)) issues.push('status');
  let normalized;
  try {
    normalized = createInput({ cliente: view.cliente, equipamentos: view.equipamentos.map(({ nome, marca, modelo, numeroSerie, solicitacao }) => ({ nome, marca, modelo, numeroSerie, solicitacao })),
      dataEntrada: view.dataEntrada, dataPrevista: view.dataPrevista, tecnico: view.tecnico, observacoes: view.observacoes });
  } catch (error) { issues.push(...(error.fields?.map(field => field.path) || ['dados'])); }
  if (issues.length) return { document: null, issues };
  const preserved = { ...view };
  delete preserved.compatibility;
  return { document: { ...preserved, ...normalized, schemaVersion: 2, version: 1, sequencia: sequence,
    equipamentos: view.equipamentos.map((item, i) => ({ ...item, ...normalized.equipamentos[i] })),
    migration: { original: raw } }, issues: [] };
}
