import { Check, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia?: boolean;
  type?: string;
}

interface MessageBubbleProps {
  message: Message;
  isFromMe: boolean;
}

export function MessageBubble({ message, isFromMe }: MessageBubbleProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageText = (text: string) => {
    // Suporte básico para formatação
    return text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/```(.*?)```/g, '<code>$1</code>');
  };

  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
          isFromMe ? 'bg-[#d9fdd3]' : 'bg-white'
        }`}
      >
        <div
          className="text-sm text-gray-900 whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: formatMessageText(message.body) }}
        />
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[11px] text-gray-500">
            {formatTime(message.timestamp)}
          </span>
          {isFromMe && (
            <span className="text-gray-500">
              {message.id ? (
                <CheckCheck size={14} className="text-blue-500" />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
