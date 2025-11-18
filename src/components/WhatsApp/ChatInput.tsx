import { Send, Smile, Paperclip } from 'lucide-react';
import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#f0f2f5] p-2 flex items-end gap-2">
      <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
        <Smile size={24} />
      </button>

      <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
        <Paperclip size={24} />
      </button>

      <div className="flex-1 bg-white rounded-lg">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem"
          rows={1}
          className="w-full px-4 py-2 bg-transparent outline-none resize-none max-h-[120px]"
          style={{ minHeight: '40px' }}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className={`p-2 rounded-full transition-colors ${
          message.trim()
            ? 'bg-[#00a884] text-white hover:bg-[#008f6f]'
            : 'text-gray-400'
        }`}
      >
        <Send size={24} />
      </button>
    </div>
  );
}
