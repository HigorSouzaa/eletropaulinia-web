import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/OrderV2.js';
import Client from '../models/Client.js';
import Counter from '../models/Counter.js';
import NotificationOutbox from '../models/NotificationOutbox.js';
import { WhatsAppWebSession, whatsappWeb } from '../services/whatsappWeb.js';

let mongo, server, origin, admin, attendant;
before(async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  mongo = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'whatsapp_web_test' });
  await User.init(); await Client.createCollection(); await Client.createIndexes(); await Order.createCollection(); await Order.createIndexes();
  await NotificationOutbox.createCollection(); await NotificationOutbox.createIndexes(); await Counter.init();
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Client.deleteMany({}), Order.deleteMany({}), Counter.deleteMany({}), NotificationOutbox.deleteMany({})]);
  const a = await User.create({ username: 'admin-synthetic', name: 'Admin sintético', role: 'admin', password: 'Synthetic-password-42' });
  const b = await User.create({ username: 'staff-synthetic', name: 'Atendente sintético', role: 'atendente', password: 'Synthetic-password-42' });
  admin = jwt.sign({ id: a.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  attendant = jwt.sign({ id: b.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  await Counter.create({ _id: 'orders', value: 0 });
  await whatsappWeb.disconnect();
});
const call = (path, token, method = 'GET', body) => fetch(`${origin}/api/v2/${path}`, { method,
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}) });

test('status exige sessão; QR e comandos são exclusivos de admin', async () => {
  assert.equal((await call('whatsapp/status')).status, 401);
  assert.equal((await call('whatsapp/status', attendant)).status, 200);
  assert.equal((await call('whatsapp/qr', attendant)).status, 403);
  assert.equal((await call('whatsapp/connect', attendant, 'POST')).status, 403);
  assert.equal((await call('whatsapp/disconnect', attendant, 'POST')).status, 403);
  assert.equal((await call('whatsapp/qr', admin)).status, 404);
  assert.match((await call('whatsapp/status', admin)).headers.get('cache-control'), /no-store/);
});

test('criação de OS não agenda nem envia mensagem, mesmo em payload antigo com autorização', async () => {
  const body = { cliente: { nome: 'Cliente sintético', telefone: '19900000123' }, dataEntrada: '2026-11-03',
    equipamentos: [{ nome: 'Equipamento sintético', solicitacao: { tipo: 'testar' } }],
    comunicacao: { whatsapp: { autorizado: true, origem: 'presencial' } } };
  const response = await call('orders', attendant, 'POST', body);
  assert.equal(response.status, 201);
  assert.equal(await Order.countDocuments(), 1);
  assert.equal(await NotificationOutbox.countDocuments(), 0);
});

test('sessão falsa gera QR temporário, autentica e desconecta sem mensagem', async () => {
  const fake = new EventEmitter();
  fake.initialize = async () => { fake.emit('qr', 'synthetic-qr'); };
  fake.destroy = async () => {};
  const session = new WhatsAppWebSession(async () => fake);
  await session.connect();
  assert.equal(session.snapshot().state, 'aguardando_qr');
  assert.equal(session.qrValue(), 'synthetic-qr');
  fake.emit('authenticated'); fake.emit('ready');
  assert.equal(session.snapshot().state, 'conectado');
  assert.equal(session.qrValue(), null);
  await session.disconnect();
  assert.equal(session.snapshot().state, 'desconectado');
});

test('QR simulado só é entregue ao administrador e não revela o valor bruto', async () => {
  const originalFactory = whatsappWeb.factory;
  const fake = new EventEmitter();
  fake.initialize = async () => { fake.emit('qr', 'synthetic-secret-qr'); };
  fake.destroy = async () => {};
  whatsappWeb.factory = async () => fake;
  try {
    assert.equal((await call('whatsapp/connect', admin, 'POST')).status, 200);
    const allowed = await call('whatsapp/qr', admin);
    assert.equal(allowed.status, 200);
    assert.match(allowed.headers.get('cache-control'), /no-store/);
    const body = await allowed.json();
    assert.match(body.data.image, /^data:image\/png;base64,/);
    assert.doesNotMatch(JSON.stringify(body), /synthetic-secret-qr/);
    assert.equal((await call('whatsapp/qr', attendant)).status, 403);
  } finally { whatsappWeb.factory = originalFactory; await whatsappWeb.disconnect(); }
});

test('conexões concorrentes iniciam um cliente só; desconexão invalida inicialização tardia', async () => {
  let calls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const fake = new EventEmitter();
  fake.initialize = async () => {};
  fake.destroy = async () => {};
  const session = new WhatsAppWebSession(async () => { calls++; await gate; return fake; });
  const a = session.connect(); const b = session.connect();
  assert.equal(calls, 1);
  await session.disconnect();
  release();
  await Promise.all([a, b]);
  assert.equal(session.snapshot().state, 'desconectado');
  assert.equal(session.client, null);
});

test('falha de inicialização libera tentativa posterior', async () => {
  let calls = 0;
  const fake = new EventEmitter(); fake.initialize = async () => { throw new Error('synthetic browser failure'); }; fake.destroy = async () => {};
  const session = new WhatsAppWebSession(async () => { calls++; return fake; });
  await session.connect();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(session.snapshot().state, 'erro');
  await session.connect();
  assert.equal(calls, 2);
  await session.disconnect();
});
