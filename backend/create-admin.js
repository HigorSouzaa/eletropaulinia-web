import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import User from './models/User.js';
import { registrationErrors } from './middleware/validateAuth.js';

// Execução manual: nunca chamado no startup ou na suíte de testes.
const input = {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
  name: process.env.ADMIN_NAME,
  role: 'admin',
};
try {
  if (registrationErrors(input).length || !process.env.MONGODB_URI) throw new Error('Configuração inválida');
  await connectDB();
  await User.init();
  if (await User.exists({ role: 'admin' })) {
    console.error('Já existe administrador. Use o cadastro autenticado para provisionar usuários.');
    process.exitCode = 1;
  } else {
    await User.create(input);
    console.log('Administrador inicial criado. Remova as variáveis ADMIN_* do ambiente.');
  }
} catch {
  console.error('Provisionamento não concluído. Confira configuração, conexão e unicidade do usuário.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
