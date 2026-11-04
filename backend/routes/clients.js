import express from 'express';
import { randomUUID } from 'node:crypto';
import { protect, authorize } from '../middleware/auth.js';
import Client from '../models/Client.js';
import { clientDTO, clientAdminDTO, clientEtag, clientPhone, requireClientsReady, requireClientDocumentReady } from '../services/clients.js';
import { clientIdentityInput } from '../services/clientIdentity.js';
import { object, OrderError, validId, clientSnapshotInput } from '../services/orderInput.js';

const router = express.Router();
router.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set('Cache-Control', 'private, no-store');
  next();
});
router.use(protect, express.json({ limit: '4kb' }));
router.post('/lookup', async (req, res, next) => {
  try {
    object(req.body, ['telefone'], 'body');
    const telefone = clientPhone(req.body.telefone);
    await requireClientsReady();
    const client = await Client.findOne({ telefone }).maxTimeMS(5000).lean();
    if (client) res.set('ETag', clientEtag(client));
    res.json({ data: client ? clientDTO(client) : null });
  } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try {
    object(req.query, ['q', 'page', 'pageSize'], 'query');
    for (const value of Object.values(req.query)) if (typeof value !== 'string') throw new OrderError(400, 'VALIDATION_ERROR');
    const page = Number(req.query.page || 1), pageSize = Number(req.query.pageSize || 25), q = (req.query.q || '').trim();
    if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || q.length > 100) throw new OrderError(400, 'VALIDATION_ERROR');
    const escaped = [...q].map(c => /[a-zA-Z0-9À-ÿ ]/.test(c) ? c : '\\' + c).join('');
    const digits = q.replace(/\D/g, '');
    const filter = q ? { $or: [{ nome: { $regex: escaped, $options: 'i' } }, ...(digits ? [{ telefone: { $regex: digits } }] : [])] } : {};
    const rows = await Client.find(filter).sort({ nome: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).maxTimeMS(5000).lean();
    const total = await Client.countDocuments(filter).maxTimeMS(5000);
    res.json({ data: rows.map(clientDTO), meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    validId(req.params.id); const client = await Client.findById(req.params.id).lean();
    if (!client) throw new OrderError(404, 'NOT_FOUND');
    res.set('ETag', clientEtag(client)).json({ data: req.user.role === 'admin' ? clientAdminDTO(client) : clientDTO(client) });
  } catch (error) { next(error); }
});
router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    validId(req.params.id); object(req.body, ['nome', 'telefone', 'email', 'tipoPessoa', 'documento', 'endereco'], 'body');
    const client = await Client.findById(req.params.id).lean();
    if (!client) throw new OrderError(404, 'NOT_FOUND');
    if (!req.get('If-Match')) throw new OrderError(428, 'PRECONDITION_REQUIRED');
    if (req.get('If-Match') !== clientEtag(client)) throw new OrderError(412, 'VERSION_CONFLICT');
    const input = clientSnapshotInput({ nome: req.body.nome === undefined ? client.nome : req.body.nome, telefone: req.body.telefone === undefined ? client.telefone : req.body.telefone, email: req.body.email === undefined ? client.email : req.body.email });
    input.telefone = clientPhone(input.telefone); await requireClientsReady();
    const identity = clientIdentityInput(req.body, client);
    if (identity.documento) await requireClientDocumentReady();
    const updated = await Client.findOneAndUpdate({ _id: client._id, version: client.version }, { $set: { ...input, ...identity, updatedBy: req.user._id }, $inc: { version: 1 } }, { new: true, runValidators: true });
    if (!updated) throw new OrderError(412, 'VERSION_CONFLICT');
    res.set('ETag', clientEtag(updated)).json({ data: clientAdminDTO(updated) });
  } catch (error) { next(error.code === 11000 ? new OrderError(409, error.keyPattern?.documento ? 'DOCUMENT_IN_USE' : 'PHONE_IN_USE') : error); }
});
router.use((_req, _res, next) => next(new OrderError(404, 'NOT_FOUND')));
router.use((error, req, res, _next) => {
  const status = error instanceof OrderError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
  const code = error instanceof OrderError ? error.code : status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : 'SERVICE_UNAVAILABLE';
  res.status(status).json({ error: { code, message: status === 503 ? 'Serviço temporariamente indisponível' : 'Não foi possível concluir a operação',
    ...(error instanceof OrderError ? { fields: error.fields } : {}), requestId: req.requestId } });
});
export default router;
