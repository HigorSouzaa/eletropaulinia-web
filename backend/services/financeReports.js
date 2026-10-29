import FinanceReceipt from '../models/FinanceReceipt.js';
import FinanceExpense from '../models/FinanceExpense.js';
import Order from '../models/OrderV2.js';
import { OrderError, validId } from './orderInput.js';
import { fail, page, period } from './financeInput.js';
import { receiptDTO, requireFinanceReady } from './financeReceipts.js';
import { requireExpenseReady } from './financeExpenses.js';

const safe = value => { if (!Number.isSafeInteger(value)) throw new OrderError(503, 'FINANCE_TOTAL_UNAVAILABLE'); return value; };
const groupKey = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' };
const bucket = granularity => ({ $dateToString: { format: groupKey[granularity], date: '$at', timezone: 'America/Sao_Paulo' } });
export async function report(query) {
  const range = period(query), granularity = query.granularity ?? 'day';
  if (!groupKey[granularity] || (granularity === 'day' && range.days > 366)) fail('INVALID_PERIOD');
  await Promise.all([requireFinanceReady(), requireExpenseReady()]);
  const [payments, voids, expenses, categories] = await Promise.all([
    FinanceReceipt.aggregate([{ $match: { confirmedAt: { $gte: range.start, $lt: range.end } } }, { $project: { at: '$confirmedAt', amount: '$amountCentavos' } }, { $group: { _id: bucket(granularity), amount: { $sum: '$amount' }, count: { $sum: 1 } } }]).option({ maxTimeMS: 5000 }),
    FinanceReceipt.aggregate([{ $match: { voidedAt: { $gte: range.start, $lt: range.end } } }, { $project: { at: '$voidedAt', amount: '$amountCentavos' } }, { $group: { _id: bucket(granularity), amount: { $sum: '$amount' }, count: { $sum: 1 } } }]).option({ maxTimeMS: 5000 }),
    FinanceExpense.aggregate([{ $match: { state: 'pago', paidAt: { $gte: range.start, $lt: range.end } } }, { $project: { at: '$paidAt', amount: '$amountCentavos' } }, { $group: { _id: bucket(granularity), amount: { $sum: '$amount' }, count: { $sum: 1 } } }]).option({ maxTimeMS: 5000 }),
    FinanceExpense.aggregate([{ $match: { state: 'pago', paidAt: { $gte: range.start, $lt: range.end } } }, { $group: { _id: '$category', amount: { $sum: '$amountCentavos' } } }, { $sort: { _id: 1 } }]).option({ maxTimeMS: 5000 }),
  ]);
  const keys = new Map();
  const slot = key => { if (!keys.has(key)) keys.set(key, { label: key, receiptsCentavos: 0, voidsCentavos: 0, expensesCentavos: 0, receivedCentavos: 0, resultCentavos: 0 }); return keys.get(key); };
  for (const row of payments) slot(row._id).receiptsCentavos = safe(row.amount);
  for (const row of voids) slot(row._id).voidsCentavos = safe(row.amount);
  for (const row of expenses) slot(row._id).expensesCentavos = safe(row.amount);
  const series = [...keys.values()].sort((a, b) => a.label.localeCompare(b.label));
  for (const row of series) { row.receivedCentavos = safe(row.receiptsCentavos - row.voidsCentavos); row.resultCentavos = safe(row.receivedCentavos - row.expensesCentavos); }
  const total = key => safe(series.reduce((sum, row) => safe(sum + row[key]), 0));
  const expensesByCategory = categories.map(row => ({ category: row._id, amountCentavos: safe(row.amount) }));
  if (safe(expensesByCategory.reduce((sum, row) => safe(sum + row.amountCentavos), 0)) !== total('expensesCentavos')) throw new OrderError(503, 'FINANCE_TOTAL_UNAVAILABLE');
  return { from: range.from, to: range.to, granularity, receivedCentavos: total('receivedCentavos'), expensesCentavos: total('expensesCentavos'), resultCentavos: total('resultCentavos'), expensesByCategory, series };
}
export async function listReceipts(query) {
  await requireFinanceReady();
  const range = period(query), { number, size, skip } = page(query);
  const filter = { $or: [{ confirmedAt: { $gte: range.start, $lt: range.end } }, { voidedAt: { $gte: range.start, $lt: range.end } }] };
  if (query.orderId) filter.orderId = validId(query.orderId);
  const [data, total] = await Promise.all([FinanceReceipt.find(filter).sort({ confirmedAt: -1, _id: -1 }).skip(skip).limit(size).maxTimeMS(5000).lean(), FinanceReceipt.countDocuments(filter).maxTimeMS(5000)]);
  return { data: data.map(receiptDTO), meta: { page: number, pageSize: size, total, totalPages: Math.ceil(total / size) } };
}
export async function forecast(query) {
  await requireFinanceReady();
  const range = period(query), { number, size, skip } = page(query);
  // Forecast uses the current order state and the civil entry date, not the receipt date.
  const orders = await Order.find({ schemaVersion: 2, dataEntrada: { $gte: range.from, $lte: range.to } }).select('numero dataEntrada equipamentos').sort({ dataEntrada: -1, _id: -1 }).limit(2001).maxTimeMS(5000).lean();
  if (orders.length > 2000) throw new OrderError(503, 'FINANCE_VOLUME_LIMIT');
  const ids = orders.map(order => order._id);
  const paid = await FinanceReceipt.find({ orderId: { $in: ids }, voidedAt: null }).select('orderId equipmentId').maxTimeMS(5000).lean();
  const paidIds = new Set(paid.map(item => `${item.orderId}:${item.equipmentId}`));
  const rows = [];
  for (const order of orders) for (const item of order.equipamentos) {
    const amount = item.avaliacao?.totalCentavos;
    if (amount === undefined || amount === null || paidIds.has(`${order._id}:${item._id}`)) continue;
    rows.push({ orderId: order._id, orderNumber: order.numero, equipmentId: item._id, equipmentName: item.nome, amountCentavos: amount, andamento: item.andamento, retirada: !!item.retirada, dataEntrada: order.dataEntrada,
      category: item.retirada ? 'retirado_pendente' : item.andamento === 'Pronto' ? 'pronto_aguardando' : 'orcamento_aberto' });
  }
  const totals = { forecastCentavos: 0, readyCentavos: 0, withdrawnPendingCentavos: 0 };
  for (const row of rows) {
    totals.forecastCentavos = safe(totals.forecastCentavos + row.amountCentavos);
    if (row.category === 'pronto_aguardando') totals.readyCentavos = safe(totals.readyCentavos + row.amountCentavos);
    if (row.category === 'retirado_pendente') totals.withdrawnPendingCentavos = safe(totals.withdrawnPendingCentavos + row.amountCentavos);
  }
  return { data: rows.slice(skip, skip + size), meta: { page: number, pageSize: size, total: rows.length, totalPages: Math.ceil(rows.length / size) }, totals };
}
export async function equipmentResult(orderId, equipmentId) {
  await Promise.all([requireFinanceReady(), requireExpenseReady()]);
  validId(orderId); validId(equipmentId);
  const order = await Order.findById(orderId).select('equipamentos').lean();
  if (!order || !order.equipamentos.some(item => String(item._id) === equipmentId)) throw new OrderError(404, 'NOT_FOUND');
  const [receipt, costs] = await Promise.all([
    FinanceReceipt.findOne({ orderId, equipmentId, voidedAt: null }).select('amountCentavos').maxTimeMS(5000).lean(),
    FinanceExpense.find({ orderId, equipmentId, category: 'peca', state: 'pago' }).select('amountCentavos').maxTimeMS(5000).lean(),
  ]);
  const costCentavos = safe(costs.reduce((sum, item) => safe(sum + item.amountCentavos), 0));
  return { receivedCentavos: receipt?.amountCentavos ?? null, recordedPartsCostCentavos: costs.length ? costCentavos : null,
    partialResultCentavos: receipt && costs.length ? safe(receipt.amountCentavos - costCentavos) : null,
    limitation: 'Considera apenas custos de peças registrados; não representa margem final nem custos não informados.' };
}
