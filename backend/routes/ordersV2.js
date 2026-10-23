import express from 'express';
import { randomUUID } from 'node:crypto';
import { protect } from '../middleware/auth.js';
import { createOrder, getOrder, orderDTO } from '../services/ordersV2.js';
import { OrderError } from '../services/orderInput.js';

const router = express.Router();
router.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set('Cache-Control', 'private, no-store');
  // Preserve the existing authentication authority and normalize only its errors.
  const json = res.json.bind(res);
  res.json = body => json(res.statusCode >= 400 && !body.error ? { error: {
    code: res.statusCode === 401 ? 'UNAUTHENTICATED' : 'SERVICE_UNAVAILABLE',
    message: body.message, requestId: req.requestId,
  } } : body);
  next();
});
router.use(protect);
router.use(express.json({ limit: '512kb' }));
function send(res, document, status = 200) {
  res.set('ETag', `"os-${document._id}-v${document.version}"`);
  return res.status(status).json({ data: orderDTO(document) });
}
router.post('/', async (req, res, next) => {
  try {
    const result = await createOrder(req.body, req.get('Idempotency-Key'), req.user._id);
    if (result.created) res.location(`/api/v2/orders/${result.document._id}`);
    send(res, result.document, result.created ? 201 : 200);
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try { send(res, await getOrder(req.params.id)); } catch (error) { next(error); }
});
router.use((_req, _res, next) => next(new OrderError(404, 'NOT_FOUND')));
router.use((error, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  if (error instanceof OrderError) { status = error.status; code = error.code; }
  else if (error.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; }
  else if (error.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; }
  else if (/Mongo.*(Network|ServerSelection)|MongooseServerSelection/.test(error.name)) { status = 503; code = 'SERVICE_UNAVAILABLE'; }
  const message = status === 500 ? 'Erro interno do servidor' : status === 503 ? 'Serviço temporariamente indisponível' : 'Não foi possível concluir a operação';
  res.status(status).json({ error: { code, message, ...(error instanceof OrderError ? { fields: error.fields } : {}), requestId: req.requestId } });
});
export default router;
