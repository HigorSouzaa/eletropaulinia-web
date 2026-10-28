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

let mongo, server, base, adminToken, staffToken;
before(async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  mongo = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'finance_slice_test' });
  await User.init(); await Client.createCollection(); await Client.createIndexes(); await Order.createIndexes(); await FinanceReceipt.createCollection(); await FinanceReceipt.createIndexes();
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/v2`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([FinanceReceipt.deleteMany({}), Client.deleteMany({}), Order.deleteMany({}), Counter.deleteMany({}), User.deleteMany({})]);
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
