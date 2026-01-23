import { useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, ChatMessage } from '@/types/socket';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseChatOptions {
  socket: TypedSocket | null;
}

export function useChat({ socket }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const sendMessage = useCallback(
    (message: string) => {
      if (socket && message.trim()) {
        socket.emit('chat-message', { message: message.trim() });
      }
    },
    [socket]
  );

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onChatMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on('chat-message', onChatMessage);

    return () => {
      socket.off('chat-message', onChatMessage);
    };
  }, [socket, isOpen]);

  return {
    messages,
    sendMessage,
    isOpen,
    toggleChat,
    closeChat,
    unreadCount,
  };
}
