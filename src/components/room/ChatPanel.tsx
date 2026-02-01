import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/socket';

interface ChatPanelProps {
  messages: ChatMessage[];
  localPeerId: string | null;
  localName?: string;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, localPeerId, localName, onSendMessage, onClose }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-full w-80 flex-col glass border-l border-border/50 slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Chat</h3>
            <p className="text-xs text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-lg hover:bg-white/5"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 mb-3">
              <MessageCircle className="h-5 w-5 text-primary/50" />
            </div>
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLocal = msg.peerId === localPeerId;
            const showAvatar = index === 0 || messages[index - 1].peerId !== msg.peerId;

            return (
              <div
                key={msg.id}
                className={cn('flex flex-col gap-1', isLocal ? 'items-end' : 'items-start')}
              >
                {showAvatar && (
                  <div
                    className={cn('flex items-center gap-2 mb-1', isLocal && 'flex-row-reverse')}
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isLocal
                          ? 'bg-primary/20 text-primary'
                          : 'bg-glow-secondary/20 text-glow-secondary'
                      )}
                    >
                      {isLocal
                        ? (localName || 'You').slice(0, 1).toUpperCase()
                        : (msg.peerName || msg.peerId).slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {isLocal ? (localName || 'You') : (msg.peerName || `Peer ${msg.peerId.slice(0, 6)}`)}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'group relative max-w-[85%] rounded-2xl px-4 py-2.5',
                    isLocal
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary/80 text-foreground rounded-bl-md border border-border/50'
                  )}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                  <span
                    className={cn(
                      'absolute -bottom-4 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity',
                      isLocal ? 'right-0' : 'left-0',
                      'text-muted-foreground/60'
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-border/50 p-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-secondary/50 border-border/50 focus-visible:ring-primary/50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim()}
            className="shrink-0 btn-lift"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          Messages are ephemeral and not stored
        </p>
      </form>
    </div>
  );
}
