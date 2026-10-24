import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/OrderV2.js';
import Counter from '../models/Counter.js';
import RevokedToken from '../models/RevokedToken.js';
import { prepareNumberingFixture } from './numbering-fixture.js';
import { transformLegacy } from '../services/legacyOrders.js';

let mongo, server, origin, token, otherToken;
before(async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  mongo = await MongoMemoryServer.create({ binary: { version: '8.0.17' }, instance: { ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'orders_v2_test' });
  await Promise.all([User.init(), Counter.init(), RevokedToken.init()]);
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), Counter.deleteMany({}), User.deleteMany({}), RevokedToken.deleteMany({})]);
  const users = await User.create([
    { username: 'synthetic-a', name: 'Teste A', password: 'Synthetic-test-password-42', role: 'tecnico' },
    { username: 'synthetic-b', name: 'Teste B', password: 'Synthetic-test-password-42', role: 'atendente' },
  ]);
  [token, otherToken] = users.map(user => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' }));
  await prepareNumberingFixture();
});
function payload() {
  return { cliente: { nome: 'Cliente sintético', telefone: '(00) 0000-0000' }, dataEntrada: '2026-10-23',
    equipamentos: [
      { nome: 'Ventilador', marca: 'Marca sintética', modelo: 'Modelo A', numeroSerie: 'SERIE-TESTE', solicitacao: { tipo: 'relato', descricao: 'Não liga' } },
      { nome: 'Rádio', solicitacao: { tipo: 'testar' } },
      { nome: 'Ferro', solicitacao: { tipo: 'relato', descricao: 'Não aquece' } },
    ] };
}
async function request(path = '', { method = 'GET', body, key, auth = token, raw, match } = {}) {
  const res = await fetch(`${origin}/api/v2/orders${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(match ? { 'If-Match': match } : {}) },
    ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: res.status === 204 ? null : await res.json(), etag: res.headers.get('etag'), cache: res.headers.get('cache-control') };
}
const create = (body = payload(), key = randomUUID(), auth = token) => request('', { method: 'POST', body, key, auth });

test('três equipamentos persistem com IDs, opcionais e Testar; outra conta consulta', async () => {
  const created = await create(); assert.equal(created.status, 201);
  const order = created.body.data;
  assert.equal(order.numero, 'OS-0001'); assert.equal(order.version, 1);
  assert.equal(new Set(order.equipamentos.map(item => item._id)).size, 3);
  assert.equal(order.cliente.email, null); assert.equal(order.equipamentos[1].marca, null);
  assert.deepEqual(order.equipamentos[1].solicitacao, { tipo: 'testar', descricao: null });
  assert.equal(order.equipamentos[0].numeroSerie, 'SERIE-TESTE');
  assert.deepEqual(order.entrega, { total: 3, retirados: 0, situacao: 'nenhuma' });
  assert.equal(order.status, 'Aguardando'); assert.equal(order.creationHash, undefined); assert.equal(order.creationKey, undefined);
  assert.equal(created.etag, `"os-${order._id}-v1"`); assert.match(created.cache, /no-store/);
  const read = await request(`/${order._id}`, { auth: otherToken });
  assert.equal(read.status, 200); assert.deepEqual(read.body.data, order);
  const persisted = await Order.findById(order._id);
  assert.equal(persisted.equipamentos.length, 3); assert.equal(persisted.cliente.nome, 'Cliente sintético');
});
test('entradas inválidas não gravam OS nem consomem número', async () => {
  const invalid = [null, {}, { ...payload(), numero: 'OS-1234' }, { ...payload(), equipamentos: [] },
    { ...payload(), dataEntrada: '2026-02-30' }, { ...payload(), cliente: { nome: 'Teste', telefone: { $ne: null } } }];
  for (const field of ['nome', 'telefone']) { const input = payload(); input.cliente[field] = ''; invalid.push(input); }
  for (const mutation of [item => { item.nome = null; }, item => { item.retirada = {}; }, item => { item.solicitacao = { tipo: 'relato', descricao: '' }; }, item => { item.solicitacao = { tipo: 'testar', descricao: 'Não inventar' }; }]) {
    const input = payload(); mutation(input.equipamentos[0]); invalid.push(input);
  }
  for (const input of invalid) assert.equal((await create(input)).status, 400);
  assert.equal((await create(payload(), 'short')).status, 400);
  assert.equal(await Order.countDocuments(), 0); assert.equal((await Counter.findById('orders')).value, 0);
});
test('sem sessão, token inválido e expirado não criam nem consultam', async () => {
  for (const auth of [null, 'invalid', jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    assert.equal((await create(payload(), randomUUID(), auth)).status, 401);
    assert.equal((await request(`/${new mongoose.Types.ObjectId()}`, { auth })).status, 401);
  }
  assert.equal(await Order.countDocuments(), 0);
});
test('IDs inválidos, ausentes e legados têm respostas distintas', async () => {
  assert.equal((await request('/invalid')).status, 400);
  assert.equal((await request(`/${new mongoose.Types.ObjectId()}`)).status, 404);
  const old = await Order.collection.insertOne({ numero: 'OS-0200', equipamento: 'Legado' });
  const result = await request(`/${old.insertedId}`);
  assert.equal(result.status, 200); assert.equal(result.body.data.compatibility.legacy, true);
  assert.equal(result.body.data.equipamentos[0].solicitacao, null);
  assert.equal((await request(`/${old.insertedId}`, { method: 'PATCH', body: {}, match: 'invalid' })).status, 409);
  assert.equal((await Order.collection.findOne({ _id: old.insertedId })).schemaVersion, undefined);
});

function change(order, body, suffix = '') {
  return request(`/${order.body.data._id}${suffix}`, { method: 'PATCH', body, match: order.etag });
}
function pickup(order, eid) {
  return request(`/${order.body.data._id}/equipamentos/${eid}/retirada`, { method: 'PUT', body: {}, match: order.etag });
}
test('edição parcial preserva itens, limpa opcionais e exige precondição', async () => {
  let order = await create(); const ids = order.body.data.equipamentos.map(item => item._id);
  assert.equal((await request(`/${order.body.data._id}`, { method: 'PATCH', body: {} })).status, 428);
  order = await change(order, { cliente: { email: 'fixture@example.invalid' }, observacoes: 'Observação sintética' });
  assert.equal(order.status, 200); assert.equal(order.body.data.cliente.nome, 'Cliente sintético');
  order = await change(order, { cliente: { email: '' }, observacoes: null });
  assert.equal(order.body.data.cliente.email, null); assert.equal(order.body.data.observacoes, null);
  order = await change(order, { marca: '', numeroSerie: null }, `/equipamentos/${ids[0]}`);
  assert.equal(order.status, 200); assert.equal(order.body.data.equipamentos[0].marca, null);
  assert.equal(order.body.data.equipamentos[0].numeroSerie, null);
  assert.deepEqual(order.body.data.equipamentos.map(item => item._id), ids);
  assert.equal((await change(order, { numero: 'OS-9999' })).status, 400);
  assert.equal((await change(order, { status: 'Entregue' })).status, 400);
  assert.equal((await change(order, { cliente: null })).status, 400);
});
test('retirada parcial, repetição e conclusão preservam horários e autoria', async () => {
  let order = await create(); const id = order.body.data._id;
  const items = order.body.data.equipamentos.map(item => item._id);
  for (const item of items) { order = await change(order, { andamento: 'Pronto' }, `/equipamentos/${item}`); assert.equal(order.status, 200); }
  assert.equal(order.body.data.status, 'Pronto');
  const previous = order;
  const before = Date.now(); order = await pickup(order, items[0]); const after = Date.now();
  assert.equal(order.status, 200); assert.deepEqual(order.body.data.entrega, { total: 3, retirados: 1, situacao: 'parcial' });
  const event = order.body.data.equipamentos[0].retirada;
  assert.ok(Date.parse(event.retiradoEm) >= before && Date.parse(event.retiradoEm) <= after);
  assert.equal(event.registradoPor, jwt.decode(token).id);
  assert.equal(order.body.data.equipamentos[1].retirada, null);
  const repeated = await pickup(order, items[0]); assert.deepEqual(repeated.body, order.body); assert.equal(repeated.etag, order.etag);
  assert.equal((await pickup(previous, items[0])).status, 412);
  assert.equal((await change(order, { andamento: 'Pronto' }, `/equipamentos/${items[0]}`)).status, 409);
  const added = await request(`/${id}/equipamentos`, { method: 'POST', match: order.etag, body: payload().equipamentos[0] });
  assert.equal(added.status, 201);
  order = await request(`/${id}/equipamentos/${added.body.data.equipamentos.at(-1)._id}`, { method: 'DELETE', match: added.etag });
  assert.equal(order.status, 200);
  assert.equal((await request(`/${id}/equipamentos/${items[0]}`, { method: 'DELETE', match: order.etag })).status, 409);
  order = await pickup(order, items[1]); order = await pickup(order, items[2]);
  assert.equal(order.body.data.status, 'Entregue'); assert.equal(order.body.data.entrega.situacao, 'completa');
  const read = await request(`/${id}`); assert.deepEqual(read.body.data, order.body.data);
  assert.deepEqual(read.body.data.equipamentos[0].retirada, event);
});
test('edições e retiradas concorrentes retornam conflito sem perder efeito vencedor', async () => {
  let order = await create();
  const edits = await Promise.all([change(order, { observacoes: 'A' }), change(order, { observacoes: 'B' })]);
  assert.deepEqual(edits.map(item => item.status).sort(), [200, 412]);
  order = edits.find(item => item.status === 200);
  for (const item of order.body.data.equipamentos) order = await change(order, { andamento: 'Pronto' }, `/equipamentos/${item._id}`);
  const ids = order.body.data.equipamentos.map(item => item._id);
  const results = await Promise.all([pickup(order, ids[0]), pickup(order, ids[1])]);
  assert.deepEqual(results.map(item => item.status).sort(), [200, 412]);
  order = await request(`/${order.body.data._id}`);
  assert.equal(order.body.data.entrega.retirados, 1);
  const remaining = order.body.data.equipamentos.find(item => !item.retirada);
  order = await pickup(order, remaining._id); assert.equal(order.body.data.entrega.retirados, 2);
});
test('composição antes de retirada e agregado misto; nunca remove último', async () => {
  let order = await create();
  order = await change(order, { andamento: 'Pronto' }, `/equipamentos/${order.body.data.equipamentos[0]._id}`);
  assert.equal(order.body.data.status, 'Em andamento');
  order = await request(`/${order.body.data._id}/equipamentos`, { method: 'POST', match: order.etag, body: { nome: 'Novo', solicitacao: { tipo: 'testar' } } });
  assert.equal(order.status, 201); assert.equal(order.body.data.equipamentos.length, 4);
  while (order.body.data.equipamentos.length > 1) order = await request(`/${order.body.data._id}/equipamentos/${order.body.data.equipamentos.at(-1)._id}`, { method: 'DELETE', match: order.etag });
  assert.equal((await request(`/${order.body.data._id}/equipamentos/${order.body.data.equipamentos[0]._id}`, { method: 'DELETE', match: order.etag })).status, 409);
});

test('retirada antecipada e correção por outro funcionário preservam trilha e status', async () => {
  let order = await create(); const id = order.body.data._id; const eid = order.body.data.equipamentos[0]._id;
  order = await pickup(order, eid);
  assert.equal(order.status, 200);
  assert.equal(order.body.data.status, 'Aguardando');
  assert.deepEqual(order.body.data.entrega, { total: 3, retirados: 1, situacao: 'parcial' });
  const first = order.body.data.equipamentos[0].retirada;
  assert.equal(order.body.data.equipamentos[0].historicoRetiradas.length, 1);
  const route = `/${id}/equipamentos/${eid}/correcoes-retirada`;
  assert.equal((await request(route, { method: 'POST', body: { motivo: '' }, match: order.etag })).status, 400);
  assert.equal((await request(route, { method: 'POST', body: { motivo: 'Erro' }, match: order.etag, auth: null })).status, 401);
  const previous = order;
  order = await request(route, { method: 'POST', body: { motivo: 'Lançamento por engano' }, match: order.etag, auth: otherToken });
  assert.equal(order.status, 200);
  assert.equal(order.body.data.equipamentos[0].retirada, null);
  assert.deepEqual(order.body.data.entrega, { total: 3, retirados: 0, situacao: 'nenhuma' });
  const history = order.body.data.equipamentos[0].historicoRetiradas;
  assert.deepEqual(history.map(item => item.tipo), ['retirada', 'correcao']);
  assert.equal(history[1].retiradaOriginal.retiradoEm, first.retiradoEm);
  assert.equal(history[1].registradoPor, jwt.decode(otherToken).id);
  assert.equal((await request(route, { method: 'POST', body: { motivo: 'De novo' }, match: order.etag })).status, 409);
  assert.equal((await request(route, { method: 'POST', body: { motivo: 'Antigo' }, match: previous.etag })).status, 412);
  order = await pickup(order, eid);
  assert.equal(order.body.data.equipamentos[0].historicoRetiradas.length, 3);
  assert.equal((await request(`/${id}`)).body.data.equipamentos[0].historicoRetiradas[1].motivo, 'Lançamento por engano');
});

test('composição após retirada permite adicionar e remover item presente, preserva entregue', async () => {
  let order = await create(); const id = order.body.data._id; const delivered = order.body.data.equipamentos[0]._id;
  order = await pickup(order, delivered);
  order = await request(`/${id}/equipamentos`, { method: 'POST', match: order.etag, body: { nome: 'Item adicional', solicitacao: { tipo: 'testar' } } });
  assert.equal(order.status, 201);
  const added = order.body.data.equipamentos.at(-1)._id;
  assert.equal(order.body.data.entrega.total, 4);
  assert.equal(order.body.data.entrega.retirados, 1);
  assert.equal((await request(`/${id}/equipamentos/${delivered}`, { method: 'DELETE', match: order.etag })).status, 409);
  order = await request(`/${id}/equipamentos/${added}`, { method: 'DELETE', match: order.etag });
  assert.equal(order.status, 200);
  assert.equal(order.body.data.entrega.total, 3);
  assert.equal(order.body.data.equipamentos[0]._id, delivered);
  assert.equal(order.body.data.equipamentos[0].historicoRetiradas.length, 1);
});
test('exclusão admin exige versão, remove somente alvo e não reduz contador', async () => {
  const first = await create(), second = await create();
  const admin = await User.create({ username: 'admin-v2', name: 'Admin', password: 'Synthetic-test-password-42', role: 'admin' });
  const auth = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  assert.equal((await request(`/${first.body.data._id}`, { method: 'DELETE', match: first.etag })).status, 403);
  assert.equal((await request(`/${first.body.data._id}`, { method: 'DELETE', auth })).status, 428);
  assert.equal((await request(`/${first.body.data._id}`, { method: 'DELETE', auth, match: first.etag })).status, 204);
  assert.equal((await request(`/${first.body.data._id}`)).status, 404);
  assert.equal((await request(`/${second.body.data._id}`)).status, 200);
  assert.equal((await Counter.findById('orders')).value, 2);
});
test('paginação, filtros literais, ordenação numérica e summary contam conjunto inteiro', async () => {
  for (let i = 0; i < 6; i++) await create();
  const first = await request('?pageSize=2&sort=numero&direction=asc');
  assert.equal(first.body.data.length, 2); assert.equal(first.body.data[0].numero, 'OS-0001');
  assert.deepEqual(first.body.meta, { page: 1, pageSize: 2, total: 6, totalPages: 3 });
  const next = await request('?pageSize=2&page=2&sort=numero&direction=asc'); assert.equal(next.body.data[0].numero, 'OS-0003');
  assert.equal((await request('?page=99')).body.data.length, 0);
  assert.equal((await request('/summary?q=Rádio')).body.data.total, 6);
  assert.equal((await request('/summary?q=Rádio')).body.data.equipamentos, 18);
  assert.equal((await request('?q=.*')).body.meta.total, 0);
  for (const query of ['?pageSize=101', '?q[$ne]=x', '?page=0', '?sort=password', '?q=a&q=b', '?status=invalid']) assert.equal((await request(query)).status, 400);
  const partial = await request(`/${first.body.data[0]._id}`);
  const ready = await change(partial, { andamento: 'Pronto' }, `/equipamentos/${partial.body.data.equipamentos[0]._id}`);
  await pickup(ready, ready.body.data.equipamentos[0]._id);
  assert.equal((await request('?entrega=parcial')).body.meta.total, 1);
  assert.equal((await request('/summary?entrega=parcial')).body.data.retirados, 1);
});
test('legado misto permanece visível e transformação preserva origem sem inventar dados', async () => {
  const raw = { _id: new mongoose.Types.ObjectId(), numero: 'OS-0321', cliente: 'Histórico sintético', telefone: '0000', equipamento: 'Rádio antigo', marca: '', defeito: 'Não liga', status: 'Entregue', dataEntrada: new Date('2020-02-02T13:00:00Z'), createdAt: new Date('2020-02-02T13:00:00Z'), referenciaExtra: 'Sintética' };
  await Order.collection.insertOne(raw);
  const list = await request('?q=Histórico'); assert.equal(list.body.meta.total, 1);
  assert.equal(list.body.data[0].entrega.situacao, 'completa');
  assert.equal(list.body.data[0].equipamentos[0].retirada.retiradoEm, null);
  const transformed = transformLegacy(raw); assert.deepEqual(transformed.issues, []);
  assert.equal(String(transformed.document._id), String(raw._id)); assert.equal(transformed.document.numero, raw.numero);
  assert.equal(transformed.document.migration.original.referenciaExtra, 'Sintética');
  assert.equal(transformed.document.equipamentos[0].andamento, null);
  assert.deepEqual(transformLegacy(transformed.document).document, transformed.document);
  assert.equal(transformLegacy({ ...raw, defeito: '' }).document, null);
  await Order.collection.replaceOne({ _id: raw._id }, transformed.document);
  const read = await request(`/${raw._id}`); assert.equal(read.body.data.entrega.situacao, 'completa');
  assert.equal(read.body.data.migration, undefined);
  await new Order(transformed.document).validate();
  const malformed = { ...raw, _id: new mongoose.Types.ObjectId(), numero: { invalid: true }, cliente: { invalid: true } };
  await Order.collection.insertOne(malformed);
  assert.equal(transformLegacy(malformed).document, null);
  const invalidView = await request(`/${malformed._id}`);
  assert.equal(invalidView.status, 200); assert.equal(invalidView.body.data.cliente.nome, null);
  assert.equal((await request('?sort=numero')).body.meta.total, 2);
});
test('criações simultâneas recebem números únicos e equipamentos completos', async () => {
  const results = await Promise.all(Array.from({ length: 16 }, () => create()));
  assert.ok(results.every(result => result.status === 201));
  assert.equal(new Set(results.map(result => result.body.data.numero)).size, 16);
  assert.equal(await Order.countDocuments(), 16);
  assert.ok((await Order.find()).every(order => order.equipamentos.length === 3));
});
test('mesma tentativa concorrente cria uma OS; payload diferente conflita; ator tem escopo próprio', async () => {
  const key = randomUUID();
  const results = await Promise.all(Array.from({ length: 8 }, () => create(payload(), key)));
  assert.equal(results.filter(result => result.status === 201).length, 1);
  assert.ok(results.every(result => [200, 201].includes(result.status)));
  assert.equal(new Set(results.map(result => result.body.data._id)).size, 1);
  assert.equal(await Order.countDocuments(), 1);
  const changed = payload(); changed.cliente.nome = 'Outro sintético';
  assert.equal((await create(changed, key)).status, 409);
  assert.equal((await create(payload(), key, otherToken)).status, 201);
});
test('contador usa máximo reconciliado e não recua após exclusão em fixture', async () => {
  await Order.collection.insertOne({ numero: 'OS-0250' }); await prepareNumberingFixture();
  assert.equal((await create()).body.data.numero, 'OS-0251');
  await Order.deleteMany({}); await prepareNumberingFixture();
  assert.equal((await create()).body.data.numero, 'OS-0252');
});
test('contador ausente falha fechado; número conflitante não cria documento parcial', async () => {
  await Counter.deleteMany({}); assert.equal((await create()).status, 503); assert.equal(await Order.countDocuments(), 0);
  await prepareNumberingFixture(); await Order.collection.insertOne({ numero: 'OS-0001' });
  const result = await create(); assert.equal(result.status, 409); assert.equal(result.body.error.code, 'NUMBER_CONFLICT');
  assert.equal(await Order.countDocuments(), 1); assert.equal((await Counter.findById('orders')).value, 1);
});
test('sem índice idempotente não aceita criação nem consome número', async () => {
  await Order.collection.dropIndex('createdBy_1_creationKey_1');
  try {
    const result = await create(); assert.equal(result.status, 503);
    assert.equal(await Order.countDocuments(), 0); assert.equal((await Counter.findById('orders')).value, 0);
  } finally { await Order.createIndexes(); }
});
test('inventário rejeita número inválido ou duplicidade numérica sem renumerar', async () => {
  const item = await Order.collection.insertOne({ numero: 'INVALID' });
  await assert.rejects(prepareNumberingFixture, /Invalid numbering/);
  await Order.collection.deleteOne({ _id: item.insertedId });
  await Order.collection.insertMany([{ numero: 'OS-0007' }, { numero: 'OS-00007' }]);
  await assert.rejects(prepareNumberingFixture, /Unreconciled/);
  assert.equal(await Order.countDocuments(), 2);
});
test('parser limita corpo e não expõe entrada ou stack', async () => {
  for (const [raw, status] of [['{invalid', 400], [JSON.stringify({ value: 'x'.repeat(524289) }), 413]]) {
    const result = await request('', { method: 'POST', raw }); assert.equal(result.status, status);
    assert.equal(result.body.error.stack, undefined); assert.equal(result.body.error.message.includes('invalid'), false);
  }
});
test('cliente v1 não modifica nem achata uma OS v2', async () => {
  const created = await create(); const id = created.body.data._id;
  for (const [method, path] of [['POST', ''], ['PUT', `/${id}`], ['PATCH', `/${id}/status`], ['DELETE', `/${id}`], ['GET', `/${id}`], ['GET', '']]) {
    const response = await fetch(`${origin}/api/orders${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify({ status: 'Entregue' }) }) });
    assert.equal(response.status, method === 'DELETE' ? 403 : 409);
  }
  assert.deepEqual((await request(`/${id}`)).body.data, created.body.data);
});

test('medição local limitada e plano de índice da listagem v2', async context => {
  await Promise.all(Array.from({ length: 50 }, () => create()));
  const durations = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const result = await request('?pageSize=25');
    durations.push(performance.now() - start);
    assert.equal(result.status, 200); assert.equal(result.body.meta.total, 50);
  }
  const plan = await Order.collection.find({}).sort({ dataEntrada: -1, _id: -1 }).limit(25).explain('executionStats');
  const sorted = durations.toSorted((a, b) => a - b);
  context.diagnostic(JSON.stringify({ fixtureOrders: 50, requests: 10, latencyMedianMs: Number(sorted[5].toFixed(2)), latencyMaxMs: Number(sorted.at(-1).toFixed(2)),
    returned: plan.executionStats.nReturned, documentsExamined: plan.executionStats.totalDocsExamined,
    dateIndexUsed: JSON.stringify(plan.queryPlanner.winningPlan).includes('dataEntrada_-1__id_-1'),
    limitation: 'loopback, Mongo descartável, sem carga representativa de produção' }));
});
