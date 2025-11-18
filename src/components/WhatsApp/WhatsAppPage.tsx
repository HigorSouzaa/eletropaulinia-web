import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../Layout';
import { WhatsAppSidebar } from './WhatsAppSidebar';
import { ChatWindow } from './ChatWindow';
import { QRCodeModal } from './QRCodeModal';
import socket from '../../services/socket';

interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  timestamp?: number;
  unreadCount?: number;
  profilePicUrl?: string | null;
  lastMessageFromMe?: boolean;
}

interface Message {
  id: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia?: boolean;
  type?: string;
}

export function WhatsAppPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');

  useEffect(() => {
    // Socket listeners
    socket.on('connect', () => {
      console.log('Socket conectado');
      setConnectionStatus('Verificando WhatsApp...');
    });

    socket.on('status', (status: { isReady: boolean; hasClient: boolean }) => {
      console.log('Status recebido:', status);
      if (status.isReady) {
        // WhatsApp já está conectado!
        setIsConnected(true);
        setIsLoading(false);
        setShowQRModal(false);
        setConnectionStatus('Conectado');
        
        // Buscar conversas imediatamente
        setLoadingChats(true);
        socket.emit('get-chats');
      } else if (status.hasClient) {
        // Cliente existe mas não está pronto ainda
        setConnectionStatus('Aguardando WhatsApp...');
      }
    });

    socket.on('qr', (qr: string) => {
      console.log('QR Code recebido');
      setQrCode(qr);
      setShowQRModal(true);
      setIsConnected(false);
      setIsLoading(false);
      setConnectionStatus('Aguardando leitura do QR Code');
    });

    socket.on('authenticated', () => {
      console.log('Autenticado');
      setConnectionStatus('Autenticado, carregando dados...');
    });

    socket.on('loading_screen', (percent: number) => {
      setConnectionStatus(`Carregando WhatsApp... ${percent}%`);
    });

    socket.on('ready', () => {
      console.log('WhatsApp pronto');
      setIsConnected(true);
      setShowQRModal(false);
      setQrCode('');
      setIsLoading(false);
      setConnectionStatus('Conectado');
      
      // Buscar conversas imediatamente
      setLoadingChats(true);
      socket.emit('get-chats');
    });

    socket.on('chats', (chatsList: Chat[]) => {
      console.log('Conversas recebidas:', chatsList.length);
      setChats(chatsList);
      setLoadingChats(false);
    });

    socket.on('messages', (messagesList: Message[]) => {
      console.log('Mensagens recebidas:', messagesList.length);
      setMessages(messagesList);
      setLoadingMessages(false);
    });

    socket.on('message', (newMessage: any) => {
      console.log('Nova mensagem recebida:', newMessage);
      
      // Adicionar mensagem se for do chat atual
      if (selectedChat && newMessage.from === selectedChat.id) {
        setMessages(prev => [...prev, {
          id: newMessage.id,
          body: newMessage.body,
          timestamp: newMessage.timestamp,
          fromMe: newMessage.fromMe,
          hasMedia: newMessage.hasMedia,
          type: newMessage.type
        }]);
      }
      
      // Atualizar última mensagem no chat
      setChats(prev => {
        const chatId = newMessage.from;
        const existingChat = prev.find(c => c.id === chatId);
        
        if (existingChat) {
          // Atualizar chat existente
          return prev.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                lastMessage: newMessage.body,
                timestamp: newMessage.timestamp,
                lastMessageFromMe: newMessage.fromMe,
                unreadCount: newMessage.fromMe || selectedChat?.id === chatId 
                  ? chat.unreadCount 
                  : (chat.unreadCount || 0) + 1
              };
            }
            return chat;
          }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } else {
          // Adicionar novo chat
          const newChat: Chat = {
            id: chatId,
            name: newMessage.chatName || newMessage.contactName || 'Desconhecido',
            isGroup: newMessage.isGroup || false,
            lastMessage: newMessage.body,
            timestamp: newMessage.timestamp,
            lastMessageFromMe: newMessage.fromMe,
            unreadCount: newMessage.fromMe ? 0 : 1
          };
          return [newChat, ...prev];
        }
      });
    });

    socket.on('message_create', (msg: any) => {
      // Evento alternativo para mensagens
      console.log('Mensagem criada:', msg);
      socket.emit('message', msg);
    });

    socket.on('disconnected', (reason: string) => {
      console.log('WhatsApp desconectado:', reason);
      setIsConnected(false);
      setChats([]);
      setMessages([]);
      setSelectedChat(null);
      setIsLoading(true);
      setConnectionStatus('Desconectado');
    });

    socket.on('error', (error: string) => {
      console.error('Erro:', error);
      setConnectionStatus(`Erro: ${error}`);
    });

    // Verificar status inicial
    socket.emit('get-status');

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('status');
      socket.off('qr');
      socket.off('authenticated');
      socket.off('loading_screen');
      socket.off('ready');
      socket.off('chats');
      socket.off('messages');
      socket.off('message');
      socket.off('message_create');
      socket.off('disconnected');
      socket.off('error');
    };
  }, [selectedChat]);

  const handleSelectChat = useCallback((chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setLoadingMessages(true);
    socket.emit('get-messages', chat.id);
    
    // Marcar como lido
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
  }, []);

  const handleSendMessage = useCallback((message: string) => {
    if (selectedChat) {
      // Adicionar mensagem otimisticamente
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        body: message,
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      socket.emit('send-message', {
        chatId: selectedChat.id,
        message
      });
      
      // Atualizar última mensagem no chat
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, lastMessage: message, timestamp: tempMessage.timestamp }
          : chat
      ));
    }
  }, [selectedChat]);

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] bg-[#f0f2f5]">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium text-lg">{connectionStatus}</p>
              <p className="text-gray-500 text-sm mt-2">Isso pode levar alguns segundos...</p>
            </div>
          </div>
        )}

        {!isLoading && isConnected && (
          <div className="flex h-full">
            <WhatsAppSidebar
              chats={chats}
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat}
              loading={loadingChats}
            />
            <ChatWindow
              chat={selectedChat}
              messages={messages}
              onSendMessage={handleSendMessage}
              loading={loadingMessages}
            />
          </div>
        )}

        <QRCodeModal
          qrCode={qrCode}
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
        />
      </div>
    </Layout>
  );
}
