import express from 'express';
import {
  getOrders,
  getOrderById
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(protect);
// The v1 writer cannot represent multiple equipment or enforce v2 preconditions.
router.use((req, res, next) => {
  if (['GET', 'HEAD'].includes(req.method)) return next();
  if (req.method === 'DELETE' && req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso não permitido' });
  return res.status(409).json({ message: 'Atualize o cliente para a API v2', code: 'CLIENT_UPGRADE_REQUIRED' });
});

router.get('/', getOrders);
router.get('/:id', getOrderById);

export default router;
