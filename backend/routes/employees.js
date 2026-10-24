import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { protect, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import AdminRoleGuard from '../models/AdminRoleGuard.js';

const router = express.Router();
const roles = ['admin', 'tecnico', 'atendente'];
const dto = user => ({ _id: user._id, username: user.username, name: user.name, role: user.role,
  active: user.active !== false, version: user.version ?? 1, createdAt: user.createdAt });
const etag = user => `"user-${user._id}-v${user.version ?? 1}"`;
const fail = (status, code, fields) => Object.assign(new Error(code), { status, code, fields });
const validId = id => { if (!/^[a-f\d]{24}$/i.test(id)) throw fail(400, 'INVALID_ID'); return new mongoose.Types.ObjectId(id); };
const versionFilter = raw => raw.version === undefined ? { $exists: false } : raw.version;

router.use((req, res, next) => { req.requestId = randomUUID(); res.set('Cache-Control', 'private, no-store'); next(); });
router.use(protect, authorize('admin'), express.json({ limit: '16kb' }));
router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const pageSize = req.query.pageSize === undefined ? 25 : Number(req.query.pageSize);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100
      || Object.keys(req.query).some(key => !['page', 'pageSize'].includes(key) || Array.isArray(req.query[key]))) throw fail(400, 'VALIDATION_ERROR');
    const [users, total] = await Promise.all([
      User.find({}).select('-password -sessionVersion').sort({ username: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      User.countDocuments({}),
    ]);
    res.json({ data: users.map(dto), meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.collection.findOne({ _id: validId(req.params.id) }, { projection: { password: 0, sessionVersion: 0 } });
    if (!user) throw fail(404, 'NOT_FOUND');
    res.set('ETag', etag(user)).json({ data: dto(user) });
  } catch (error) { next(error); }
});

async function mutate(req, operation) {
  const id = validId(req.params.id);
  const match = req.get('If-Match');
  if (!match) throw fail(428, 'PRECONDITION_REQUIRED');
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'VALIDATION_ERROR');
  const allowed = operation === 'edit' ? ['name', 'role'] : operation === 'access' ? ['active'] : ['password'];
  if (!Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) throw fail(400, 'VALIDATION_ERROR');
  if ('name' in body && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120)) throw fail(400, 'VALIDATION_ERROR', [{ path: 'name', code: 'INVALID' }]);
  if ('role' in body && !roles.includes(body.role)) throw fail(400, 'VALIDATION_ERROR', [{ path: 'role', code: 'INVALID' }]);
  if ('active' in body && typeof body.active !== 'boolean') throw fail(400, 'VALIDATION_ERROR', [{ path: 'active', code: 'INVALID' }]);
  if ('password' in body && (typeof body.password !== 'string' || body.password.length < 12 || Buffer.byteLength(body.password, 'utf8') > 72)) throw fail(400, 'VALIDATION_ERROR', [{ path: 'password', code: 'INVALID' }]);
  const passwordHash = operation === 'password' ? await bcrypt.hash(body.password, 10) : null;
  // Profile/access transitions share a write lock inside the same transaction.
  // This prevents two concurrent demotions/deactivations from removing both remaining admins.
  if (operation !== 'password') {
    await AdminRoleGuard.updateOne({ _id: 'roles' }, { $setOnInsert: { serial: 0 } }, { upsert: true }).catch(error => { if (error.code !== 11000) throw error; });
  }
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      if (operation !== 'password') await AdminRoleGuard.updateOne({ _id: 'roles' }, { $inc: { serial: 1 } }, { session });
      const raw = await User.collection.findOne({ _id: id }, { session });
      if (!raw) throw fail(404, 'NOT_FOUND');
      if (etag(raw) !== match) throw fail(412, 'VERSION_CONFLICT');
      const nextRole = operation === 'edit' && body.role !== undefined ? body.role : raw.role;
      const nextActive = operation === 'access' ? body.active : raw.active !== false;
      if (raw.role === 'admin' && raw.active !== false && (nextRole !== 'admin' || !nextActive)) {
        const count = await User.countDocuments({ role: 'admin', active: { $ne: false } }).session(session);
        if (count <= 1) throw fail(409, 'LAST_ADMIN');
      }
      const changes = operation === 'edit' ? { ...(body.name !== undefined ? { name: body.name.trim() } : {}), ...(body.role !== undefined ? { role: body.role } : {}) }
        : operation === 'access' ? { active: body.active } : { password: passwordHash };
      const version = (raw.version ?? 1) + 1;
      const result = await User.collection.updateOne({ _id: id, version: versionFilter(raw) }, {
        $set: { ...changes, version }, ...(operation === 'access' || operation === 'password' ? { $inc: { sessionVersion: 1 } } : {}),
      }, { session });
      if (!result.modifiedCount) throw fail(412, 'VERSION_CONFLICT');
      updated = { ...raw, ...changes, version };
    });
  } finally { await session.endSession(); }
  return updated;
}
for (const [method, path, operation] of [['patch', '/:id', 'edit'], ['patch', '/:id/access', 'access'], ['post', '/:id/password-reset', 'password']]) {
  router[method](path, async (req, res, next) => {
    try {
      const result = await mutate(req, operation);
      if (operation === 'password') return res.status(204).end();
      return res.set('ETag', etag(result)).json({ data: dto(result) });
    } catch (error) { next(error); }
  });
}
router.use((_req, _res, next) => next(fail(404, 'NOT_FOUND')));
router.use((error, req, res, _next) => {
  const status = error.status || (error.code === 112 ? 412 : 503);
  const code = error.code && typeof error.code === 'string' ? error.code : 'SERVICE_UNAVAILABLE';
  res.status(status).json({ error: { code: status === 503 ? 'SERVICE_UNAVAILABLE' : code,
    message: status === 503 ? 'Serviço temporariamente indisponível' : 'Não foi possível concluir a operação',
    ...(error.fields ? { fields: error.fields } : {}), requestId: req.requestId } });
});
export default router;
