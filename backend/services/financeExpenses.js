import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import FinanceExpense from '../models/FinanceExpense.js';
import FinanceRecurrence from '../models/FinanceRecurrence.js';
import Order from '../models/OrderV2.js';
import { OrderError, creationKey, validId } from './orderInput.js';
import { cents, civil, competence, fail, label, matchVersion, optionalId, page, period, shape } from './financeInput.js';

const categories = new Set(['aluguel', 'internet', 'agua', 'energia', 'peca', 'outra']);
const recurring = new Set(['aluguel', 'internet', 'agua', 'energia', 'outra']);
const states = new Set(['previsto', 'pago', 'cancelado']);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const list = (doc) => { const { _id, description, category, amountCentavos, state, dueDate, paidAt, orderId, equipmentId, orderNumberSnapshot, equipmentNameSnapshot, recurrenceId, competence: month, version, history } = doc; return { _id, description, category, amountCentavos, state, dueDate, paidAt, orderId, equipmentId, orderNumberSnapshot, equipmentNameSnapshot, recurrenceId, competence: month, version, history }; };
export const expenseDTO = list;
export const recurrenceDTO = doc => ({ _id: doc._id, description: doc.description, category: doc.category, amountCentavos: doc.amountCentavos, startCompetence: doc.startCompetence, endCompetence: doc.endCompetence, active: doc.active, version: doc.version, history: doc.history });

export async function requireExpenseReady() {
  const indexes = await FinanceExpense.collection.indexes().catch(error => { if (error.code === 26) throw new OrderError(503, 'FINANCE_NOT_READY'); throw error; });
  const rules = await FinanceRecurrence.collection.indexes().catch(error => { if (error.code === 26) throw new OrderError(503, 'FINANCE_NOT_READY'); throw error; });
  if (!indexes.some(index => index.name === 'recurrence_competence_unique' && index.unique)
    || !indexes.some(index => index.name === 'expense_request_key' && index.unique)
    || !rules.some(index => index.name === 'recurrence_request_key' && index.unique)) throw new OrderError(503, 'FINANCE_NOT_READY');
}
async function reference(orderId, equipmentId, session) {
  if (!orderId && !equipmentId) return {};
  if (!orderId || !equipmentId) fail();
  const order = await Order.findById(orderId).session(session).lean();
  if (!order || order.schemaVersion !== 2) throw new OrderError(404, 'NOT_FOUND');
  const equipment = order.equipamentos.find(item => String(item._id) === equipmentId);
  if (!equipment) throw new OrderError(404, 'NOT_FOUND');
  return { orderNumberSnapshot: order.numero, equipmentNameSnapshot: equipment.nome };
}
export async function createExpense(body, rawKey, actor) {
  const requestKey = creationKey(rawKey);
  shape(body, ['description', 'category', 'amountCentavos', 'state', 'dueDate', 'orderId', 'equipmentId']);
  const description = label(body.description), category = body.category, amountCentavos = cents(body.amountCentavos);
  if (!categories.has(category)) fail();
  const state = body.state ?? 'previsto'; if (!['previsto', 'pago'].includes(state)) fail();
  const dueDate = body.dueDate == null || body.dueDate === '' ? null : civil(body.dueDate);
  const orderId = optionalId(body.orderId), equipmentId = optionalId(body.equipmentId);
  if (category !== 'peca' && (orderId || equipmentId)) fail();
  const requestHash = digest({ description, category, amountCentavos, state, dueDate, orderId, equipmentId });
  const replay = async () => {
    const found = await FinanceExpense.findOne({ createdBy: actor, requestKey }).select('+requestHash').lean();
    if (!found) return null;
    if (found.requestHash !== requestHash) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT');
    return { data: list(found), created: false };
  };
  const prior = await replay(); if (prior) return prior;
  await requireExpenseReady();
  const session = await mongoose.startSession();
  try { return await session.withTransaction(async () => {
    const again = await FinanceExpense.findOne({ createdBy: actor, requestKey }).select('+requestHash').session(session).lean();
    if (again) { if (again.requestHash !== requestHash) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT'); return { data: list(again), created: false }; }
    const snapshot = await reference(orderId, equipmentId, session);
    if (orderId) {
      const fence = await Order.updateOne({ _id: orderId, 'equipamentos._id': equipmentId }, { $inc: { financeFence: 1, version: 1 } }, { session });
      if (fence.modifiedCount !== 1) throw new OrderError(412, 'VERSION_CONFLICT');
    }
    const [doc] = await FinanceExpense.create([{ description, category, amountCentavos, state, dueDate, orderId, equipmentId, ...snapshot, paidAt: state === 'pago' ? new Date() : null, createdBy: actor, updatedBy: actor, requestKey, requestHash }], { session });
    return { data: list(doc), created: true };
  }); } catch (error) { if (error.code === 11000) { const winner = await replay(); if (winner) return winner; } throw error; } finally { await session.endSession(); }
}
export async function getExpense(id) { validId(id); const doc = await FinanceExpense.findById(id).lean(); if (!doc) throw new OrderError(404, 'NOT_FOUND'); return list(doc); }
export async function listExpenses(query) {
  await materializeCurrent();
  const { number, size, skip } = page(query), range = period(query);
  const filter = {};
  if (query.state) { if (!states.has(query.state)) fail(); filter.state = query.state; }
  if (query.category) { if (!categories.has(query.category)) fail(); filter.category = query.category; }
  if (query.orderId) filter.orderId = validId(query.orderId);
  if (query.state === 'pago') filter.paidAt = { $gte: range.start, $lt: range.end };
  else filter.$or = [{ dueDate: { $gte: range.from, $lte: range.to } }, { paidAt: { $gte: range.start, $lt: range.end } }, { recurrenceId: null, dueDate: null, paidAt: null }, { competence: { $gte: range.from.slice(0, 7), $lte: range.to.slice(0, 7) }, paidAt: null }];
  const [data, total] = await Promise.all([FinanceExpense.find(filter).sort({ paidAt: -1, dueDate: -1, _id: -1 }).skip(skip).limit(size).maxTimeMS(5000).lean(), FinanceExpense.countDocuments(filter).maxTimeMS(5000)]);
  return { data: data.map(list), meta: { page: number, pageSize: size, total, totalPages: Math.ceil(total / size) } };
}
export async function updateExpense(id, match, body, actor) {
  validId(id); shape(body, ['description', 'category', 'amountCentavos', 'state', 'dueDate', 'reason']);
  const version = matchVersion(match, 'expense', id), reason = label(body.reason, 500);
  const current = await FinanceExpense.findById(id).lean(); if (!current) throw new OrderError(404, 'NOT_FOUND');
  if (current.version !== version) throw new OrderError(412, 'VERSION_CONFLICT');
  const update = {};
  if (body.description !== undefined) update.description = label(body.description);
  if (body.category !== undefined) { if (!categories.has(body.category) || (current.orderId && body.category !== 'peca')) fail(); update.category = body.category; }
  if (body.amountCentavos !== undefined) update.amountCentavos = cents(body.amountCentavos);
  if (body.dueDate !== undefined) update.dueDate = body.dueDate == null ? null : civil(body.dueDate);
  if (body.state !== undefined) { if (!states.has(body.state)) fail(); update.state = body.state; update.paidAt = body.state === 'pago' ? current.paidAt ?? new Date() : null; }
  if (!Object.keys(update).length) fail();
  const updated = await FinanceExpense.findOneAndUpdate({ _id: id, version }, { $set: { ...update, updatedBy: actor }, $inc: { version: 1 }, $push: { history: { at: new Date(), by: actor, reason, previous: { description: current.description, category: current.category, amountCentavos: current.amountCentavos, state: current.state, dueDate: current.dueDate, paidAt: current.paidAt } } } }, { new: true, runValidators: true }).lean();
  if (!updated) throw new OrderError(412, 'VERSION_CONFLICT'); return list(updated);
}
export async function createRecurrence(body, rawKey, actor) {
  const requestKey = creationKey(rawKey);
  shape(body, ['description', 'category', 'amountCentavos', 'startCompetence', 'endCompetence']);
  const description = label(body.description), category = body.category, amountCentavos = cents(body.amountCentavos);
  if (!recurring.has(category)) fail();
  const startCompetence = competence(body.startCompetence), endCompetence = body.endCompetence == null ? null : competence(body.endCompetence);
  if (endCompetence && endCompetence < startCompetence) fail();
  const requestHash = digest({ description, category, amountCentavos, startCompetence, endCompetence });
  const replay = async () => { const found = await FinanceRecurrence.findOne({ createdBy: actor, requestKey }).select('+requestHash').lean(); if (!found) return null; if (found.requestHash !== requestHash) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT'); return { data: recurrenceDTO(found), created: false }; };
  const prior = await replay(); if (prior) return prior;
  await requireExpenseReady();
  try { const doc = await FinanceRecurrence.create({ description, category, amountCentavos, startCompetence, endCompetence, createdBy: actor, updatedBy: actor, requestKey, requestHash }); return { data: recurrenceDTO(doc), created: true }; }
  catch (error) { if (error.code === 11000) { const winner = await replay(); if (winner) return winner; } throw error; }
}
export async function listRecurrences() { const rows = await FinanceRecurrence.find().sort({ createdAt: -1, _id: -1 }).limit(101).maxTimeMS(5000).lean(); if (rows.length > 100) throw new OrderError(503, 'FINANCE_VOLUME_LIMIT'); return { data: rows.map(recurrenceDTO) }; }
export async function updateRecurrence(id, match, body, actor) {
  validId(id); shape(body, ['description', 'category', 'amountCentavos', 'endCompetence', 'active', 'reason']);
  const version = matchVersion(match, 'recurrence', id), reason = label(body.reason, 500);
  const current = await FinanceRecurrence.findById(id).lean(); if (!current) throw new OrderError(404, 'NOT_FOUND');
  if (current.version !== version) throw new OrderError(412, 'VERSION_CONFLICT');
  const update = {};
  if (body.description !== undefined) update.description = label(body.description);
  if (body.category !== undefined) { if (!recurring.has(body.category)) fail(); update.category = body.category; }
  if (body.amountCentavos !== undefined) update.amountCentavos = cents(body.amountCentavos);
  if (body.endCompetence !== undefined) { const end = body.endCompetence == null ? null : competence(body.endCompetence); if (end && end < current.startCompetence) fail(); update.endCompetence = end; }
  if (body.active !== undefined) { if (typeof body.active !== 'boolean') fail(); update.active = body.active; }
  if (!Object.keys(update).length) fail();
  const doc = await FinanceRecurrence.findOneAndUpdate({ _id: id, version }, { $set: { ...update, updatedBy: actor }, $inc: { version: 1 }, $push: { history: { at: new Date(), by: actor, reason, previous: { description: current.description, category: current.category, amountCentavos: current.amountCentavos, active: current.active, endCompetence: current.endCompetence } } } }, { new: true, runValidators: true }).lean();
  if (!doc) throw new OrderError(412, 'VERSION_CONFLICT'); return recurrenceDTO(doc);
}
function nextMonth(month) { const [year, m] = month.split('-').map(Number); return `${year + (m === 12 ? 1 : 0)}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`; }
function currentMonth() { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value])); return `${parts.year}-${parts.month}`; }
export function materializeCurrent() { return materialize({ throughCompetence: currentMonth() }, null); }
export async function materialize(body, actor) {
  shape(body, ['throughCompetence']); const through = competence(body.throughCompetence);
  const current = currentMonth();
  if (through > current) fail();
  await requireExpenseReady();
  const rules = await FinanceRecurrence.find({ active: true, startCompetence: { $lte: through } }).limit(101).lean();
  if (rules.length > 100) throw new OrderError(503, 'FINANCE_VOLUME_LIMIT');
  for (const rule of rules) {
    let month = rule.startCompetence, count = 0;
    while (month <= through && (!rule.endCompetence || month <= rule.endCompetence)) { if (++count > 120) fail('INVALID_PERIOD'); month = nextMonth(month); }
  }
  let created = 0, existing = 0;
  for (const rule of rules) {
    let month = rule.startCompetence, count = 0;
    while (month <= through && (!rule.endCompetence || month <= rule.endCompetence)) {
      if (++count > 120) fail('INVALID_PERIOD');
      const session = await mongoose.startSession();
      try {
        const outcome = await session.withTransaction(async () => {
          const latest = await FinanceRecurrence.findById(rule._id).session(session).lean();
          if (!latest || !latest.active || month < latest.startCompetence || (latest.endCompetence && month > latest.endCompetence)) return 'skipped';
          await FinanceRecurrence.updateOne({ _id: latest._id, version: latest.version }, { $inc: { generationFence: 1 } }, { session });
          const result = await FinanceExpense.updateOne({ recurrenceId: latest._id, competence: month }, { $setOnInsert: { description: latest.description, category: latest.category, amountCentavos: latest.amountCentavos, state: 'previsto', dueDate: null, paidAt: null, createdBy: actor ?? latest.createdBy, updatedBy: actor ?? latest.createdBy } }, { upsert: true, session });
          return result.upsertedCount ? 'created' : 'existing';
        });
        if (outcome === 'created') created++; else if (outcome === 'existing') existing++;
      } finally { await session.endSession(); }
      month = nextMonth(month);
    }
  }
  return { created, existing };
}
