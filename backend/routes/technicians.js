import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
const router = express.Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
router.get('/', protect, async (req, res) => {
  try {
    const page = Number(req.query.page || 1), pageSize = Number(req.query.pageSize || 100);
    if (Object.keys(req.query).some(key => !['page', 'pageSize'].includes(key)) || Object.values(req.query).some(v => typeof v !== 'string') || !Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return res.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
    const total = await User.countDocuments({ active: { $ne: false }, role: { $in: ['admin', 'tecnico'] } }).maxTimeMS(5000);
    const data = await User.find({ active: { $ne: false }, role: { $in: ['admin', 'tecnico'] } }).select('_id name').sort({ name: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).maxTimeMS(5000).lean(); res.json({ data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }); }
  catch { res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE' } }); }
});
export default router;
