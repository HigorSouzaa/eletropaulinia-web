import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import AdminRoleGuard from '../models/AdminRoleGuard.js';

let mongo, server, origin, admin, second, staff;
const password = 'Synthetic-test-password-42';
before(async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  process.env.JWT_EXPIRE = '15m';
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.0.17' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'employees_test' });
  await User.init();
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), AdminRoleGuard.deleteMany({})]);
  [admin, second, staff] = await User.create([
    { username: 'admin-a', name: 'Admin A', role: 'admin', password },
    { username: 'admin-b', name: 'Admin B', role: 'admin', password },
    { username: 'staff', name: 'Atendente', role: 'atendente', password },
  ]);
});
async function login(username) {
  const response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  assert.equal(response.status, 200); return (await response.json()).token;
}
async function request(path, { method = 'GET', token, body, match } = {}) {
  const response = await fetch(`${origin}/api/v2/employees${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(match ? { 'If-Match': match } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: response.status === 204 ? null : await response.json(), etag: response.headers.get('etag') };
}
test('listagem, dados públicos, autorização e cadastro sem trocar sessão', async () => {
  const token = await login('admin-a');
  const list = await request('?page=1&pageSize=2', { token });
  assert.equal(list.status, 200); assert.equal(list.body.data.length, 2); assert.equal(list.body.meta.total, 3);
  assert.equal(list.body.data[0].password, undefined); assert.equal(list.body.data[0].sessionVersion, undefined);
  const denied = await request('', { token: await login('staff') }); assert.equal(denied.status, 403);
  assert.equal((await request('', {})).status, 401);
  const created = await fetch(`${origin}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username: 'new-staff', name: 'Novo', role: 'tecnico', password }) });
  assert.equal(created.status, 201); assert.equal((await created.json()).token, undefined);
  assert.equal((await request('', { token })).body.meta.total, 4);
});
test('edição versionada e proteção do último administrador', async () => {
  const token = await login('admin-a');
  const target = await request(`/${admin.id}`, { token });
  assert.equal(target.status, 200);
  const changed = await request(`/${admin.id}`, { method: 'PATCH', token, match: target.etag, body: { name: 'Nome novo', role: 'tecnico' } });
  assert.equal(changed.status, 200, JSON.stringify(changed.body)); assert.equal(changed.body.data.role, 'tecnico');
  assert.equal((await request(`/${admin.id}`, { method: 'PATCH', token, match: target.etag, body: { name: 'Antigo' } })).status, 403);
  const remainingToken = await login('admin-b');
  const remaining = await request(`/${second.id}`, { token: remainingToken });
  const blocked = await request(`/${second.id}`, { method: 'PATCH', token: remainingToken, match: remaining.etag, body: { role: 'atendente' } });
  assert.equal(blocked.status, 409); assert.equal((await User.findById(second.id)).role, 'admin');
});
test('dois administradores não podem ser desativados simultaneamente', async () => {
  const tokenA = await login('admin-a'), tokenB = await login('admin-b');
  const first = await request(`/${admin.id}`, { token: tokenA }), last = await request(`/${second.id}`, { token: tokenB });
  const results = await Promise.all([
    request(`/${admin.id}/access`, { method: 'PATCH', token: tokenA, match: first.etag, body: { active: false } }),
    request(`/${second.id}/access`, { method: 'PATCH', token: tokenB, match: last.etag, body: { active: false } }),
  ]);
  assert.equal(results.filter(result => result.status === 200).length, 1, JSON.stringify(results));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409], JSON.stringify(results));
  assert.equal(await User.countDocuments({ role: 'admin', active: { $ne: false } }), 1);
  const disabled = results[0].status === 200 ? tokenA : tokenB;
  assert.equal((await request('', { token: disabled })).status, 401);
});
test('redefinição presencial invalida todas as sessões antigas e exige senha nova', async () => {
  const token = await login('admin-a');
  const oldSession = await login('staff');
  const user = await request(`/${staff.id}`, { token });
  const reset = await request(`/${staff.id}/password-reset`, { method: 'POST', token, match: user.etag,
    body: { password: 'New-synthetic-password-43' } });
  assert.equal(reset.status, 204, JSON.stringify(reset.body));
  assert.equal((await request('', { token: oldSession })).status, 401);
  const oldLogin = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'staff', password }) });
  assert.equal(oldLogin.status, 401);
  const newLogin = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'staff', password: 'New-synthetic-password-43' }) });
  assert.equal(newLogin.status, 200);
});
test('entradas inválidas, versão antiga e perfil não autorizado não alteram funcionários', async () => {
  const token = await login('admin-a'), other = await login('staff');
  const target = await request(`/${staff.id}`, { token });
  assert.equal((await request(`/${staff.id}`, { method: 'PATCH', token: other, match: target.etag, body: { role: 'admin' } })).status, 403);
  assert.equal((await request(`/${staff.id}`, { method: 'PATCH', token, body: { name: 'Outro' } })).status, 428);
  assert.equal((await request(`/${staff.id}`, { method: 'PATCH', token, match: target.etag, body: { password: 'exposta' } })).status, 400);
  assert.equal((await request(`/${staff.id}/access`, { method: 'PATCH', token, match: target.etag, body: { active: 'false' } })).status, 400);
  const changed = await request(`/${staff.id}`, { method: 'PATCH', token, match: target.etag, body: { name: 'Nome atualizado' } });
  assert.equal(changed.status, 200);
  assert.equal((await request(`/${staff.id}`, { method: 'PATCH', token, match: target.etag, body: { role: 'admin' } })).status, 412);
  assert.equal((await User.findById(staff.id)).role, 'atendente');
});
