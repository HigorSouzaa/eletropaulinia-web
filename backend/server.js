import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import app from './app.js';

const port = Number(process.env.PORT || 5000);
try {
  if (!process.env.MONGODB_URI || (process.env.JWT_SECRET || '').length < 32) throw new Error('Configuração incompleta');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida');
  await connectDB();
  const server = app.listen(port, () => console.log('API disponível na porta ' + port));
  server.on('error', async () => {
    console.error('Não foi possível abrir a porta da API');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(deadline);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch {
  console.error('Falha ao iniciar API: confira MONGODB_URI, JWT_SECRET (mínimo 32 caracteres), PORT e acesso ao banco');
  await mongoose.disconnect();
  process.exitCode = 1;
}
