import express from 'express';
import { randomUUID } from 'node:crypto';
import { protect, authorize } from '../middleware/auth.js';
import { OrderError } from '../services/orderInput.js';
import { createReceipt, equipmentReceipt, financeSummary, receiptDTO, voidReceipt } from '../services/financeReceipts.js';
import { equipmentResult, forecast, listReceipts, report } from '../services/financeReports.js';
import { createExpense, createRecurrence, getExpense, listExpenses, listRecurrences, materialize, updateExpense, updateRecurrence } from '../services/financeExpenses.js';

const router = express.Router();
router.use((req, res, next) => { req.requestId = randomUUID(); res.set('Cache-Control', 'private, no-store'); next(); });
router.use(protect, express.json({ limit: '4kb' }));
router.get('/summary', async (_req, res, next) => {
  try { res.json({ data: Object.keys(_req.query).length ? await report(_req.query) : await financeSummary() }); } catch (error) { next(error); }
});
router.get('/forecast', async (req, res, next) => { try { res.json(await forecast(req.query)); } catch (error) { next(error); } });
router.get('/receipts', async (req, res, next) => { try { res.json(await listReceipts(req.query)); } catch (error) { next(error); } });
router.get('/expenses', async (req, res, next) => { try { res.json(await listExpenses(req.query)); } catch (error) { next(error); } });
router.get('/recurrences', async (_req, res, next) => { try { res.json(await listRecurrences()); } catch (error) { next(error); } });
router.get('/orders/:orderId/equipment/:equipmentId/receipt', async (req, res, next) => {
  try { res.json({ data: await equipmentReceipt(req.params.orderId, req.params.equipmentId) }); } catch (error) { next(error); }
});
router.get('/orders/:orderId/equipment/:equipmentId/result', async (req, res, next) => {
  try { res.json({ data: await equipmentResult(req.params.orderId, req.params.equipmentId) }); } catch (error) { next(error); }
});
router.post('/receipts', authorize('admin'), async (req, res, next) => {
  try {
    const result = await createReceipt(req.body, req.get('Idempotency-Key'), req.user._id);
    res.status(result.created ? 201 : 200).json({ data: receiptDTO(result.receipt) });
  } catch (error) { next(error); }
});
router.post('/receipts/:id/void', authorize('admin'), async (req, res, next) => {
  try { const data = await voidReceipt(req.params.id, req.get('If-Match'), req.body, req.user._id); res.set('ETag', `"receipt-${req.params.id}-v${data.version}"`).json({ data }); } catch (error) { next(error); }
});
router.post('/expenses', authorize('admin'), async (req, res, next) => {
  try { const result = await createExpense(req.body, req.get('Idempotency-Key'), req.user._id); res.status(result.created ? 201 : 200).json({ data: result.data }); } catch (error) { next(error); }
});
router.get('/expenses/:id', async (req, res, next) => {
  try { const data = await getExpense(req.params.id); res.set('ETag', `"expense-${req.params.id}-v${data.version}"`).json({ data }); } catch (error) { next(error); }
});
router.patch('/expenses/:id', authorize('admin'), async (req, res, next) => {
  try { const data = await updateExpense(req.params.id, req.get('If-Match'), req.body, req.user._id); res.set('ETag', `"expense-${req.params.id}-v${data.version}"`).json({ data }); } catch (error) { next(error); }
});
router.post('/recurrences', authorize('admin'), async (req, res, next) => {
  try { const result = await createRecurrence(req.body, req.get('Idempotency-Key'), req.user._id); res.status(result.created ? 201 : 200).json({ data: result.data }); } catch (error) { next(error); }
});
router.patch('/recurrences/:id', authorize('admin'), async (req, res, next) => {
  try { const data = await updateRecurrence(req.params.id, req.get('If-Match'), req.body, req.user._id); res.set('ETag', `"recurrence-${req.params.id}-v${data.version}"`).json({ data }); } catch (error) { next(error); }
});
router.post('/recurrences/materialize', authorize('admin'), async (req, res, next) => {
  try { res.json({ data: await materialize(req.body, req.user._id) }); } catch (error) { next(error); }
});
router.use((_req, _res, next) => next(new OrderError(404, 'NOT_FOUND')));
router.use((error, req, res, _next) => {
  const status = error instanceof OrderError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.code === 20 || /Mongo.*(Network|ServerSelection)|MongooseServerSelection/.test(error.name) ? 503 : 500;
  const code = error instanceof OrderError ? error.code : status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR';
  res.status(status).json({ error: { code, message: status >= 500 ? 'Serviço temporariamente indisponível' : 'Não foi possível concluir a operação', requestId: req.requestId } });
});
export default router;
