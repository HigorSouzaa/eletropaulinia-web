import { createHash } from 'node:crypto';
import Order from '../models/OrderV2.js';
import Counter from '../models/Counter.js';
import { OrderError, createInput, creationKey, validId, object } from './orderInput.js';
import { legacyView } from './legacyOrders.js';

export function orderDTO(document) {
  let raw = document.toObject ? document.toObject() : document;
  if (raw.schemaVersion !== 2) raw = legacyView(raw);
  const { _id, numero, schemaVersion, version, cliente, equipamentos, dataEntrada, dataPrevista,
    tecnico, observacoes, status, createdBy, createdAt, updatedAt } = raw;
  const retirados = equipamentos.filter(item => item.retirada !== null).length;
  return { _id, numero, schemaVersion, version, cliente, equipamentos, dataEntrada, dataPrevista,
    tecnico, observacoes, status, createdBy, createdAt, updatedAt, ...(raw.compatibility ? { compatibility: raw.compatibility } : {}),
    entrega: { total: equipamentos.length, retirados, situacao: retirados === 0 ? 'nenhuma' : retirados === equipamentos.length ? 'completa' : 'parcial' } };
}
function replay(existing, hash) {
  if (existing.creationHash !== hash) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT');
  return { document: existing, created: false };
}
export async function createOrder(body, key, actor) {
  const input = createInput(body);
  const validatedKey = creationKey(key);
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const scope = { schemaVersion: 2, createdBy: actor, creationKey: validatedKey };
  const existing = await Order.findOne(scope).select('+creationHash');
  if (existing) return replay(existing, hash);
  const indexes = await Order.collection.indexes();
  const numberIndex = indexes.some(index => index.unique && index.key.numero === 1 && Object.keys(index.key).length === 1 && !index.partialFilterExpression && !index.sparse);
  const keyIndex = indexes.some(index => index.unique && index.key.createdBy === 1 && index.key.creationKey === 1 && Object.keys(index.key).length === 2 && index.partialFilterExpression?.schemaVersion === 2 && index.partialFilterExpression?.creationKey?.$type === 'string');
  if (!numberIndex || !keyIndex) throw new OrderError(503, 'NUMBERING_NOT_READY');
  // No upsert: only an explicitly reconciled database may allocate numbers.
  const counter = await Counter.findOneAndUpdate({ _id: 'orders', value: { $lt: Number.MAX_SAFE_INTEGER } }, { $inc: { value: 1 } }, { new: true });
  if (!counter) throw new OrderError(503, 'NUMBERING_NOT_READY');
  try {
    const document = await Order.create({ ...input, numero: `OS-${String(counter.value).padStart(4, '0')}`,
      sequencia: counter.value, createdBy: actor, creationKey: validatedKey, creationHash: hash });
    return { document, created: true };
  } catch (error) {
    if (error.code === 11000) {
      const winner = await Order.findOne(scope).select('+creationHash');
      if (winner) return replay(winner, hash);
      throw new OrderError(409, 'NUMBER_CONFLICT');
    }
    throw error;
  }
}
export async function getOrder(id) {
  validId(id);
  const order = await Order.collection.findOne({ _id: new Order.base.Types.ObjectId(id) });
  if (order) return order;
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
export async function mutateOrder(id, match, operation, body, actor, equipmentId) {
  if (equipmentId) validId(equipmentId);
  const raw = await editable(id, match);
  if (operation === 'delete') {
    const deleted = await Order.deleteOne({ _id: raw._id, version: raw.version, schemaVersion: 2 });
    if (!deleted.deletedCount) throw new OrderError(412, 'VERSION_CONFLICT');
    return null;
  }
  const candidate = { ...raw, cliente: { ...raw.cliente }, equipamentos: raw.equipamentos.map(item => ({ ...item })) };
  if (operation === 'patch') {
    object(body, ['cliente', 'dataEntrada', 'dataPrevista', 'tecnico', 'observacoes'], 'body');
    if ('cliente' in body) object(body.cliente, ['nome', 'telefone', 'email'], 'cliente');
    const normalized = createInput({ ...inputOf(candidate), ...body, cliente: { ...candidate.cliente, ...body.cliente } });
    Object.assign(candidate, { ...normalized, equipamentos: candidate.equipamentos });
  } else {
    const index = candidate.equipamentos.findIndex(item => String(item._id) === equipmentId);
    if (operation !== 'add' && index < 0) throw new OrderError(404, 'NOT_FOUND');
    const item = candidate.equipamentos[index];
    if (operation === 'add' || operation === 'remove') {
      if (operation === 'add') {
        const normalized = createInput({ ...inputOf(candidate), equipamentos: [...candidate.equipamentos.map(fields), body] });
        candidate.equipamentos.push({ ...normalized.equipamentos.at(-1), _id: new Order.base.Types.ObjectId(), andamento: 'Aguardando', retirada: null });
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
    } else if (operation === 'equipment') {
      object(body, ['nome', 'marca', 'modelo', 'numeroSerie', 'solicitacao', 'andamento'], 'body');
      if ('andamento' in body && !['Aguardando', 'Em andamento', 'Pronto'].includes(body.andamento)) throw new OrderError(400, 'VALIDATION_ERROR', [{ path: 'andamento', code: 'INVALID' }]);
      if ('andamento' in body && item.retirada) throw new OrderError(409, 'INVALID_PROGRESS');
      const { andamento, ...description } = body;
      const normalized = createInput({ ...inputOf(candidate), equipamentos: [{ ...fields(item), ...description }] });
      Object.assign(item, normalized.equipamentos[0], andamento ? { andamento } : {});
    } else throw new OrderError(404, 'NOT_FOUND');
  }
  candidate.status = aggregate(candidate.equipamentos);
  await new Order(candidate).validate();
  const { cliente, equipamentos, dataEntrada, dataPrevista, tecnico, observacoes, status } = candidate;
  const updated = await Order.findOneAndUpdate({ _id: raw._id, schemaVersion: 2, version: raw.version },
    { $set: { cliente, equipamentos, dataEntrada, dataPrevista, tecnico, observacoes, status }, $inc: { version: 1 } }, { new: true });
  if (!updated) throw new OrderError(412, 'VERSION_CONFLICT');
  return updated;
}
