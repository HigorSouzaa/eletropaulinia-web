import express from 'express';
import { randomUUID } from 'node:crypto';
import { protect } from '../middleware/auth.js';
import Client from '../models/Client.js';
import { clientDTO, clientEtag, clientPhone, requireClientsReady } from '../services/clients.js';
import { object, OrderError } from '../services/orderInput.js';

const router = express.Router();
router.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set('Cache-Control', 'private, no-store');
  next();
});
router.use(protect, express.json({ limit: '1kb' }));
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
// This first slice deliberately exposes only lookup, not administrative writes.
router.use((_req, _res, next) => next(new OrderError(404, 'NOT_FOUND')));
router.use((error, req, res, _next) => {
  const status = error instanceof OrderError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
  const code = error instanceof OrderError ? error.code : status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : 'SERVICE_UNAVAILABLE';
  res.status(status).json({ error: { code, message: status === 503 ? 'Serviço temporariamente indisponível' : 'Não foi possível concluir a operação',
    ...(error instanceof OrderError ? { fields: error.fields } : {}), requestId: req.requestId } });
});
export default router;
