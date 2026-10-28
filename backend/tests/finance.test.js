import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Order from '../models/OrderV2.js';
import Counter from '../models/Counter.js';
import FinanceReceipt from '../models/FinanceReceipt.js';
import FinanceExpense from '../models/FinanceExpense.js';
import FinanceRecurrence from '../models/FinanceRecurrence.js';

let mongo, server, base, adminToken, staffToken;
before(async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  mongo = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'finance_slice_test' });
  await User.init(); await Client.createCollection(); await Client.createIndexes(); await Order.createIndexes(); await FinanceReceipt.createCollection(); await FinanceReceipt.createIndexes(); await FinanceExpense.createCollection(); await FinanceExpense.createIndexes(); await FinanceRecurrence.createCollection(); await FinanceRecurrence.createIndexes();
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/v2`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([FinanceReceipt.deleteMany({}), FinanceExpense.deleteMany({}), FinanceRecurrence.deleteMany({}), Client.deleteMany({}), Order.deleteMany({}), Counter.deleteMany({}), User.deleteMany({})]);
  const [admin, staff] = await User.create([
    { username: 'finance-admin', name: 'Admin sintético', role: 'admin', password: 'Synthetic-password-42' },
    { username: 'finance-staff', name: 'Funcionário sintético', role: 'tecnico', password: 'Synthetic-password-42' },
  ]);
  adminToken = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  staffToken = jwt.sign({ id: staff.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  await Counter.create({ _id: 'orders', value: 0 });
});
async function req(path, { method = 'GET', body, key, auth = adminToken, match } = {}) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(match ? { 'If-Match': match } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: response.status === 204 ? null : await response.json(), etag: response.headers.get('etag') };
}
async function order() {
  const result = await req('/orders', { method: 'POST', key: randomUUID(), body: {
    cliente: { nome: 'Pessoa sintética', telefone: '19900000042' }, dataEntrada: '2026-10-28',
    equipamentos: [
      { nome: 'Rádio sintético', solicitacao: { tipo: 'testar' }, avaliacao: { laudo: 'Teste', servicos: [{ descricao: 'Conserto', valorCentavos: 12000 }] } },
      { nome: 'Ventilador sintético', solicitacao: { tipo: 'testar' }, avaliacao: { laudo: 'Teste', servicos: [{ descricao: 'Troca', valorCentavos: 9000 }] } },
    ],
  } });
  assert.equal(result.status, 201);
  return result;
}

test('pagamento por equipamento é separado da retirada, consultável e idempotente', async () => {
  const created = await order();
  const [one, two] = created.body.data.equipamentos;
  const body = { orderId: created.body.data._id, equipmentId: one._id, amountCentavos: 12000, method: 'pix' };
  assert.equal((await req('/finance/summary', { auth: staffToken })).body.data.receivedCentavos, 0);
  assert.equal((await req('/finance/receipts', { method: 'POST', body, key: randomUUID(), auth: staffToken })).status, 403);
  assert.equal((await req('/finance/receipts', { method: 'POST', body, key: randomUUID(), auth: null })).status, 401);
  const key = randomUUID();
  const paid = await req('/finance/receipts', { method: 'POST', body, key });
  assert.equal(paid.status, 201); assert.equal(paid.body.data.amountCentavos, 12000);
  assert.equal(paid.body.data.budgetSnapshotCentavos, 12000);
  assert.equal((await req('/finance/receipts', { method: 'POST', body, key })).status, 200);
  assert.equal((await req('/finance/orders/' + body.orderId + '/equipment/' + one._id + '/receipt', { auth: staffToken })).body.data._id, paid.body.data._id);
  assert.equal((await req('/finance/orders/' + body.orderId + '/equipment/' + two._id + '/receipt')).body.data, null);
  const current = await req('/orders/' + body.orderId);
  assert.equal((await req(`/orders/${body.orderId}/equipamentos/${two._id}/retirada`, { method: 'PUT', body: {}, match: current.etag })).status, 200);
  assert.equal((await req('/finance/summary', { auth: staffToken })).body.data.receivedCentavos, 12000);
  assert.equal(await FinanceReceipt.countDocuments(), 1);
});

test('diferença exige motivo, duplicidade conflita e falha não consome pagamento', async () => {
  const created = await order(); const one = created.body.data.equipamentos[0];
  const body = { orderId: created.body.data._id, equipmentId: one._id, amountCentavos: 11000 };
  assert.equal((await req('/finance/receipts', { method: 'POST', body, key: randomUUID() })).body.error.code, 'DIFFERENCE_REASON_REQUIRED');
  assert.equal(await FinanceReceipt.countDocuments(), 0);
  const bad = await req('/finance/receipts', { method: 'POST', key: randomUUID(), body: { ...body, amountCentavos: -1 } });
  assert.equal(bad.status, 400); assert.equal(await FinanceReceipt.countDocuments(), 0);
  const key = randomUUID(), justified = { ...body, differenceReason: 'Desconto combinado' };
  assert.equal((await req('/finance/receipts', { method: 'POST', key, body: justified })).status, 201);
  const paidVersion = (await Order.findById(body.orderId)).version;
  assert.equal((await req('/finance/receipts', { method: 'POST', key, body: { ...justified, amountCentavos: 10000 } })).body.error.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal((await req('/finance/receipts', { method: 'POST', key: randomUUID(), body: justified })).body.error.code, 'ALREADY_PAID');
  assert.equal((await Order.findById(body.orderId)).version, paidVersion);
  const latest = await req('/orders/' + body.orderId);
  const deletion = await req('/orders/' + body.orderId, { method: 'DELETE', match: latest.etag });
  assert.equal(deletion.status, 409); assert.equal(deletion.body.error.code, 'FINANCIAL_HISTORY_BLOCKS_DELETE');
  assert.equal(await FinanceReceipt.countDocuments(), 1); assert.equal(await Order.countDocuments(), 1);
});

test('dois administradores não lançam duas receitas para o mesmo equipamento', async () => {
  const created = await order(), body = { orderId: created.body.data._id, equipmentId: created.body.data.equipamentos[0]._id, amountCentavos: 12000 };
  const results = await Promise.all([req('/finance/receipts', { method: 'POST', body, key: randomUUID() }), req('/finance/receipts', { method: 'POST', body, key: randomUUID() })]);
  assert.equal(results.filter(result => result.status === 201).length, 1, JSON.stringify(results.map(result => [result.status, result.body.error?.code])));
  assert.ok(results.every(result => [201, 409, 412].includes(result.status)), JSON.stringify(results.map(result => [result.status, result.body.error?.code])));
  assert.equal(await FinanceReceipt.countDocuments(), 1);
  assert.equal((await req('/finance/summary')).body.data.receivedCentavos, 12000);
});

test('estorno preserva lançamento e corrige receita no período; não admin não estorna', async () => {
  const created = await order(), equipment = created.body.data.equipamentos[0];
  const paid = await req('/finance/receipts', { method: 'POST', key: randomUUID(), body: { orderId: created.body.data._id, equipmentId: equipment._id, amountCentavos: 12000 } });
  const id = paid.body.data._id, match = `"receipt-${id}-v1"`;
  assert.equal((await req(`/finance/receipts/${id}/void`, { method: 'POST', match, body: { reason: 'Correção sintética' }, auth: staffToken })).status, 403);
  const voided = await req(`/finance/receipts/${id}/void`, { method: 'POST', match, body: { reason: 'Correção sintética' } });
  assert.equal(voided.status, 200); assert.equal(voided.body.data.version, 2);
  assert.equal((await req(`/finance/receipts/${id}/void`, { method: 'POST', match, body: { reason: 'Outra' } })).status, 409);
  assert.equal((await req('/finance/summary')).body.data.receivedCentavos, 0);
  assert.equal((await req('/finance/receipts', { method: 'POST', key: randomUUID(), body: { orderId: created.body.data._id, equipmentId: equipment._id, amountCentavos: 12000 } })).status, 201);
  assert.equal(await FinanceReceipt.countDocuments({ orderId: created.body.data._id }), 2);
});

test('despesa prevista só afeta caixa após pagamento; peça vinculada não duplica saída', async () => {
  const created = await order(), equipment = created.body.data.equipamentos[0];
  const expenseKey = randomUUID(), expenseBody = { description: 'Peça sintética', category: 'peca', amountCentavos: 3000, state: 'previsto', dueDate: '2026-10-28', orderId: created.body.data._id, equipmentId: equipment._id };
  const piece = await req('/finance/expenses', { method: 'POST', key: expenseKey, body: expenseBody });
  assert.equal(piece.status, 201, JSON.stringify(piece.body));
  assert.equal((await req('/finance/expenses', { method: 'POST', key: expenseKey, body: expenseBody })).status, 200);
  const id = piece.body.data._id;
  assert.equal((await req('/finance/expenses', { method: 'POST', auth: staffToken, body: { description: 'Outra', category: 'outra', amountCentavos: 100 } })).status, 403);
  const query = '/finance/summary?from=2026-10-28&to=2026-10-28&granularity=day';
  assert.equal((await req(query)).body.data.expensesCentavos, 0);
  const updated = await req(`/finance/expenses/${id}`, { method: 'PATCH', match: `"expense-${id}-v1"`, body: { state: 'pago', reason: 'Pagamento confirmado' } });
  assert.equal(updated.status, 200); assert.equal(updated.body.data.history.length, 1);
  assert.equal((await req(`/finance/expenses/${id}`, { method: 'PATCH', match: `"expense-${id}-v1"`, body: { amountCentavos: 1, reason: 'Concorrência' } })).status, 412);
  assert.equal((await req(query)).body.data.expensesCentavos, 3000);
  assert.equal((await req(`/finance/orders/${created.body.data._id}/equipment/${equipment._id}/result`)).body.data.partialResultCentavos, null);
  assert.equal((await req('/finance/receipts', { method: 'POST', key: randomUUID(), body: { orderId: created.body.data._id, equipmentId: equipment._id, amountCentavos: 12000 } })).status, 201);
  assert.equal((await req(`/finance/orders/${created.body.data._id}/equipment/${equipment._id}/result`)).body.data.partialResultCentavos, 9000);
  assert.equal((await req(`/finance/expenses?from=2026-10-28&to=2026-10-28&orderId=${created.body.data._id}`)).body.meta.total, 1);
  const latest = await req(`/orders/${created.body.data._id}`);
  assert.equal((await req(`/orders/${created.body.data._id}`, { method: 'DELETE', match: latest.etag })).body.error.code, 'FINANCIAL_HISTORY_BLOCKS_DELETE');
});

test('recorrência gera uma competência por mês e repetição não duplica', async () => {
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date());
  const recurringBody = { description: 'Internet sintética', category: 'internet', amountCentavos: 10000, startCompetence: month }, recurringKey = randomUUID();
  const created = await req('/finance/recurrences', { method: 'POST', key: recurringKey, body: recurringBody });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal((await req('/finance/recurrences', { method: 'POST', key: recurringKey, body: recurringBody })).status, 200);
  const first = await req('/finance/recurrences/materialize', { method: 'POST', body: { throughCompetence: month } });
  assert.equal(first.status, 200, JSON.stringify(first.body)); assert.equal(first.body.data.created, 1);
  const repeated = await req('/finance/recurrences/materialize', { method: 'POST', body: { throughCompetence: month } });
  assert.equal(repeated.body.data.created, 0); assert.equal(await FinanceExpense.countDocuments({ recurrenceId: created.body.data._id }), 1);
  assert.equal((await req('/finance/expenses?state=previsto')).body.meta.total, 1);
});

test('previsão separa pronto, retirado pendente e orçamento; gráfico concorda com entradas', async () => {
  const created = await order(), id = created.body.data._id;
  const [first, second] = created.body.data.equipamentos;
  await Order.updateOne({ _id: id, 'equipamentos._id': first._id }, { $set: { 'equipamentos.$.andamento': 'Pronto' } });
  const before = await req('/finance/forecast?from=2026-10-28&to=2026-10-28');
  assert.equal(before.status, 200); assert.equal(before.body.totals.forecastCentavos, 21000);
  assert.equal(before.body.totals.readyCentavos, 12000);
  const pickup = await req(`/orders/${id}/equipamentos/${first._id}/retirada`, { method: 'PUT', match: (await req(`/orders/${id}`)).etag, body: {} });
  assert.equal(pickup.status, 200);
  const after = await req('/finance/forecast?from=2026-10-28&to=2026-10-28');
  assert.equal(after.body.totals.withdrawnPendingCentavos, 12000);
  assert.equal((await req('/finance/summary?from=2026-10-28&to=2026-10-28')).body.data.receivedCentavos, 0);
  assert.equal((await req('/finance/summary?from=2026-10-28&to=2026-99-99')).status, 400);
  const paid = await req('/finance/receipts', { method: 'POST', key: randomUUID(), body: { orderId: id, equipmentId: second._id, amountCentavos: 9000 } });
  assert.equal(paid.status, 201);
  const report = await req('/finance/summary?from=2026-10-28&to=2026-10-28&granularity=day');
  assert.equal(report.body.data.receivedCentavos, 9000);
  assert.equal(report.body.data.series.reduce((sum, row) => sum + row.receivedCentavos, 0), 9000);
  assert.equal((await req('/finance/forecast?from=2026-10-28&to=2026-10-28')).body.totals.forecastCentavos, 12000);
});

test('geração concorrente e ajuste mensal preservam competência anterior', async () => {
  const now = new Date(), previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const current = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(now);
  const rule = await req('/finance/recurrences', { method: 'POST', key: randomUUID(), body: { description: 'Aluguel sintético', category: 'aluguel', amountCentavos: 20000, startCompetence: previous } });
  assert.equal(rule.status, 201);
  const first = await Promise.all([req('/finance/recurrences/materialize', { method: 'POST', body: { throughCompetence: previous } }), req('/finance/recurrences/materialize', { method: 'POST', body: { throughCompetence: previous } })]);
  assert.ok(first.every(item => item.status === 200), JSON.stringify(first.map(item => item.body)));
  const prior = await FinanceExpense.findOne({ recurrenceId: rule.body.data._id, competence: previous }).lean();
  assert.equal(prior.amountCentavos, 20000);
  const changed = await req(`/finance/recurrences/${rule.body.data._id}`, { method: 'PATCH', match: `"recurrence-${rule.body.data._id}-v1"`, body: { amountCentavos: 25000, reason: 'Reajuste sintético' } });
  assert.equal(changed.status, 200);
  assert.equal((await req('/finance/recurrences/materialize', { method: 'POST', body: { throughCompetence: current } })).status, 200);
  const months = await FinanceExpense.find({ recurrenceId: rule.body.data._id }).sort({ competence: 1 }).lean();
  assert.deepEqual(months.map(item => item.amountCentavos), [20000, 25000]);
  const adjusted = await req(`/finance/expenses/${prior._id}`, { method: 'PATCH', match: `"expense-${prior._id}-v1"`, body: { amountCentavos: 18000, reason: 'Ajuste pontual' } });
  assert.equal(adjusted.status, 200);
  assert.equal((await FinanceExpense.findOne({ recurrenceId: rule.body.data._id, competence: current })).amountCentavos, 25000);
});

test('virada do dia da loja separa pagamentos em UTC e estorno não reescreve mês anterior', async () => {
  const created = await order(), item = created.body.data.equipamentos[0];
  const paid = await req('/finance/receipts', { method: 'POST', key: randomUUID(), body: { orderId: created.body.data._id, equipmentId: item._id, amountCentavos: 12000 } });
  await FinanceReceipt.updateOne({ _id: paid.body.data._id }, { $set: { confirmedAt: new Date('2026-11-01T02:59:00Z'), voidedAt: new Date('2026-11-01T03:00:00Z') } });
  const october = await req('/finance/summary?from=2026-10-31&to=2026-10-31');
  const november = await req('/finance/summary?from=2026-11-01&to=2026-11-01');
  assert.equal(october.body.data.receivedCentavos, 12000);
  assert.equal(november.body.data.receivedCentavos, -12000);
});

test('funcionário consulta relatórios mas não cria recorrência nem corrige despesa', async () => {
  assert.equal((await req('/finance/summary?from=2026-10-28&to=2026-10-28', { auth: staffToken })).status, 200);
  assert.equal((await req('/finance/forecast?from=2026-10-28&to=2026-10-28', { auth: staffToken })).status, 200);
  assert.equal((await req('/finance/expenses', { auth: staffToken })).status, 200);
  assert.equal((await req('/finance/recurrences', { auth: staffToken })).status, 200);
  assert.equal((await req('/finance/recurrences', { method: 'POST', auth: staffToken, key: randomUUID(), body: { description: 'Teste', category: 'internet', amountCentavos: 1000, startCompetence: '2026-10' } })).status, 403);
  assert.equal((await req('/finance/recurrences/materialize', { method: 'POST', auth: staffToken, body: { throughCompetence: '2026-10' } })).status, 403);
});

test('consulta materializa mensalidade pendente uma vez, sem marcá-la paga', async () => {
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date());
  const created = await req('/finance/recurrences', { method: 'POST', key: randomUUID(), body: { description: 'Internet automática sintética', category: 'internet', amountCentavos: 7000, startCompetence: month } });
  assert.equal(created.status, 201);
  const views = await Promise.all([req('/finance/expenses', { auth: staffToken }), req('/finance/expenses', { auth: staffToken })]);
  assert.ok(views.every(item => item.status === 200));
  const items = await FinanceExpense.find({ recurrenceId: created.body.data._id });
  assert.equal(items.length, 1); assert.equal(items[0].state, 'previsto'); assert.equal(items[0].paidAt, null);
  assert.equal((await req('/finance/summary?from=2026-10-28&to=2026-10-28')).body.data.expensesCentavos, 0);
});
