import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import WhatsAppService from './services/whatsapp-service.js';

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao banco de dados
connectDB();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Rota para resetar sessão do WhatsApp
app.post('/api/whatsapp/reset', (req, res) => {
  try {
    whatsappService.restart();
    res.json({ message: 'WhatsApp será reiniciado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API Eletro Paulínia está funcionando!' });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Inicializar WhatsApp Service
const whatsappService = new WhatsAppService(io);
whatsappService.initialize();

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Enviar status imediatamente ao conectar
  const status = whatsappService.getStatus();
  socket.emit('status', status);

  // Buscar conversas
  socket.on('get-chats', async () => {
    try {
      console.log('📋 Requisição: get-chats');
      const chats = await whatsappService.getChats();
      socket.emit('chats', chats);
    } catch (error) {
      console.error('❌ Erro ao buscar conversas:', error);
      socket.emit('error', error.message);
    }
  });

  // Buscar mensagens de uma conversa
  socket.on('get-messages', async (chatId) => {
    try {
      console.log('💬 Requisição: get-messages', chatId);
      const messages = await whatsappService.getMessages(chatId);
      socket.emit('messages', messages);
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      socket.emit('error', error.message);
    }
  });

  // Enviar mensagem
  socket.on('send-message', async ({ chatId, message }) => {
    try {
      console.log('📤 Requisição: send-message');
      const result = await whatsappService.sendMessage(chatId, message);
      socket.emit('message-sent', result);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      socket.emit('error', error.message);
    }
  });

  // Status do WhatsApp
  socket.on('get-status', () => {
    const status = whatsappService.getStatus();
    socket.emit('status', status);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV}`);
  console.log(`Socket.IO configurado e aguardando conexões`);
});
