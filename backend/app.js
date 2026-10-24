import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import ordersV2 from './routes/ordersV2.js';
import employees from './routes/employees.js';

// Importar a aplicação não abre portas nem conecta a um banco.
const app = express();
app.use(cors());
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
