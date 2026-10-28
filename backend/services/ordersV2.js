import mongoose from 'mongoose';
import { evaluationInput, resolveTechnician, warrantyView, civilDate } from './orderExtras.js';
import Order from '../models/OrderV2.js';
import FinanceReceipt from '../models/FinanceReceipt.js';
import FinanceExpense from '../models/FinanceExpense.js';
import { OrderError, createInput, validId, object, clientSnapshotInput } from './orderInput.js';
import { legacyView } from './legacyOrders.js';
export { createOrder } from './orderCreation.js';

export function orderDTO(document) {
  let raw = document.toObject ? document.toObject() : document;
  if (raw.schemaVersion !== 2) raw = legacyView(raw);
  const { _id, numero, schemaVersion, version, cliente, equipamentos, dataEntrada, dataPrevista,
    tecnico, observacoes, status, createdBy, createdAt, updatedAt } = raw;
  const retirados = equipamentos.filter(item => item.retirada !== null).length;
  return { _id, numero, schemaVersion, version, cliente, clienteId: raw.clienteId ?? null, tipoAtendimento: raw.tipoAtendimento || 'normal', tecnicoId: raw.tecnicoId ?? null, equipamentos: equipamentos.map(item => ({ ...item, garantia: (['indisponivel', 'revisar'].includes(item.origemSituacao) ? { ...warrantyView(item, raw.dataEntrada, raw.tipoAtendimento), situacao: 'nao_verificavel' } : warrantyView(item, raw.dataEntrada, raw.tipoAtendimento)) })), dataEntrada, dataPrevista,
    tecnico, observacoes, status, createdBy, createdAt, updatedAt, ...(raw.compatibility ? { compatibility: raw.compatibility } : {}),
    entrega: { total: equipamentos.length, retirados, situacao: retirados === 0 ? 'nenhuma' : retirados === equipamentos.length ? 'completa' : 'parcial' } };
}
export async function getOrder(id, inspectReferences = false) {
  validId(id);
  const order = await Order.collection.findOne({ _id: new Order.base.Types.ObjectId(id) });
  if (order) {
    if (inspectReferences) return inspectOrderReferences(order);
    return order;
  }
  throw new OrderError(404, 'NOT_FOUND');
}

export function etag(order) { return `"os-${order._id}-v${order.version}"`; }
async function editable(id, match) {
  const raw = await getOrder(id);
  if (raw.schemaVersion !== 2) throw new OrderError(409, 'LEGACY_MIGRATION_REQUIRED');
  if (!match) throw new OrderError(428, 'PRECONDITION_REQUIRED');
  if (match !== etag(raw)) throw new OrderError(412, 'VERSION_CONFLICT');
  return raw;
}
function fields(item) {
  const { nome, marca, modelo, numeroSerie, solicitacao } = item;
  return { nome, marca, modelo, numeroSerie, solicitacao };
}
function inputOf(order) {
  const { cliente, dataEntrada, dataPrevista, tecnico, observacoes } = order;
  return { cliente, dataEntrada, dataPrevista, tecnico, observacoes, equipamentos: order.equipamentos.map(fields) };
}
function aggregate(items) {
  const remaining = items.filter(item => !item.retirada);
  if (!remaining.length) return 'Entregue';
  if (remaining.every(item => item.andamento === 'Pronto')) return 'Pronto';
  if (remaining.every(item => item.andamento === 'Aguardando')) return 'Aguardando';
  return 'Em andamento';
}
export async function mutateOrder(id, match, operation, body, actor, equipmentId, session) {
  if ((operation === 'delete' || (operation === 'patch' && body && Object.hasOwn(body, 'tecnicoId'))) && !session) {
    const current = await mongoose.startSession();
    try { return await current.withTransaction(() => mutateOrder(id, match, operation, body, actor, equipmentId, current)); }
    finally { await current.endSession(); }
  }
  if (equipmentId) validId(equipmentId);
  const raw = await editable(id, match);
  if (operation === 'delete') {
    if (await FinanceReceipt.exists({ orderId: raw._id }).session(session) || await FinanceExpense.exists({ orderId: raw._id }).session(session)) throw new OrderError(409, 'FINANCIAL_HISTORY_BLOCKS_DELETE');
    const deleted = await Order.deleteOne({ _id: raw._id, version: raw.version, schemaVersion: 2 }, { session });
    if (!deleted.deletedCount) throw new OrderError(412, 'VERSION_CONFLICT');
    return null;
  }
  const candidate = { ...raw, cliente: { ...raw.cliente }, equipamentos: raw.equipamentos.map(item => ({ ...item })) };
  if (operation === 'patch') {
    object(body, ['cliente', 'dataEntrada', 'dataPrevista', 'tecnico', 'tecnicoId', 'observacoes'], 'body');
    if ('cliente' in body) {
      object(body.cliente, ['nome', 'telefone', 'email'], 'cliente');
      const snapshot = clientSnapshotInput({ ...candidate.cliente, ...body.cliente });
      if (Object.keys(snapshot).some(key => snapshot[key] !== candidate.cliente[key])) throw new OrderError(409, 'CLIENT_SNAPSHOT_IMMUTABLE');
    }
    if ('tecnico' in body && body.tecnico !== candidate.tecnico) throw new OrderError(409, 'TECHNICIAN_REFERENCE_REQUIRED');
    const main = { ...body }; delete main.tecnicoId;
    const normalized = createInput({ ...inputOf(candidate), ...main, cliente: { ...candidate.cliente, ...body.cliente } });
    Object.assign(candidate, { ...normalized, equipamentos: candidate.equipamentos });
    if ('tecnicoId' in body && (String(body.tecnicoId) !== String(raw.tecnicoId ?? null) || (body.tecnicoId === null && raw.tecnico))) Object.assign(candidate, await resolveTechnician(body.tecnicoId, session));
  } else {
    const index = candidate.equipamentos.findIndex(item => String(item._id) === equipmentId);
    if (operation !== 'add' && index < 0) throw new OrderError(404, 'NOT_FOUND');
    const item = candidate.equipamentos[index];
    if (operation === 'add' || operation === 'remove') {
      if (operation === 'add') {
        object(body, ['nome', 'marca', 'modelo', 'numeroSerie', 'solicitacao', 'avaliacao'], 'body');
        const base = { ...body }; delete base.avaliacao;
        const normalized = createInput({ ...inputOf(candidate), equipamentos: [...candidate.equipamentos.map(fields), base] });
        candidate.equipamentos.push({ ...normalized.equipamentos.at(-1), _id: new Order.base.Types.ObjectId(), andamento: 'Aguardando', retirada: null, avaliacao: body.avaliacao == null ? null : evaluationInput(body.avaliacao, actor) });
      } else {
        if (candidate.equipamentos.length === 1) throw new OrderError(409, 'LAST_EQUIPMENT');
        if (item.retirada || item.historicoRetiradas?.length) throw new OrderError(409, 'EQUIPMENT_HISTORY_LOCKED');
        candidate.equipamentos.splice(index, 1);
      }
    } else if (operation === 'pickup') {
      object(body, [], 'body');
      if (item.retirada) return raw;
      const now = new Date();
      item.retirada = { origem: 'operacao', retiradoEm: now, registradoPor: actor };
      item.historicoRetiradas = [...(item.historicoRetiradas || []),
        { tipo: 'retirada', em: now, registradoPor: actor, retiradaOriginal: item.retirada }];
    } else if (operation === 'pickupCorrection') {
      object(body, ['motivo'], 'body');
      if (!item.retirada) throw new OrderError(409, 'NO_PICKUP_TO_CORRECT');
      if (item.retirada.origem === 'legado') throw new OrderError(409, 'LEGACY_PICKUP_CORRECTION_UNAVAILABLE');
      if (typeof body.motivo !== 'string' || !body.motivo.trim() || body.motivo.trim().length > 500) {
        throw new OrderError(400, 'VALIDATION_ERROR', [{ path: 'motivo', code: 'REQUIRED' }]);
      }
      const previous = item.retirada;
      const history = item.historicoRetiradas || [];
      // v2 documents created before this audit field still retain their original event.
      const initial = history.length ? history : [{
        tipo: 'retirada', em: previous.retiradoEm, registradoPor: previous.registradoPor,
        retiradaOriginal: previous,
      }];
      item.historicoRetiradas = [...initial, {
        tipo: 'correcao', em: new Date(), registradoPor: actor,
        motivo: body.motivo.trim(), retiradaOriginal: previous,
      }];
      item.retirada = null;
    } else if (operation === 'warranty') {
      object(body, ['fim', 'motivo'], 'body');
      const base = warrantyView(item, candidate.dataEntrada, candidate.tipoAtendimento);
      if (typeof body.fim !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.fim) || !Number.isFinite(Date.parse(body.fim)) || new Date(body.fim).toISOString().slice(0, 10) !== body.fim || body.fim < (base.inicio || candidate.dataEntrada) || typeof body.motivo !== 'string' || !body.motivo.trim() || body.motivo.trim().length > 500) throw new OrderError(400, 'VALIDATION_ERROR');
      item.garantiaAjustes = [...(item.garantiaAjustes || []), { fimAnterior: base.fim, fimNovo: body.fim, motivo: body.motivo.trim(), por: actor, em: new Date() }];
      item.garantiaFim = body.fim;
    } else if (operation === 'equipment') {
      object(body, ['nome', 'marca', 'modelo', 'numeroSerie', 'solicitacao', 'andamento', 'avaliacao'], 'body');
      if ('andamento' in body && !['Aguardando', 'Em andamento', 'Pronto'].includes(body.andamento)) throw new OrderError(400, 'VALIDATION_ERROR', [{ path: 'andamento', code: 'INVALID' }]);
      if ('andamento' in body && item.retirada) throw new OrderError(409, 'INVALID_PROGRESS');
      const { andamento, avaliacao, ...description } = body;
      if ('avaliacao' in body) item.avaliacao = evaluationInput(avaliacao, actor, item.avaliacao);
      const normalized = createInput({ ...inputOf(candidate), equipamentos: [{ ...fields(item), ...description }] });
      Object.assign(item, normalized.equipamentos[0], andamento ? { andamento } : {});
    } else throw new OrderError(404, 'NOT_FOUND');
  }
  candidate.status = aggregate(candidate.equipamentos);
  await new Order(candidate).validate();
  const { cliente, equipamentos, dataEntrada, dataPrevista, tecnico, tecnicoId, observacoes, status } = candidate;
  const updated = await Order.findOneAndUpdate({ _id: raw._id, schemaVersion: 2, version: raw.version },
    { $set: { cliente, equipamentos, dataEntrada, dataPrevista, tecnico, tecnicoId, observacoes, status }, $inc: { version: 1 } }, { new: true, session });
  if (!updated) throw new OrderError(412, 'VERSION_CONFLICT');
  return updated;
}

export async function inspectOrderReferences(document) {
  const order = document.toObject ? document.toObject() : document;
  if (order.schemaVersion === 2) {
      const ids = order.equipamentos.filter(item => item.retorno).flatMap(item => [item.retorno.ordemId, item.retorno.raizOrdemId]).filter(Boolean);
      if (!ids.length) return order;
      const sources = new Map((await Order.find({ _id: { $in: ids } }).maxTimeMS(5000).lean()).map(source => [String(source._id), source]));
      for (const item of order.equipamentos) {
        if (!item.retorno) continue;
        const source = sources.get(String(item.retorno.ordemId));
        const root = String(item.retorno.raizOrdemId) === String(item.retorno.ordemId) ? source : sources.get(String(item.retorno.raizOrdemId));
        const rootItem = root?.equipamentos?.find(eq => String(eq._id) === String(item.retorno.raizEquipamentoId));
        item.origemSituacao = !source || !root ? 'indisponivel' : source.version !== item.retorno.sourceVersion || (!item.retorno.prazoManual && (!rootItem?.retirada?.retiradoEm || civilDate(rootItem.retirada.retiradoEm) !== item.retorno.inicio)) ? 'revisar' : 'preservada';
      }
    }
  return order;
}
