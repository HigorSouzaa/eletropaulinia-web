import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import ordersV2 from './routes/ordersV2.js';
import employees from './routes/employees.js';

// Importar a aplicação não abre portas nem conecta a um banco.
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const requestId = randomUUID();
  const started = performance.now();
  res.set({ 'X-Request-ID': requestId, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'production' || req.path.startsWith('/health/')) return;
    // Only route templates are logged; never URLs, request bodies, tokens or client IPs.
    console.info(JSON.stringify({ event: 'http', requestId, method: req.method,
      route: req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched',
      status: res.statusCode, durationMs: Math.round(performance.now() - started) }));
  });
  next();
});
const localOrigins = ['http://127.0.0.1:3000', 'http://localhost:3000'];
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (!origin) return next();
  const configured = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const allowed = process.env.NODE_ENV === 'production' ? configured : [...localOrigins, ...configured];
  if (!allowed.includes(origin)) return res.status(403).json({ message: 'Origem não permitida' });
  return next();
});
app.use(cors({ origin: (origin, callback) => callback(null, origin || false) }));
app.get('/health/live', (_req, res) => res.set('Cache-Control', 'no-store').json({ status: 'live' }));
app.get('/health/ready', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return res.status(503).json({ status: 'unavailable' });
  try {
    await (app.locals.readinessProbe || (() => mongoose.connection.db.admin().command({ ping: 1, maxTimeMS: 1000 })))();
    return res.json({ status: 'ready' });
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
});
app.use('/api/v2/orders', ordersV2);
app.use('/api/v2/employees', employees);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.get('/', (_req, res) => {
  res.json({ message: 'API Eletro Paulínia está funcionando!' });
});
app.use((_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Não devolver stack traces ou conteúdo das requisições em erros de parser.
app.use((error, _req, res, _next) => {
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ message: status === 500 ? 'Erro interno do servidor' : 'Requisição inválida' });
});

export default app;
