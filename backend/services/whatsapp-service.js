import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';

class WhatsAppService {
  constructor(io) {
    this.io = io;
    this.client = null;
    this.isReady = false;
    this.chatsCache = [];
    this.lastChatsFetch = 0;
    this.CACHE_DURATION = 30000; // 30 segundos
  }

  initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-session',
        clientId: 'eletropaulinia-bot'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    this.setupEventListeners();
    
    // Inicializar com tratamento de erro
    this.client.initialize().catch(err => {
      console.error('❌ Erro ao inicializar WhatsApp:', err);
      this.io.emit('error', 'Erro ao inicializar WhatsApp');
    });
  }

  setupEventListeners() {
    // QR Code
    this.client.on('qr', async (qr) => {
      try {
        const qrImage = await qrcode.toDataURL(qr);
        this.io.emit('qr', qrImage);
        console.log('✅ QR Code gerado');
      } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
      }
    });

    // Autenticação
    this.client.on('authenticated', () => {
      console.log('✅ Cliente autenticado');
      this.io.emit('authenticated');
    });

    // Loading screen
    this.client.on('loading_screen', (percent) => {
      console.log(`📱 Carregando WhatsApp: ${percent}%`);
      this.io.emit('loading_screen', percent);
    });

    // Ready
    this.client.on('ready', async () => {
      this.isReady = true;
      this.io.emit('ready', 'WhatsApp conectado!');
      console.log('✅ WhatsApp conectado e pronto!');
      
      // Sincronizar conversas em background (não esperar)
      this.syncChatsInBackground();
    }); 

    // Nova mensagem (evento principal)
    this.client.on('message', async (msg) => {
      try {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        
        const messageData = {
          id: msg.id._serialized,
          from: msg.from,
          body: msg.body,
          timestamp: msg.timestamp,
          fromMe: msg.fromMe,
          chatName: chat.name,
          contactName: contact.pushname || contact.name,
          isGroup: chat.isGroup,
          hasMedia: msg.hasMedia,
          type: msg.type
        };
        
        this.io.emit('message', messageData);
        console.log('📨 Nova mensagem:', msg.fromMe ? 'Enviada' : 'Recebida');
        
        // Invalidar cache para forçar atualização das conversas
        this.lastChatsFetch = 0;
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    });

    // Mensagem criada (backup)
    this.client.on('message_create', async (msg) => {
      try {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        
        const messageData = {
          id: msg.id._serialized,
          from: msg.from,
          body: msg.body,
          timestamp: msg.timestamp,
          fromMe: msg.fromMe,
          chatName: chat.name,
          contactName: contact.pushname || contact.name,
          isGroup: chat.isGroup,
          hasMedia: msg.hasMedia,
          type: msg.type
        };
        
        this.io.emit('message', messageData);
        
        // Invalidar cache para forçar atualização das conversas
        this.lastChatsFetch = 0;
      } catch (error) {
        console.error('❌ Erro ao processar message_create:', error);
      }
    });

    // Erro de autenticação
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação:', msg);
      this.io.emit('auth_failure', msg);
      this.io.emit('error', 'Falha na autenticação');
    });

    // Desconectado
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      console.log('❌ WhatsApp desconectado:', reason);
      
      // Se foi logout, limpar sessão
      if (reason === 'LOGOUT') {
        console.log('🗑️ Sessão desconectada - será necessário novo QR Code');
      }
      
      this.io.emit('disconnected', reason);
    });

    // Change state
    this.client.on('change_state', (state) => {
      console.log('🔄 Estado alterado:', state);
    });

    // Remote session saved
    this.client.on('remote_session_saved', () => {
      console.log('💾 Sessão remota salva');
    });
  }

  async destroy() {
    if (this.client) {
      try {
        await this.client.destroy();
        this.client = null;
        this.isReady = false;
        console.log('🗑️ Cliente WhatsApp destruído');
      } catch (error) {
        console.error('❌ Erro ao destruir cliente:', error);
      }
    }
  }

  async restart() {
    console.log('🔄 Reiniciando cliente WhatsApp...');
    await this.destroy();
    setTimeout(() => {
      this.initialize();
    }, 2000);
  }

  async syncChatsInBackground() {
    try {
      const chats = await this.fetchAndCacheChats();
      this.io.emit('chats', chats);
      console.log(`✅ ${chats.length} conversas sincronizadas em background`);
    } catch (error) {
      console.error('❌ Erro ao sincronizar conversas em background:', error);
    }
  }

  async fetchAndCacheChats() {
    console.log('🔍 Buscando conversas do WhatsApp...');
    const chats = await this.client.getChats();
    console.log(`✅ ${chats.length} conversas encontradas`);
    
    const formattedChatsPromises = chats
      .filter(chat => chat.lastMessage) // Apenas chats com mensagens
      .map(async (chat) => {
        let profilePicUrl = null;
        let contactName = chat.name;
        
        try {
          // Buscar foto de perfil
          profilePicUrl = await chat.getProfilePicUrl();
        } catch (error) {
          // Foto de perfil não disponível
        }
        
        // Se não for grupo, tentar pegar nome do contato salvo
        if (!chat.isGroup) {
          try {
            const contact = await this.client.getContactById(chat.id._serialized);
            if (contact) {
              // Usar pushname (nome que o contato definiu) ou name (nome salvo)
              contactName = contact.name || contact.pushname || chat.name;
            }
          } catch (error) {
            // Manter o nome padrão
          }
        }
        
        return {
          id: chat.id._serialized,
          name: contactName,
          isGroup: chat.isGroup,
          lastMessage: chat.lastMessage?.body || '',
          timestamp: chat.lastMessage?.timestamp || Date.now(),
          unreadCount: chat.unreadCount || 0,
          profilePicUrl: profilePicUrl,
          lastMessageFromMe: chat.lastMessage?.fromMe || false
        };
      });
    
    const formattedChats = await Promise.all(formattedChatsPromises);
    const sortedChats = formattedChats.sort((a, b) => b.timestamp - a.timestamp); // Ordenar por mais recente
    
    // Atualizar cache
    this.chatsCache = sortedChats;
    this.lastChatsFetch = Date.now();
    console.log(`📋 ${sortedChats.length} conversas formatadas e armazenadas em cache`);
    
    return sortedChats;
  }

  async getChats() {
    if (!this.isReady) {
      console.log('⚠️ WhatsApp não está pronto');
      return [];
    }
    
    // Verificar cache
    const now = Date.now();
    if (this.chatsCache.length > 0 && (now - this.lastChatsFetch) < this.CACHE_DURATION) {
      console.log('✅ Retornando conversas do cache (rápido!)');
      return this.chatsCache;
    }
    
    // Cache expirado ou vazio, buscar novamente
    try {
      return await this.fetchAndCacheChats();
    } catch (error) {
      console.error('❌ Erro ao buscar conversas:', error);
      // Se temos cache antigo, retornar ele mesmo que expirado
      if (this.chatsCache.length > 0) {
        console.log('⚠️ Usando cache expirado devido a erro');
        return this.chatsCache;
      }
      return [];
    }
  }

  async getMessages(chatId, limit = 100) {
    if (!this.isReady) {
      console.log('⚠️ WhatsApp não está pronto');
      return [];
    }
    
    try {
      console.log(`🔍 Buscando mensagens do chat ${chatId}...`);
      const chat = await this.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      console.log(`✅ ${messages.length} mensagens encontradas`);
      
      return messages.map(msg => ({
        id: msg.id._serialized,
        body: msg.body,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        hasMedia: msg.hasMedia,
        type: msg.type
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      return [];
    }
  }

  async sendMessage(chatId, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp não conectado');
    }
    
    try {
      console.log(`📤 Enviando mensagem para ${chatId}...`);
      const result = await this.client.sendMessage(chatId, message);
      console.log('✅ Mensagem enviada com sucesso');
      return { success: true, messageId: result.id._serialized };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      hasClient: !!this.client
    };
  }
}

export default WhatsAppService;
