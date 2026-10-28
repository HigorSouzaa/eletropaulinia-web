import express from 'express';
import { randomUUID } from 'node:crypto';
import { protect, authorize } from '../middleware/auth.js';
import { createOrder, getOrder, orderDTO, mutateOrder, etag, inspectOrderReferences } from '../services/ordersV2.js';
import { listOrders, summaryOrders } from '../services/orderQueries.js';
import { OrderError } from '../services/orderInput.js';

const router = express.Router();
router.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set('Cache-Control', 'private, no-store');
  // Preserve the existing authentication authority and normalize only its errors.
  const json = res.json.bind(res);
  res.json = body => json(res.statusCode >= 400 && !body.error ? { error: {
    code: res.statusCode === 401 ? 'UNAUTHENTICATED' : res.statusCode === 403 ? 'FORBIDDEN' : 'SERVICE_UNAVAILABLE',
    message: body.message, requestId: req.requestId,
  } } : body);
  next();
});
router.use(protect);
router.use(express.json({ limit: '512kb' }));
async function send(res, document, status = 200) {
  document = await inspectOrderReferences(document);
  if (document.schemaVersion === 2) res.set('ETag', etag(document));
  return res.status(status).json({ data: orderDTO(document) });
}
router.post('/', async (req, res, next) => {
  try {
    const result = await createOrder(req.body, req.get('Idempotency-Key'), req.user._id);
    if (result.created) res.location(`/api/v2/orders/${result.document._id}`);
    await send(res, result.document, result.created ? 201 : 200);
  } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try { res.json(await listOrders(req.query)); } catch (error) { next(error); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await summaryOrders(req.query)); } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try { await send(res, await getOrder(req.params.id)); } catch (error) { next(error); }
});
function mutation(operation) {
  return async (req, res, next) => {
    try {
      const result = await mutateOrder(req.params.id, req.get('If-Match'), operation, req.body, req.user._id, req.params.eid);
      if (!result) return res.status(204).end();
      await send(res, result, operation === 'add' ? 201 : 200);
    } catch (error) { next(error); }
  };
}
router.patch('/:id', mutation('patch'));
router.delete('/:id', authorize('admin'), mutation('delete'));
router.post('/:id/equipamentos', mutation('add'));
router.patch('/:id/equipamentos/:eid', mutation('equipment'));
router.delete('/:id/equipamentos/:eid', mutation('remove'));
router.patch('/:id/equipamentos/:eid/garantia', authorize('admin'), mutation('warranty'));
router.put('/:id/equipamentos/:eid/retirada', mutation('pickup'));
router.post('/:id/equipamentos/:eid/correcoes-retirada', mutation('pickupCorrection'));
router.use((_req, _res, next) => next(new OrderError(404, 'NOT_FOUND')));
router.use((error, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  if (error instanceof OrderError) { status = error.status; code = error.code; }
  else if (error.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; }
  else if (error.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; }
  else if (error.code === 50 || /Mongo.*(Network|ServerSelection)|MongooseServerSelection/.test(error.name)) { status = 503; code = 'SERVICE_UNAVAILABLE'; }
  const message = status === 500 ? 'Erro interno do servidor' : status === 503 ? 'Serviço temporariamente indisponível' : 'Não foi possível concluir a operação';
  res.status(status).json({ error: { code, message, ...(error instanceof OrderError ? { fields: error.fields } : {}), requestId: req.requestId } });
});
export default router;
