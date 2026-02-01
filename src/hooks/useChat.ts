import { useState, useCallback, useEffect } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import type { ChatMessage } from '@/types/socket';

export function useChat() {
  const { socket } = useSocketContext();
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
