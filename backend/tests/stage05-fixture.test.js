import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { inventoryFixture, migrateFixtureBatch } from '../services/stage05FixtureMigration.js';

let mongo; let db;
before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '8.0.17' }, instance: { ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'stage05_fixture_only' });
  db = mongoose.connection.db;
});
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => { await db.collection('orders').deleteMany({}); });
const legacy = (n, overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(), numero: `OS-${String(n).padStart(4, '0')}`,
  cliente: 'Pessoa sintética', telefone: '0000', equipamento: 'Rádio sintético',
  marca: '', defeito: 'Não liga', status: 'Entregue',
  dataEntrada: new Date('2020-01-01T12:00:00Z'), createdAt: new Date('2020-01-01T12:00:00Z'),
  referenciaExtra: 'Sintética', ...overrides,
});

test('inventário só entrega agregados e conversão preserva identidade, origem e horário desconhecido', async () => {
  const raw = legacy(1);
  await db.collection('orders').insertOne(raw);
  const beforeReport = await inventoryFixture(db);
  assert.deepEqual({ total: beforeReport.total, legacy: beforeReport.legacy, ready: beforeReport.ready }, { total: 1, legacy: 1, ready: 1 });
  assert.equal(JSON.stringify(beforeReport).includes('Pessoa sintética'), false);
  assert.equal(JSON.stringify(beforeReport).includes('0000'), false);
  const result = await migrateFixtureBatch(db, { batchSize: 1 });
  assert.equal(result.transformed, 1);
  const migrated = await db.collection('orders').findOne({ _id: raw._id });
  assert.equal(migrated.numero, raw.numero);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.migration.original.referenciaExtra, 'Sintética');
  assert.equal(migrated.equipamentos[0].retirada.retiradoEm, null);
  assert.equal(migrated.equipamentos[0].andamento, null);
  assert.equal((await migrateFixtureBatch(db)).transformed, 0);
  assert.deepEqual(await db.collection('orders').findOne({ _id: raw._id }), migrated);
});

test('falha sintética no meio permite retomada sem duplicar IDs ou descartar OS', async () => {
  const records = [legacy(1), legacy(2), legacy(3)];
  await db.collection('orders').insertMany(records);
  await assert.rejects(migrateFixtureBatch(db, { batchSize: 3, failAfter: 1 }), /Synthetic interruption/);
  assert.equal((await inventoryFixture(db)).v2, 1);
  const resumed = await migrateFixtureBatch(db, { batchSize: 2 });
  assert.equal(resumed.transformed, 2);
  assert.equal((await migrateFixtureBatch(db)).transformed, 0);
  const final = await db.collection('orders').find({}).toArray();
  assert.deepEqual(new Set(final.map(item => String(item._id))), new Set(records.map(item => String(item._id))));
  assert.deepEqual(new Set(final.map(item => item.numero)), new Set(records.map(item => item.numero)));
  assert.ok(final.every(item => item.equipamentos.length === 1 && item.migration.original));
});

test('registro incompleto fica intacto e não impede conversão dos demais', async () => {
  const blocked = legacy(1, { defeito: '' }); const ready = legacy(2);
  await db.collection('orders').insertMany([blocked, ready]);
  const report = await inventoryFixture(db);
  assert.equal(report.blocked, 1);
  assert.equal(report.issueCategories['equipamentos.0.solicitacao'], 1);
  const result = await migrateFixtureBatch(db, { batchSize: 1 });
  assert.equal(result.blocked, 1);
  assert.equal(result.transformed, 1);
  assert.deepEqual(await db.collection('orders').findOne({ _id: blocked._id }), blocked);
  assert.equal((await db.collection('orders').findOne({ _id: ready._id })).schemaVersion, 2);
});

test('número inválido ou duplicado bloqueia todas as escritas sem renumerar', async () => {
  const a = legacy(7); const b = legacy(8, { numero: 'OS-00007' });
  await db.collection('orders').insertMany([a, b]);
  assert.equal((await inventoryFixture(db)).duplicateNumbers, 1);
  await assert.rejects(migrateFixtureBatch(db), /Numbering reconciliation required/);
  assert.equal((await inventoryFixture(db)).v2, 0);
  await db.collection('orders').deleteOne({ _id: b._id });
  await db.collection('orders').insertOne(legacy(9, { numero: 'INVALID' }));
  assert.equal((await inventoryFixture(db)).invalidNumbers, 1);
  await assert.rejects(migrateFixtureBatch(db), /Numbering reconciliation required/);
  assert.equal((await inventoryFixture(db)).v2, 0);
});

test('serviço recusa conexão fora do banco descartável de ensaio', async () => {
  await assert.rejects(inventoryFixture({ databaseName: 'production' }), /Disposable stage-05 database required/);
  await assert.rejects(migrateFixtureBatch({ databaseName: 'production' }), /Disposable stage-05 database required/);
  await assert.rejects(migrateFixtureBatch(db, { batchSize: 0 }), /Invalid batch size/);
});
