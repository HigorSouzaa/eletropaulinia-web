import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

// Carregar variáveis de ambiente
dotenv.config();

const createAdmin = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado!');

    // Verificar se admin já existe
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (adminExists) {
      console.log('❌ Usuário admin já existe!');
      process.exit(0);
    }

    // Criar usuário admin
    const admin = await User.create({
      username: 'admin',
      password: 'admin123',
      name: 'Administrador',
      role: 'admin'
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Username:', admin.username);
    console.log('🔑 Password: admin123');
    console.log('👤 Nome:', admin.name);
    console.log('🎯 Role:', admin.role);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
