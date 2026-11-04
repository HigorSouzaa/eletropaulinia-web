import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { whatsappWeb, whatsappWebConfigured } from '../services/whatsappWeb.js';

const router = express.Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
router.use(protect);
router.get('/status', (_req, res) => res.json({ data: { ...whatsappWeb.snapshot(), configured: whatsappWebConfigured() } }));
router.use(authorize('admin'));
router.post('/connect', async (_req, res) => {
  if (!whatsappWebConfigured()) return res.status(503).json({ error: { code: 'WHATSAPP_NOT_CONFIGURED' } });
  return res.json({ data: await whatsappWeb.connect() });
});
router.get('/qr', async (_req, res) => {
  const value = whatsappWeb.qrValue();
  if (!value) return res.status(404).json({ error: { code: 'QR_UNAVAILABLE' } });
  const { default: QRCode } = await import('qrcode');
  const image = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 320 });
  return res.json({ data: { image } });
});
router.post('/disconnect', async (_req, res) => res.json({ data: await whatsappWeb.disconnect() }));
export default router;
