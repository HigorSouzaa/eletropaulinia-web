import { useRef, useEffect } from 'react';
import { Search, MoreVertical, Phone, Video } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  timestamp?: number;
  unreadCount?: number;
  profilePicUrl?: string | null;
}

interface Message {
  id: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia?: boolean;
  type?: string;
}

interface ChatWindowProps {
  chat: Chat | null;
  messages: Message[];
  onSendMessage: (message: string) => void;
  loading?: boolean;
}

export function ChatWindow({ chat, messages, onSendMessage, loading }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <div className="w-64 h-64 mx-auto mb-8 opacity-20">
            <svg viewBox="0 0 303 172" fill="none">
              <path d="M151.5 0C67.9 0 0 67.9 0 151.5c0 27.9 7.6 54.1 20.8 76.5L0 303l77.1-20.2c21.8 11.9 46.8 18.7 73.4 18.7 83.6 0 151.5-67.9 151.5-151.5S235.1 0 151.5 0z" fill="#00a884"/>
            </svg>
          </div>
          <h2 className="text-2xl text-gray-600 mb-2">WhatsApp Web</h2>
          <p className="text-gray-500">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2]">
      {/* Header */}
      <div className="bg-[#f0f2f5] border-b border-gray-300 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-300">
            {chat.profilePicUrl ? (
              <img 
                src={chat.profilePicUrl} 
                alt={chat.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{chat.name}</h3>
            <p className="text-xs text-gray-600">online</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <Search size={20} />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#efeae2]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23efeae2\'/%3E%3Cpath d=\'M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 90c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z\' fill=\'%23d9dbd5\' fill-opacity=\'0.04\'/%3E%3C/svg%3E")'
      }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isFromMe={message.fromMe}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
}
