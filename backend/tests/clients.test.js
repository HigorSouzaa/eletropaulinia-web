import { before, after, beforeEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import app from '../app.js';
import Client from '../models/Client.js';
import Order from '../models/OrderV2.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import { createInput, OrderError } from '../services/orderInput.js';
import { normalizePhone, formatPhone, formatPhoneInput } from '../../shared/phone.js';

let mongo, server, origin, token, actor;
const phone = '19900000042';
const payload = () => ({ cliente: { nome: 'Pessoa sintética A', telefone: phone }, dataEntrada: '2026-10-27', equipamentos: [{ nome: 'Rádio sintético', solicitacao: { tipo: 'testar' } }] });
before(async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  mongo = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'clients_slice_test' });
  await User.init(); await Client.createCollection(); await Client.createIndexes(); await Order.createIndexes(); await Counter.init();
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}/api/v2`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  mock.restoreAll();
  await Promise.all([Client.deleteMany({}), Order.deleteMany({}), Counter.deleteMany({}), User.deleteMany({})]);
  actor = await User.create({ username: 'synthetic-staff', name: 'Atendente sintético', role: 'atendente', password: 'Synthetic-password-42' });
  token = jwt.sign({ id: actor.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  await Counter.create({ _id: 'orders', value: 0 });
});
async function call(path, { body, method = body === undefined ? 'GET' : 'POST', auth = token, headers = {} } = {}) {
  const response = await fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
const create = (body = payload(), key = randomUUID()) => call('/orders', { body, headers: { 'Idempotency-Key': key } });
const lookup = value => call('/clients/lookup', { body: { telefone: value } });

test('normalização e máscara distinguem +55 de DDD 55 e não reparam entradas inválidas', () => {
  for (const input of [phone, '(19) 90000-0042', '+55 (19) 90000-0042', '5519900000042']) assert.equal(normalizePhone(input), '+5519900000042');
  assert.equal(normalizePhone('55900000042'), '+5555900000042');
  assert.equal(normalizePhone('(19) 3000-0042'), '+551930000042');
  assert.equal(formatPhone('+551930000042'), '(19) 3000-0042');
  assert.equal(formatPhone(phone), '(19) 90000-0042');
  for (const input of [null, {}, [phone], '19900', '199000000421', '+1 19900000042', '19900000042ramal', '019900000042', '1190000042', '+19900000042']) assert.equal(normalizePhone(input), null);
  assert.equal(formatPhone('0000'), '0000');
  assert.equal(formatPhoneInput('199000000421'), '199000000421');
  assert.equal(formatPhoneInput('ab19900'), 'ab19900');
});

test('lookup exige sessão, valida entrada, não grava e não confunde indisponibilidade com vazio', async () => {
  assert.equal((await call('/clients/lookup', { auth: null, body: { telefone: phone } })).status, 401);
  for (const body of [{ telefone: { $ne: null } }, { telefone: phone, role: 'admin' }, { telefone: '0000' }]) assert.equal((await call('/clients/lookup', { body })).status, 400);
  const empty = await lookup(phone);
  assert.equal(empty.status, 200); assert.equal(empty.body.data, null); assert.match(empty.headers.get('cache-control'), /no-store/);
  assert.equal(await Client.countDocuments(), 0);
  await Client.collection.dropIndex('client_phone_unique');
  try {
    assert.equal((await lookup(phone)).status, 503);
    assert.equal((await create()).status, 503);
    assert.equal(await Client.countDocuments(), 0); assert.equal(await Order.countDocuments(), 0);
  } finally { await Client.createIndexes(); }
});

test('nova OS cria ficha e snapshot; lookup retorna dados mínimos e segunda OS reutiliza o ID', async () => {
  const first = await create(); assert.equal(first.status, 201);
  const order = first.body.data;
  assert.match(order.clienteId, /^[a-f\d]{24}$/); assert.equal(order.cliente.telefone, '+5519900000042');
  assert.equal(order.cliente.email, null); assert.equal(order.creationHashVersion, undefined);
  const found = await lookup('(19) 90000-0042');
  assert.equal(found.status, 200); assert.equal(found.body.data._id, order.clienteId);
  assert.equal(found.body.data.usageFence, undefined); assert.equal(found.body.data.createdBy, undefined);
  assert.equal(found.headers.get('etag'), `"client-${order.clienteId}-v1"`);
  const rest = { ...payload() }; delete rest.cliente;
  const second = await create({ ...rest, clienteId: order.clienteId, clienteVersion: 1 });
  assert.equal(second.status, 201); assert.equal(second.body.data.clienteId, order.clienteId);
  assert.equal(await Client.countDocuments(), 1); assert.equal(await Order.countDocuments(), 2);
  assert.deepEqual((await call(`/orders/${order._id}`)).body.data, order);
  const reread = await lookup(phone); assert.equal(reread.body.data.version, 1);
  assert.equal(reread.body.data.updatedAt, found.body.data.updatedAt);
});

test('mesmo telefone com nome divergente não sobrescreve cadastro, e IDs/versões inválidos são rejeitados', async () => {
  const first = await create();
  const altered = payload(); altered.cliente.nome = 'Pessoa sintética diferente';
  const conflict = await create(altered); assert.equal(conflict.status, 409); assert.equal(conflict.body.error.code, 'CLIENT_REVIEW_REQUIRED');
  const rest = { ...payload() }; delete rest.cliente;
  for (const data of [
    { ...rest, clienteId: first.body.data.clienteId, clienteVersion: 2 },
    { ...rest, clienteId: new mongoose.Types.ObjectId().toString(), clienteVersion: 1 },
  ]) assert.equal((await create(data)).status, 409);
  for (const data of [
    { ...rest, clienteId: [first.body.data.clienteId], clienteVersion: 1 },
    { ...payload(), clienteId: first.body.data.clienteId, clienteVersion: 1 },
    { ...rest, clienteId: first.body.data.clienteId, clienteVersion: '1' },
  ]) assert.equal((await create(data)).status, 400);
  assert.equal(await Client.countDocuments(), 1); assert.equal(await Order.countDocuments(), 1);
  assert.equal((await Client.findById(first.body.data.clienteId)).nome, 'Pessoa sintética A');
});

test('criações concorrentes compatíveis compartilham ficha; divergentes conflitam sem perder a vencedora', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => create()));
  assert.ok(results.every(result => result.status === 201), JSON.stringify(results.map(r => [r.status, r.body.error?.code])));
  assert.equal(new Set(results.map(r => r.body.data.clienteId)).size, 1);
  assert.equal(new Set(results.map(r => r.body.data.numero)).size, 8);
  const conflicting = [payload(), payload()]; conflicting[0].cliente.telefone = '19900000043'; conflicting[1].cliente = { nome: 'Outra pessoa', telefone: '19900000043' };
  const races = await Promise.all(conflicting.map(body => create(body)));
  assert.deepEqual(races.map(r => r.status).sort(), [201, 409]);
  assert.equal(await Client.countDocuments(), 2); assert.equal(await Order.countDocuments(), 9);
});

test('mesma tentativa concorrente tem uma OS e replay continua válido após mudança de cadastro', async () => {
  const body = payload(), key = randomUUID();
  const results = await Promise.all(Array.from({ length: 6 }, () => create(body, key)));
  assert.equal(results.filter(r => r.status === 201).length, 1);
  assert.ok(results.every(r => [200, 201].includes(r.status)));
  assert.equal(await Client.countDocuments(), 1); assert.equal(await Order.countDocuments(), 1);
  const original = results[0].body.data;
  await Client.updateOne({ _id: original.clienteId }, { $set: { nome: 'Nome corrigido', telefone: '+5519900000049' }, $inc: { version: 1 } });
  const replayed = await create(body, key); assert.equal(replayed.status, 200); assert.deepEqual(replayed.body.data, original);
  const changed = payload(); changed.dataEntrada = '2026-10-26'; assert.equal((await create(changed, key)).body.error.code, 'IDEMPOTENCY_CONFLICT');
});

test('falha depois de resolver cliente desfaz ficha, uso do contador e OS', async () => {
  const original = Order.create;
  mock.method(Order, 'create', async () => { throw new OrderError(503, 'SYNTHETIC_STORAGE_FAILURE'); });
  try {
    const failed = await create(); assert.equal(failed.status, 503);
    assert.equal(await Client.countDocuments(), 0); assert.equal(await Order.countDocuments(), 0);
    assert.equal((await Counter.findById('orders')).value, 0);
  } finally { Order.create = original; }
  assert.equal((await create()).status, 201);
});

test('snapshot não pode alterar cliente por PATCH; ordem antiga com telefone incompleto continua editável', async () => {
  const created = await create(), id = created.body.data._id;
  const denied = await call(`/orders/${id}`, { method: 'PATCH', body: { cliente: { nome: 'Tentativa proibida' } }, headers: { 'If-Match': created.headers.get('etag') } });
  assert.equal(denied.status, 409); assert.equal(denied.body.error.code, 'CLIENT_SNAPSHOT_IMMUTABLE');
  assert.equal((await Client.findById(created.body.data.clienteId)).nome, 'Pessoa sintética A');
  const old = await Order.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
  old._id = new mongoose.Types.ObjectId(); old.numero = 'OS-9000'; old.sequencia = 9000;
  delete old.clienteId; delete old.creationKey; delete old.creationHash; delete old.creationHashVersion;
  old.cliente.telefone = '0000';
  await Order.collection.insertOne(old);
  const read = await call(`/orders/${old._id}`); assert.equal(read.body.data.clienteId, null);
  const changed = await call(`/orders/${old._id}/equipamentos/${old.equipamentos[0]._id}`, { method: 'PATCH', body: { marca: 'Marca sintética' }, headers: { 'If-Match': read.headers.get('etag') } });
  assert.equal(changed.status, 200); assert.equal(changed.body.data.cliente.telefone, '0000');
});

test('replay histórico usa algoritmo anterior mesmo com telefone hoje inválido', async () => {
  const body = payload(); body.cliente.telefone = '0000';
  const key = randomUUID(); const input = createInput(body);
  const document = await Order.create({ ...input, numero: 'OS-0999', sequencia: 999, createdBy: actor._id, creationKey: key,
    creationHash: createHash('sha256').update(JSON.stringify(input)).digest('hex') });
  const replayed = await create(body, key);
  assert.equal(replayed.status, 200); assert.equal(replayed.body.data._id, document.id);
  assert.equal(await Client.countDocuments(), 0);
});

test('cadastro mestre exige admin, CAS e telefone único; histórico usa ID estável', async () => {
 const first = await create(); const id = first.body.data.clienteId;
 const get = await call(`/clients/${id}`); const tag = get.headers.get('etag');
 assert.equal((await call(`/clients/${id}`, { method: 'PATCH', body: { nome: 'Novo nome' }, headers: { 'If-Match': tag } })).status, 403);
 await User.updateOne({ _id: actor._id }, { $set: { role: 'admin' } });
 const edited = await call(`/clients/${id}`, { method: 'PATCH', body: { nome: 'Nome corrigido', telefone: '(19) 90000-0099', email: null }, headers: { 'If-Match': tag } });
 assert.equal(edited.status, 200); assert.equal(edited.body.data.version, 2);
 assert.equal((await call(`/clients/${id}`, { method: 'PATCH', body: { nome: 'Concorrente' }, headers: { 'If-Match': tag } })).status, 412);
 const history = await call(`/orders?clienteId=${id}`); assert.equal(history.body.meta.total, 1); assert.equal(history.body.data[0].cliente.nome, 'Pessoa sintética A');
 const next = payload(); next.cliente.telefone = '19900000100'; await create(next);
 assert.equal((await call(`/clients/${id}`, { method: 'PATCH', body: { telefone: '19900000100' }, headers: { 'If-Match': edited.headers.get('etag') } })).status, 409);
 assert.equal((await call('/clients?q=%28%2E%2A%29')).body.meta.total, 0);
 assert.equal((await call('/clients?q=900000099')).body.meta.total, 1);
 assert.equal((await call('/orders?clienteId=invalid')).status, 400);
});

test('laudos e centavos persistem por equipamento; total, autoria e conflitos controlados', async () => {
 const body = payload(); body.equipamentos.push({ nome: 'Segundo', solicitacao: { tipo: 'testar' } });
 body.equipamentos[0].avaliacao = { laudo: 'Substituir componente', servicos: [{ descricao: 'Serviço A', valorCentavos: 101 }, { descricao: 'Serviço B', valorCentavos: 202 }] };
 const created = await create(body); assert.equal(created.status, 201); const order = created.body.data;
 assert.equal(order.equipamentos[0].avaliacao.totalCentavos, 303); assert.equal(order.equipamentos[1].avaliacao, null);
 const url = `/orders/${order._id}/equipamentos/${order.equipamentos[0]._id}`;
 const headers = { 'If-Match': created.headers.get('etag') };
 assert.equal((await call(url, { method: 'PATCH', body: { avaliacao: { laudo: null, servicos: [{ descricao: 'Inválido', valorCentavos: -1 }] } }, headers })).status, 400);
 const edit = await call(url, { method: 'PATCH', body: { avaliacao: { laudo: 'Revisado', servicos: [{ descricao: 'Cortesia', valorCentavos: 0 }] } }, headers });
 assert.equal(edit.status, 200); assert.equal(edit.body.data.equipamentos[0].avaliacao.totalCentavos, 0); assert.equal(edit.body.data.equipamentos[0].avaliacao.atualizadoPor, actor.id);
 assert.equal((await call(url, { method: 'PATCH', body: { avaliacao: null }, headers })).status, 412);
 const read = await call(`/orders/${order._id}`); assert.equal(read.body.data.equipamentos[0].avaliacao.laudo, 'Revisado'); assert.equal(read.body.data.status, order.status);
 const service = edit.body.data.equipamentos[0].avaliacao.servicos[0];
 const preserved = await call(url, { method: 'PATCH', body: { avaliacao: { laudo: 'Revisado', servicos: [{ _id: service._id, descricao: 'Cortesia revisada', valorCentavos: 0 }] } }, headers: { 'If-Match': edit.headers.get('etag') } });
 assert.equal(preserved.status, 200); assert.equal(preserved.body.data.equipamentos[0].avaliacao.servicos[0]._id, service._id);
});

test('técnicos elegíveis: seleção mínima, validação e preservação do responsável inativo', async () => {
 const tech = await User.create({ username: 'technical-test', name: 'Técnico teste', password: 'Synthetic-password-42', role: 'tecnico' });
 const eligible = await call('/technicians'); assert.deepEqual(Object.keys(eligible.body.data[0]).sort(), ['_id', 'name']);
 const bad = payload(); bad.tecnicoId = actor.id; assert.equal((await create(bad)).status, 409);
 const good = payload(); good.tecnicoId = tech.id; const result = await create(good); assert.equal(result.status, 201); assert.equal(result.body.data.tecnicoId, tech.id);
 await User.updateOne({ _id: tech._id }, { $set: { active: false } });
 assert.equal((await create(good)).status, 409);
 const patch = await call(`/orders/${result.body.data._id}`, { method: 'PATCH', body: { observacoes: 'Preservar responsável' }, headers: { 'If-Match': result.headers.get('etag') } });
 assert.equal(patch.status, 200); assert.equal(patch.body.data.tecnicoId, tech.id);
 const clear = await call(`/orders/${result.body.data._id}`, { method: 'PATCH', body: { tecnicoId: null }, headers: { 'If-Match': patch.headers.get('etag') } }); assert.equal(clear.status, 200); assert.equal(clear.body.data.tecnicoId, null);
});

test('retorno opcional e dias 89/90/91 por equipamento; retornos sucessivos não renovam', async () => {
 const original = (await create()).body.data;
 const withdrawn = new Date('2026-01-01T02:30:00Z'); // 31/12/2025 em São Paulo.
 await Order.updateOne({ _id: original._id }, { $set: { 'equipamentos.0.retirada': { retiradoEm: withdrawn, origem: 'operacao', registradoPor: actor._id }, status: 'Entregue' } });
 const base = payload(); base.tipoAtendimento = 'retorno';
 const unlinked = await create(base); assert.equal(unlinked.status, 201); assert.equal(unlinked.body.data.equipamentos[0].garantia.situacao, 'nao_verificavel');
 const released = await call(`/orders/${unlinked.body.data._id}/equipamentos/${unlinked.body.data.equipamentos[0]._id}/retirada`, { method: 'PUT', body: {}, headers: { 'If-Match': unlinked.headers.get('etag') } }); assert.equal(released.status, 200); assert.equal(released.body.data.equipamentos[0].garantia.inicio, null);
 base.equipamentos[0].origem = { ordemId: original._id, equipamentoId: original.equipamentos[0]._id, version: original.version };
 let returned;
 for (const [date, expected] of [['2026-03-30', 'dentro'], ['2026-03-31', 'dentro'], ['2026-04-01', 'fora']]) {
  base.dataEntrada = date; const response = await create(base); assert.equal(response.status, 201); assert.equal(response.body.data.equipamentos[0].garantia.situacao, expected); returned = response.body.data;
 }
 await Order.updateOne({ _id: returned._id }, { $set: { 'equipamentos.0.retirada': { retiradoEm: new Date('2026-04-02T15:00:00Z'), origem: 'operacao', registradoPor: actor._id } } });
 base.equipamentos[0].origem = { ordemId: returned._id, equipamentoId: returned.equipamentos[0]._id, version: returned.version }; base.dataEntrada = '2026-04-03';
 const again = await create(base); assert.equal(again.status, 201); assert.equal(again.body.data.equipamentos[0].garantia.fim, '2026-03-31'); assert.equal(again.body.data.equipamentos[0].garantia.situacao, 'fora');
 base.cliente.telefone = '19900000101'; assert.equal((await create(base)).status, 409);
});

test('reconciliação explícita isolada preserva snapshot, repete e retoma sem união automática', async () => {
 const { rehearseClientLinks, inventoryClientLinks } = await import('../services/clientReconciliation.js');
 const first = (await create()).body.data;
 await Order.updateOne({ _id: first._id }, { $unset: { clienteId: 1 } });
 const original = await Order.findById(first._id).lean();
 const mappings = [{ orderId: first._id, clientId: first.clienteId, version: first.version }];
 const inventory = await inventoryClientLinks(); assert.equal(inventory.orders, 1); assert.equal(inventory.linked, 0); assert.equal(inventory.invalidPhone, 0);
 const plan = await rehearseClientLinks(mappings); assert.equal(plan.planned, 1); assert.equal(plan.applied, 0);
 assert.equal((await rehearseClientLinks(mappings, { dryRun: false })).applied, 1);
 assert.equal((await rehearseClientLinks(mappings, { dryRun: false })).unchanged, 1);
 const after = await Order.findById(first._id).lean();
 assert.deepEqual(after.cliente, original.cliente); assert.deepEqual(after.equipamentos, original.equipamentos); assert.equal(after.numero, original.numero);
});

test('origem corrigida ou excluída é sinalizada; versões antigas e campos derivados não são aceitos', async () => {
 const initial = await create(); const original = initial.body.data;
 const pick = await call(`/orders/${original._id}/equipamentos/${original.equipamentos[0]._id}/retirada`, { method: 'PUT', body: {}, headers: { 'If-Match': initial.headers.get('etag') } });
 const data = payload(); data.tipoAtendimento = 'retorno'; data.equipamentos[0].origem = { ordemId: original._id, equipamentoId: original.equipamentos[0]._id, version: original.version };
 assert.equal((await create(data)).status, 409);
 data.equipamentos[0].origem.version = pick.body.data.version;
 const returned = await create(data); assert.equal(returned.status, 201);
 const corrected = await call(`/orders/${original._id}/equipamentos/${original.equipamentos[0]._id}/correcoes-retirada`, { method: 'POST', body: { motivo: 'Retirada lançada por engano' }, headers: { 'If-Match': pick.headers.get('etag') } }); assert.equal(corrected.status, 200);
 const read = await call(`/orders/${returned.body.data._id}`); assert.equal(read.body.data.equipamentos[0].origemSituacao, 'revisar'); assert.equal(read.body.data.equipamentos[0].garantia.situacao, 'nao_verificavel');
 await User.updateOne({ _id: actor._id }, { $set: { role: 'admin' } });
 const deleted = await fetch(origin + `/orders/${original._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'If-Match': corrected.headers.get('etag') } }); assert.equal(deleted.status, 204);
 const after = await call(`/orders/${returned.body.data._id}`); assert.equal(after.status, 200); assert.equal(after.body.data.equipamentos[0].retorno.numero, original.numero); assert.equal(after.body.data.equipamentos[0].origemSituacao, 'indisponivel');
 const bad = payload(); bad.equipamentos[0].avaliacao = { laudo: null, servicos: [], totalCentavos: 0 }; assert.equal((await create(bad)).status, 400);
});

test('garantia manual só admin, com motivo, histórico e sem mudar retirada nem renovar retorno', async () => {
 const initial = await create(); const id = initial.body.data._id, eid = initial.body.data.equipamentos[0]._id;
 const pick = await call(`/orders/${id}/equipamentos/${eid}/retirada`, { method: 'PUT', body: {}, headers: { 'If-Match': initial.headers.get('etag') } });
 const before = pick.body.data.equipamentos[0]; const url = `/orders/${id}/equipamentos/${eid}/garantia`;
 const body = { fim: '2027-12-31', motivo: 'Extensão autorizada pelo administrador' };
 assert.equal((await call(url, { method: 'PATCH', body, headers: { 'If-Match': pick.headers.get('etag') } })).status, 403);
 await User.updateOne({ _id: actor._id }, { $set: { role: 'admin' } });
 assert.equal((await call(url, { method: 'PATCH', body: { ...body, motivo: '' }, headers: { 'If-Match': pick.headers.get('etag') } })).status, 400);
 const updated = await call(url, { method: 'PATCH', body, headers: { 'If-Match': pick.headers.get('etag') } }); assert.equal(updated.status, 200);
 const item = updated.body.data.equipamentos[0]; assert.deepEqual(item.retirada, before.retirada); assert.equal(item.garantia.fim, body.fim); assert.equal(item.garantiaAjustes[0].fimAnterior, before.garantia.fim); assert.equal(item.garantiaAjustes[0].por, actor.id);
 assert.equal((await call(url, { method: 'PATCH', body, headers: { 'If-Match': pick.headers.get('etag') } })).status, 412);
 const next = payload(); next.tipoAtendimento = 'retorno'; next.equipamentos[0].origem = { ordemId: id, equipamentoId: eid, version: updated.body.data.version };
 const returned = await create(next); assert.equal(returned.status, 201); assert.equal(returned.body.data.equipamentos[0].garantia.fim, body.fim);
 const unknownInput = payload(); unknownInput.tipoAtendimento = 'retorno';
 const unknown = await create(unknownInput); const unknownItem = unknown.body.data.equipamentos[0];
 const manual = await call(`/orders/${unknown.body.data._id}/equipamentos/${unknownItem._id}/garantia`, { method: 'PATCH', body, headers: { 'If-Match': unknown.headers.get('etag') } });
 assert.equal(manual.status, 200); assert.equal(manual.body.data.equipamentos[0].garantia.inicio, null); assert.equal(manual.body.data.equipamentos[0].garantia.ajustada, true); assert.equal(manual.body.data.equipamentos[0].retirada, null);
});
