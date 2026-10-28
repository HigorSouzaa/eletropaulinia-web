import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import Order from '../models/OrderV2.js';
import FinanceReceipt from '../models/FinanceReceipt.js';
import { OrderError, creationKey, object, validId } from './orderInput.js';

const methods = new Set(['dinheiro', 'pix', 'cartao', 'transferencia', 'outro']);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function receiptDTO(receipt) {
  const { _id, orderId, equipmentId, orderNumberSnapshot, equipmentNameSnapshot,
    budgetSnapshotCentavos, amountCentavos, method, differenceReason, confirmedAt,
    confirmedBy, voidedAt, voidedBy, voidReason, version } = receipt;
  return { _id, orderId, equipmentId, orderNumberSnapshot, equipmentNameSnapshot,
    budgetSnapshotCentavos, amountCentavos, method, differenceReason, confirmedAt,
    confirmedBy, voidedAt, voidedBy, voidReason, version };
}

export async function requireFinanceReady() {
  let indexes;
  try { indexes = await FinanceReceipt.collection.indexes(); }
  catch (error) { if (error.code === 26) throw new OrderError(503, 'FINANCE_NOT_READY'); throw error; }
  if (!indexes.some(index => index.name === 'receipt_active_equipment' && index.unique && index.partialFilterExpression?.voidedAt === null)
    || !indexes.some(index => index.name === 'receipt_request_key' && index.unique)) throw new OrderError(503, 'FINANCE_NOT_READY');
}

function receiptInput(body) {
  object(body, ['orderId', 'equipmentId', 'amountCentavos', 'method', 'differenceReason'], 'body');
  validId(body.orderId); validId(body.equipmentId);
  if (!Number.isSafeInteger(body.amountCentavos) || body.amountCentavos < 1 || body.amountCentavos > 999999999) throw new OrderError(400, 'VALIDATION_ERROR');
  const method = body.method === undefined || body.method === null ? null : body.method;
  if (method !== null && (typeof method !== 'string' || !methods.has(method))) throw new OrderError(400, 'VALIDATION_ERROR');
  const differenceReason = body.differenceReason === undefined || body.differenceReason === null ? null : body.differenceReason;
  if (differenceReason !== null && (typeof differenceReason !== 'string' || !differenceReason.trim() || differenceReason.trim().length > 500)) throw new OrderError(400, 'VALIDATION_ERROR');
  return { orderId: body.orderId.toLowerCase(), equipmentId: body.equipmentId.toLowerCase(),
    amountCentavos: body.amountCentavos, method, differenceReason: differenceReason?.trim() ?? null };
}

async function replay(actor, key, digest) {
  const existing = await FinanceReceipt.findOne({ confirmedBy: actor, requestKey: key }).select('+requestHash').lean();
  if (!existing) return null;
  if (existing.requestHash !== digest) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT');
  return { receipt: existing, created: false };
}

export async function createReceipt(body, rawKey, actor) {
  const key = creationKey(rawKey);
  const input = receiptInput(body);
  const digest = hash(input);
  const previous = await replay(actor, key, digest);
  if (previous) return previous;
  await requireFinanceReady();
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const again = await FinanceReceipt.findOne({ confirmedBy: actor, requestKey: key }).select('+requestHash').session(session).lean();
      if (again) {
        if (again.requestHash !== digest) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT');
        return { receipt: again, created: false };
      }
      const order = await Order.findById(input.orderId).session(session).lean();
      if (!order) throw new OrderError(404, 'NOT_FOUND');
      if (order.schemaVersion !== 2) throw new OrderError(409, 'LEGACY_MIGRATION_REQUIRED');
      const equipment = order.equipamentos.find(item => String(item._id) === input.equipmentId);
      if (!equipment) throw new OrderError(404, 'NOT_FOUND');
      const budget = equipment.avaliacao?.totalCentavos ?? null;
      if (budget !== null && budget !== input.amountCentavos && !input.differenceReason) throw new OrderError(400, 'DIFFERENCE_REASON_REQUIRED');
      const fence = await Order.updateOne({ _id: order._id, version: order.version, schemaVersion: 2, 'equipamentos._id': equipment._id },
        { $inc: { financeFence: 1, version: 1 } }, { session });
      if (fence.modifiedCount !== 1) throw new OrderError(412, 'VERSION_CONFLICT');
      const [receipt] = await FinanceReceipt.create([{ ...input, orderId: order._id, equipmentId: equipment._id,
        orderNumberSnapshot: order.numero, equipmentNameSnapshot: equipment.nome,
        budgetSnapshotCentavos: budget, confirmedAt: new Date(), confirmedBy: actor,
        requestKey: key, requestHash: digest }], { session });
      return { receipt, created: true };
    }, { readPreference: 'primary', writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 });
  } catch (error) {
    if (error.code === 11000) {
      const winner = await replay(actor, key, digest);
      if (winner) return winner;
      throw new OrderError(409, 'ALREADY_PAID');
    }
    if (error.hasErrorLabel?.('UnknownTransactionCommitResult')) throw new OrderError(503, 'TRANSACTION_UNAVAILABLE');
    throw error;
  } finally { await session.endSession(); }
}

export async function financeSummary() {
  await requireFinanceReady();
  const [result] = await FinanceReceipt.aggregate([
    { $match: { voidedAt: null } },
    { $group: { _id: null, receivedCentavos: { $sum: '$amountCentavos' }, payments: { $sum: 1 } } },
  ]).option({ maxTimeMS: 5000 });
  if (result && !Number.isSafeInteger(result.receivedCentavos)) throw new OrderError(503, 'FINANCE_TOTAL_UNAVAILABLE');
  return { receivedCentavos: result?.receivedCentavos ?? 0, payments: result?.payments ?? 0 };
}

export async function equipmentReceipt(orderId, equipmentId) {
  validId(orderId); validId(equipmentId);
  const receipt = await FinanceReceipt.findOne({ orderId, equipmentId, voidedAt: null }).maxTimeMS(5000).lean();
  return receipt ? receiptDTO(receipt) : null;
}
