import express from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(protect);
// The v1 writer cannot represent multiple equipment or enforce v2 preconditions.
router.use((req, res, next) => {
  if (['GET', 'HEAD'].includes(req.method)) return next();
  if (req.method === 'DELETE' && req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso não permitido' });
  return res.status(409).json({ message: 'Atualize o cliente para a API v2', code: 'CLIENT_UPGRADE_REQUIRED' });
});

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrderById)
  .put(updateOrder)
  .delete(authorize('admin'), deleteOrder);

router.patch('/:id/status', updateOrderStatus);

export default router;
