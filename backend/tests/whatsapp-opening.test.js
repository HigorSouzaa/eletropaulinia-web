import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/OrderV2.js';
import Client from '../models/Client.js';
import Counter from '../models/Counter.js';
import NotificationOutbox from '../models/NotificationOutbox.js';
import { dispatchOpening } from '../services/whatsappOpening.js';

let mongo, server, origin, token;
const payload = authorized => ({ cliente: { nome: 'Cliente sintético', telefone: '19900000123' },
  dataEntrada: '2026-11-03', equipamentos: [{ nome: 'Equipamento sintético', solicitacao: { tipo: 'testar' } }],
  comunicacao: { whatsapp: { autorizado: authorized, origem: authorized ? 'presencial' : null } } });
before(async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  mongo = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'whatsapp_opening_test' });
  await User.init(); await Client.createCollection(); await Client.createIndexes(); await Order.createCollection(); await Order.createIndexes();
  await NotificationOutbox.createCollection(); await NotificationOutbox.createIndexes(); await Counter.init();
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (mongo) await mongo.stop();
  for (const key of ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_GRAPH_VERSION', 'WHATSAPP_OPENING_TEMPLATE']) delete process.env[key];
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Client.deleteMany({}), Order.deleteMany({}), Counter.deleteMany({}), NotificationOutbox.deleteMany({})]);
  const user = await User.create({ username: 'synthetic', name: 'Atendente sintético', role: 'atendente', password: 'Synthetic-password-42' });
  token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  await Counter.create({ _id: 'orders', value: 0 });
});
async function create(body, key = randomUUID(), auth = token) {
  const response = await fetch(`${origin}/api/v2/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key,
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
test('consentimento cria OS e uma intenção transacional; replay não duplica', async () => {
  const key = randomUUID();
  const first = await create(payload(true), key);
  assert.equal(first.status, 201);
  const again = await create(payload(true), key);
  assert.equal(again.status, 200);
  assert.equal(first.body.data._id, again.body.data._id);
  assert.equal(first.body.data.comunicacao.whatsapp.autorizado, true);
  assert.equal(await Order.countDocuments(), 1);
  assert.equal(await NotificationOutbox.countDocuments(), 1);
  const outbox = await NotificationOutbox.findOne().lean();
  assert.equal(outbox.orderNumber, first.body.data.numero);
  assert.equal(outbox.state, 'pending');
  assert.equal((await create(payload(false), key)).status, 409);
});
test('sem consentimento salva OS sem envio, entrada inválida não grava e falta de sessão é negada', async () => {
  assert.equal((await create(payload(true), randomUUID(), null)).status, 401);
  const invalid = payload(true); invalid.comunicacao.whatsapp.origem = null;
  assert.equal((await create(invalid)).status, 400);
  assert.equal(await Order.countDocuments(), 0);
  const saved = await create(payload(false));
  assert.equal(saved.status, 201);
  assert.equal(await NotificationOutbox.countDocuments(), 0);
});
test('sem índice único da intenção, consentimento falha fechado sem criar OS ou cliente', async () => {
  await NotificationOutbox.collection.dropIndex('outbox_order_kind_unique');
  try {
    const response = await create(payload(true));
    assert.equal(response.status, 503);
    assert.equal(await Order.countDocuments(), 0);
    assert.equal(await Client.countDocuments(), 0);
    assert.equal((await Counter.findById('orders')).value, 0);
  } finally { await NotificationOutbox.createIndexes(); }
});
test('provedor simulado aceita uma vez e resposta incerta nunca reenvia automaticamente', async () => {
  await create(payload(true));
  const first = await NotificationOutbox.findOne().lean();
  assert.deepEqual(await dispatchOpening(first._id, () => { throw Error('must not call'); }), { state: 'not_configured' });
  process.env.WHATSAPP_ACCESS_TOKEN = 'synthetic-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567';
  process.env.WHATSAPP_GRAPH_VERSION = 'v23.0';
  process.env.WHATSAPP_OPENING_TEMPLATE = 'os_aberta';
  let calls = 0;
  const sender = async (_url, options) => { calls++; const body = JSON.parse(options.body);
    assert.equal(body.template.components[0].parameters[1].text, 'OS-0001');
    assert.equal(body.to, '5519900000123');
    return { ok: true, json: async () => ({ messages: [{ id: 'synthetic-message-id' }] }) }; };
  assert.deepEqual(await dispatchOpening(first._id, sender), { state: 'accepted' });
  assert.deepEqual(await dispatchOpening(first._id, sender), { state: 'not_pending' });
  assert.equal(calls, 1);
  assert.equal((await NotificationOutbox.findById(first._id)).providerMessageId, 'synthetic-message-id');
  await create({ ...payload(true), cliente: { nome: 'Cliente sintético', telefone: '19900000124' } });
  const uncertain = await NotificationOutbox.findOne({ state: 'pending' });
  assert.deepEqual(await dispatchOpening(uncertain._id, async () => { throw Error('response lost'); }), { state: 'uncertain' });
  assert.deepEqual(await dispatchOpening(uncertain._id, sender), { state: 'not_pending' });
  assert.equal(calls, 1);
  await create({ ...payload(true), cliente: { nome: 'Cliente sintético', telefone: '19900000125' } });
  const deletedOrderItem = await NotificationOutbox.findOne({ state: 'pending' });
  await Order.deleteOne({ _id: deletedOrderItem.orderId });
  assert.deepEqual(await dispatchOpening(deletedOrderItem._id, sender), { state: 'failed' });
  assert.equal(calls, 1);
});
