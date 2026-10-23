import { createHash } from 'node:crypto';
import Order from '../models/OrderV2.js';
import Counter from '../models/Counter.js';
import { OrderError, createInput, creationKey, validId } from './orderInput.js';

export function orderDTO(document) {
  const raw = document.toObject ? document.toObject() : document;
  const { _id, numero, schemaVersion, version, cliente, equipamentos, dataEntrada, dataPrevista,
    tecnico, observacoes, status, createdBy, createdAt, updatedAt } = raw;
  const retirados = equipamentos.filter(item => item.retirada !== null).length;
  return { _id, numero, schemaVersion, version, cliente, equipamentos, dataEntrada, dataPrevista,
    tecnico, observacoes, status, createdBy, createdAt, updatedAt,
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
  const keyIndex = indexes.some(index => index.unique && index.key.createdBy === 1 && index.key.creationKey === 1 && Object.keys(index.key).length === 2 && index.partialFilterExpression?.schemaVersion === 2);
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
  const order = await Order.findOne({ _id: id, schemaVersion: 2 });
  if (order) return order;
  if (await Order.collection.findOne({ _id: new Order.base.Types.ObjectId(id) }, { projection: { _id: 1 } })) {
    throw new OrderError(409, 'LEGACY_MIGRATION_REQUIRED');
  }
  throw new OrderError(404, 'NOT_FOUND');
}
