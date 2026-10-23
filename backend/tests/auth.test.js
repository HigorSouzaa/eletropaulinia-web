import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import RevokedToken from '../models/RevokedToken.js';

let mongo;
let server;
let origin;
let admin;
const password = 'Synthetic-test-password-42';
const runNode = promisify(execFile);

before(async () => {
  // Não importa dotenv e nunca usa a URI de banco configurada pela pessoa.
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  process.env.JWT_EXPIRE = '15m';
  mongo = await MongoMemoryServer.create({
    binary: { version: '8.0.17' },
    instance: { ip: '127.0.0.1' },
  });
  await mongoose.connect(mongo.getUri(), { dbName: 'eletropaulinia_test' });
  await Promise.all([User.init(), Order.init(), RevokedToken.init()]);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Order.deleteMany({}), RevokedToken.deleteMany({})]);
  admin = await User.create({ username: 'admin-test', name: 'Admin sintético', password, role: 'admin' });
});

function tokenFor(user, options = {}) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '15m', ...options });
}

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${origin}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

test('cadastro anônimo não cria usuário nem administrador', async () => {
  for (const role of ['atendente', 'admin']) {
    const result = await request('/auth/register', { method: 'POST', body: { username: `new-${role}`, name: 'Teste', password, role } });
    assert.equal(result.status, 401);
  }
  assert.equal(await User.countDocuments(), 1);
});

test('token de usuário removido não permite consultar ordens', async () => {
  const token = tokenFor(admin);
  await User.deleteOne({ _id: admin._id });
  const result = await request('/orders', { token });
  assert.equal(result.status, 401);
});

test('login, perfil e hash são persistidos sem revelar senha', async () => {
  const result = await request('/auth/login', { method: 'POST', body: { username: admin.username, password } });
  assert.equal(result.status, 200);
  assert.equal(result.body.password, undefined);
  assert.equal(typeof result.body.token, 'string');
  const stored = await User.findById(admin._id).select('+password');
  assert.notEqual(stored.password, password);
  assert.equal(await stored.matchPassword(password), true);
  const profile = await request('/auth/me', { token: result.body.token });
  assert.equal(profile.status, 200);
  assert.equal(profile.body._id, admin._id.toString());
  assert.equal(profile.body.password, undefined);
});

test('token ausente, adulterado ou expirado não permite acesso', async () => {
  for (const token of [undefined, 'invalid-token', tokenFor(admin, { expiresIn: -1 })]) {
    assert.equal((await request('/orders', { token })).status, 401);
  }
});

test('somente admin provisiona usuários; resposta não inclui senha nem sessão', async () => {
  for (const role of ['tecnico', 'atendente']) {
    const user = await User.create({ username: role, name: 'Teste', password, role });
    const result = await request('/auth/register', { method: 'POST', token: tokenFor(user), body: { username: `created-${role}`, name: 'Teste', password, role: 'admin' } });
    assert.equal(result.status, 403);
    assert.equal(await User.exists({ username: `created-${role}` }), null);
  }
  for (const role of ['admin', 'tecnico', 'atendente']) {
    const result = await request('/auth/register', { method: 'POST', token: tokenFor(admin), body: { username: `allowed-${role}`, name: 'Teste', password, role } });
    assert.equal(result.status, 201);
    assert.equal(result.body.role, role);
    assert.equal(result.body.token, undefined);
    assert.equal(result.body.password, undefined);
    assert.equal((await User.findById(result.body._id)).role, role);
  }
});

test('cadastro valida campos e retorna conflito de usuário sem detalhes internos', async () => {
  const body = { username: 'valid-user', name: 'Teste', password };
  for (const change of [{ username: { $ne: null } }, { role: 'owner' }, { password: 'short' }, { password: 'é'.repeat(40) }, { name: '' }, { extra: true }]) {
    const result = await request('/auth/register', { method: 'POST', token: tokenFor(admin), body: { ...body, ...change } });
    assert.equal(result.status, 400);
    assert.equal(result.body.password, undefined);
  }
  assert.equal(await User.countDocuments(), 1);
  const duplicate = await request('/auth/register', { method: 'POST', token: tokenFor(admin), body: { ...body, username: admin.username } });
  assert.equal(duplicate.status, 409);
  assert.deepEqual(Object.keys(duplicate.body), ['message']);
});

test('login rejeita tipos inesperados e credenciais incorretas', async () => {
  for (const body of [{ username: { $ne: '' }, password }, { username: admin.username, password: [] }, {}]) {
    assert.equal((await request('/auth/login', { method: 'POST', body })).status, 400);
  }
  for (const username of ['missing-user', admin.username]) {
    assert.equal((await request('/auth/login', { method: 'POST', body: { username, password: 'wrong-password' } })).status, 401);
  }
});

test('alterar nome não recalcula hash da senha', async () => {
  const user = await User.findById(admin._id).select('+password');
  const originalHash = user.password;
  user.name = 'Novo nome sintético';
  await user.save();
  const stored = await User.findById(admin._id).select('+password');
  assert.equal(stored.password, originalHash);
  assert.equal(await stored.matchPassword(password), true);
});

test('perfis internos leem legado; escritores v1 ficam bloqueados na transição v2', async () => {
  for (const role of ['tecnico', 'atendente', 'admin']) {
    const user = await User.create({ username: `os-${role}`, name: 'Teste', password, role });
    const token = tokenFor(user);
    const body = { cliente: 'Cliente sintético', telefone: '00000000000', equipamento: 'Teste', marca: 'Teste', defeito: 'Teste', dataEntrada: '2026-10-22' };
    const fixture = await Order.create({ ...body, numero: `OS-000${['tecnico', 'atendente', 'admin'].indexOf(role) + 1}` });
    assert.equal((await request('/orders', { method: 'POST', token, body })).status, 409);
    const id = fixture.id;
    assert.equal((await request(`/orders/${id}`, { token })).status, 200);
    const updated = await request(`/orders/${id}`, { method: 'PUT', token, body: { cliente: 'Cliente atualizado' } });
    assert.equal(updated.status, 409);
    assert.equal((await Order.findById(id)).cliente, 'Cliente sintético');
    const status = await request(`/orders/${id}/status`, { method: 'PATCH', token, body: { status: 'Pronto' } });
    assert.equal(status.status, 409);
    assert.equal((await Order.findById(id)).status, 'Aguardando');
    const deleted = await request(`/orders/${id}`, { method: 'DELETE', token });
    assert.equal(deleted.status, role === 'admin' ? 409 : 403);
    assert.equal(Boolean(await Order.exists({ _id: id })), true);
  }
});

test('JSON malformado retorna erro genérico sem stack', async () => {
  const result = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(result.status, 400);
  assert.deepEqual(await result.json(), { message: 'Requisição inválida' });
});

test('mudança de perfil vale imediatamente para um token já emitido', async () => {
  const token = tokenFor(admin);
  await User.updateOne({ _id: admin._id }, { role: 'atendente' });
  const result = await request('/auth/register', { method: 'POST', token, body: { username: 'blocked', name: 'Teste', password } });
  assert.equal(result.status, 403);
});

test('provisionamento inicial é manual e não substitui administrador existente', async () => {
  await User.deleteMany({});
  const env = { ...process.env, MONGODB_URI: mongo.getUri('eletropaulinia_test'), ADMIN_USERNAME: 'bootstrap-test', ADMIN_NAME: 'Bootstrap sintético', ADMIN_PASSWORD: password };
  const result = await runNode(process.execPath, ['create-admin.js'], { env, timeout: 20000 });
  assert.equal(result.stdout.includes(password), false);
  const user = await User.findOne({ username: 'bootstrap-test' }).select('+password');
  assert.equal(user.role, 'admin');
  assert.equal(await user.matchPassword(password), true);
  await assert.rejects(runNode(process.execPath, ['create-admin.js'], { env, timeout: 20000 }), error => {
    assert.equal(error.code, 1);
    assert.equal(error.stderr.includes(password), false);
    return true;
  });
  assert.equal(await User.countDocuments(), 1);
});

test('startup incompleto falha antes de conectar ao banco', async () => {
  await assert.rejects(runNode(process.execPath, ['server.js'], {
    env: { ...process.env, MONGODB_URI: '', JWT_SECRET: '' }, timeout: 10000,
  }), error => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Falha ao iniciar API/);
    return true;
  });
});
test('logout revoga somente o token atual e novo login recebe outra identidade', async () => {
  const login = () => request('/auth/login', { method:'POST', body:{username:admin.username,password} });
  const a = await login(), b = await login();
  assert.notEqual(a.body.token, b.body.token);
  assert.equal((await request('/auth/logout', {method:'POST',token:a.body.token,body:{}})).status,204);
  assert.equal((await request('/orders', {token:a.body.token})).status,401);
  assert.equal((await request('/orders', {token:b.body.token})).status,200);
  assert.equal((await request('/auth/logout', {method:'POST',token:a.body.token,body:{}})).status,401);
  const stored = await RevokedToken.findOne().lean();
  assert.equal(stored.hash.length,64);
  assert.equal(JSON.stringify(stored).includes(a.body.token),false);
  assert.equal(await RevokedToken.countDocuments(),1);
});

test('logout concorrente não perde revogação nem invalida login posterior', async () => {
  const token = tokenFor(admin);
  const results = await Promise.all([1,2].map(()=>request('/auth/logout',{method:'POST',token,body:{}})));
  assert.ok(results.every(r=>[204,401].includes(r.status)));
  assert.equal((await request('/auth/me',{token})).status,401);
  assert.equal(await RevokedToken.countDocuments(),1);
});

test('token sem expiração é rejeitado', async () => {
  const token = jwt.sign({id:admin._id.toString()},process.env.JWT_SECRET);
  assert.equal((await request('/orders',{token})).status,401);
});
