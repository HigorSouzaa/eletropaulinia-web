import { useState } from 'react';
import { Search, MoreVertical } from 'lucide-react';
import { CheckCheck } from 'lucide-react';

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

interface WhatsAppSidebarProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  loading?: boolean;
}

type FilterType = 'all' | 'unread';

export function WhatsAppSidebar({ chats, selectedChat, onSelectChat, loading }: WhatsAppSidebarProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const truncateMessage = (message: string, maxLength = 40) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const filteredChats = filter === 'unread' 
    ? chats.filter(chat => chat.unreadCount && chat.unreadCount > 0)
    : chats;

  return (
    <div className="w-[350px] bg-white border-r border-gray-300 flex flex-col h-screen">
      {/* Header */}
      <div className="bg-[#f0f2f5] p-4 flex items-center justify-between border-b border-gray-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">U</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar ou começar uma nova conversa"
            className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm outline-none focus:bg-white border border-transparent focus:border-[#00a884]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-[#00a884] text-white' 
              : 'bg-[#f0f2f5] text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'unread' 
              ? 'bg-[#00a884] text-white' 
              : 'bg-[#f0f2f5] text-gray-700 hover:bg-gray-200'
          }`}
        >
          Não lidas
        </button>
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500 text-sm">
              {filter === 'unread' ? 'Nenhuma conversa não lida' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`h-[72px] px-4 flex items-center gap-3 cursor-pointer border-b border-gray-200 transition-colors ${
                selectedChat?.id === chat.id ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f5f5]'
              }`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-300">
                {chat.profilePicUrl ? (
                  <img 
                    src={chat.profilePicUrl} 
                    alt={chat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-lg">
                    {chat.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(chat.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-sm text-gray-600 truncate ${
                    chat.unreadCount ? 'font-semibold' : ''
                  }`}>
                    {chat.lastMessageFromMe && (
                      <CheckCheck size={14} className="inline mr-1 text-blue-500" />
                    )}
                    {truncateMessage(chat.lastMessage || 'Sem mensagens')}
                  </p>
                  {chat.unreadCount && chat.unreadCount > 0 && (
                    <span className="bg-[#00a884] text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
