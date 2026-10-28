import express from 'express';
import { randomUUID } from 'node:crypto';
import { protect, authorize } from '../middleware/auth.js';
import { OrderError } from '../services/orderInput.js';
import { createReceipt, equipmentReceipt, financeSummary, receiptDTO } from '../services/financeReceipts.js';

const router = express.Router();
router.use((req, res, next) => { req.requestId = randomUUID(); res.set('Cache-Control', 'private, no-store'); next(); });
router.use(protect, express.json({ limit: '4kb' }));
router.get('/summary', async (_req, res, next) => {
  try { res.json({ data: await financeSummary() }); } catch (error) { next(error); }
});
router.get('/orders/:orderId/equipment/:equipmentId/receipt', async (req, res, next) => {
  try { res.json({ data: await equipmentReceipt(req.params.orderId, req.params.equipmentId) }); } catch (error) { next(error); }
});
router.post('/receipts', authorize('admin'), async (req, res, next) => {
  try {
    const result = await createReceipt(req.body, req.get('Idempotency-Key'), req.user._id);
    res.status(result.created ? 201 : 200).json({ data: receiptDTO(result.receipt) });
  } catch (error) { next(error); }
});
router.use((_req, _res, next) => next(new OrderError(404, 'NOT_FOUND')));
router.use((error, req, res, _next) => {
  const status = error instanceof OrderError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.code === 20 || /Mongo.*(Network|ServerSelection)|MongooseServerSelection/.test(error.name) ? 503 : 500;
  const code = error instanceof OrderError ? error.code : status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR';
  res.status(status).json({ error: { code, message: status >= 500 ? 'Serviço temporariamente indisponível' : 'Não foi possível concluir a operação', requestId: req.requestId } });
});
export default router;
