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
async function request(path = '', { method = 'GET', body, key, auth = token, raw } = {}) {
  const res = await fetch(`${origin}/api/v2/orders${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json(), etag: res.headers.get('etag'), cache: res.headers.get('cache-control') };
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
  assert.equal(result.status, 409); assert.equal(result.body.error.code, 'LEGACY_MIGRATION_REQUIRED');
  assert.equal((await Order.collection.findOne({ _id: old.insertedId })).schemaVersion, undefined);
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
