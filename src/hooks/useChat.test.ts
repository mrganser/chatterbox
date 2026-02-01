import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import type { ChatMessage } from '@/types/socket';

// Create a mock socket
function createMockSocket() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  return {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
    }),
    off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      }
    }),
    emit: vi.fn(),
    // Helper to trigger events for testing
    _trigger: (event: string, ...args: unknown[]) => {
      if (listeners[event]) {
        listeners[event].forEach((cb) => cb(...args));
      }
    },
    _listeners: listeners,
  };
}

// Mock socket that will be used by useSocketContext
let mockSocket: ReturnType<typeof createMockSocket> | null = null;

vi.mock('@/contexts/SocketContext', () => ({
  useSocketContext: () => ({
    socket: mockSocket,
    isConnected: mockSocket !== null,
  }),
}));

describe('useChat', () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
  });

  describe('initial state', () => {
    it('starts with empty messages', () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.messages).toEqual([]);
    });

    it('starts with chat closed', () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.isOpen).toBe(false);
    });

    it('starts with zero unread count', () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('sending messages', () => {
    it('emits chat-message event when sending message', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.sendMessage('Hello world');
      });

      expect(mockSocket!.emit).toHaveBeenCalledWith('chat-message', { message: 'Hello world' });
    });

    it('trims whitespace from messages', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.sendMessage('  Hello  ');
      });

      expect(mockSocket!.emit).toHaveBeenCalledWith('chat-message', { message: 'Hello' });
    });

    it('does not emit for empty messages', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.sendMessage('');
      });

      expect(mockSocket!.emit).not.toHaveBeenCalled();
    });

    it('does not emit for whitespace-only messages', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.sendMessage('   ');
      });

      expect(mockSocket!.emit).not.toHaveBeenCalled();
    });

    it('does not emit when socket is null', () => {
      mockSocket = null;
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.sendMessage('Hello');
      });

      // No error should occur, and obviously no emit
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('receiving messages', () => {
    it('adds received message to messages array', () => {
      const { result } = renderHook(() => useChat());

      const message: ChatMessage = {
        id: '1',
        peerId: 'peer-123',
        message: 'Hello from peer',
        timestamp: Date.now(),
      };

      act(() => {
        mockSocket!._trigger('chat-message', message);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(message);
    });

    it('accumulates multiple messages', () => {
      const { result } = renderHook(() => useChat());

      const message1: ChatMessage = {
        id: '1',
        peerId: 'peer-1',
        message: 'First message',
        timestamp: Date.now(),
      };

      const message2: ChatMessage = {
        id: '2',
        peerId: 'peer-2',
        message: 'Second message',
        timestamp: Date.now() + 1000,
      };

      act(() => {
        mockSocket!._trigger('chat-message', message1);
      });

      act(() => {
        mockSocket!._trigger('chat-message', message2);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual(message1);
      expect(result.current.messages[1]).toEqual(message2);
    });

    it('increments unread count when chat is closed', () => {
      const { result } = renderHook(() => useChat());

      const message: ChatMessage = {
        id: '1',
        peerId: 'peer-123',
        message: 'New message',
        timestamp: Date.now(),
      };

      act(() => {
        mockSocket!._trigger('chat-message', message);
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('does not increment unread count when chat is open', () => {
      const { result } = renderHook(() => useChat());

      // Open chat first
      act(() => {
        result.current.toggleChat();
      });

      const message: ChatMessage = {
        id: '1',
        peerId: 'peer-123',
        message: 'New message',
        timestamp: Date.now(),
      };

      act(() => {
        mockSocket!._trigger('chat-message', message);
      });

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('toggle chat', () => {
    it('opens chat when closed', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.toggleChat();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('closes chat when open', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.toggleChat(); // Open
      });

      act(() => {
        result.current.toggleChat(); // Close
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('clears unread count when opening chat', () => {
      const { result } = renderHook(() => useChat());

      // Receive messages while closed
      const message: ChatMessage = {
        id: '1',
        peerId: 'peer-123',
        message: 'Unread message',
        timestamp: Date.now(),
      };

      act(() => {
        mockSocket!._trigger('chat-message', message);
        mockSocket!._trigger('chat-message', { ...message, id: '2' });
      });

      expect(result.current.unreadCount).toBe(2);

      // Open chat
      act(() => {
        result.current.toggleChat();
      });

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('close chat', () => {
    it('closes an open chat', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.toggleChat(); // Open
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeChat();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('is idempotent when chat is already closed', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.closeChat();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('socket event cleanup', () => {
    it('subscribes to chat-message event on mount', () => {
      renderHook(() => useChat());

      expect(mockSocket!.on).toHaveBeenCalledWith('chat-message', expect.any(Function));
    });

    it('unsubscribes from chat-message event on unmount', () => {
      const { unmount } = renderHook(() => useChat());

      unmount();

      expect(mockSocket!.off).toHaveBeenCalledWith('chat-message', expect.any(Function));
    });
  });

  describe('full chat journey', () => {
    it('handles complete chat workflow', () => {
      const { result } = renderHook(() => useChat());

      // 1. Receive message while chat is closed
      const incomingMessage: ChatMessage = {
        id: '1',
        peerId: 'other-peer',
        message: 'Hey there!',
        timestamp: Date.now(),
      };

      act(() => {
        mockSocket!._trigger('chat-message', incomingMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.unreadCount).toBe(1);

      // 2. Open chat to read message
      act(() => {
        result.current.toggleChat();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.unreadCount).toBe(0);

      // 3. Send a reply
      act(() => {
        result.current.sendMessage('Hi! How are you?');
      });

      expect(mockSocket!.emit).toHaveBeenCalledWith('chat-message', {
        message: 'Hi! How are you?',
      });

      // 4. Receive another message while chat is still open
      const anotherMessage: ChatMessage = {
        id: '2',
        peerId: 'other-peer',
        message: "I'm good, thanks!",
        timestamp: Date.now() + 1000,
      };

      act(() => {
        mockSocket!._trigger('chat-message', anotherMessage);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.unreadCount).toBe(0); // Still 0 because chat is open

      // 5. Close chat
      act(() => {
        result.current.closeChat();
      });

      expect(result.current.isOpen).toBe(false);

      // 6. Receive message after closing
      const finalMessage: ChatMessage = {
        id: '3',
        peerId: 'other-peer',
        message: 'See you later!',
        timestamp: Date.now() + 2000,
      };

      act(() => {
        mockSocket!._trigger('chat-message', finalMessage);
      });

      expect(result.current.messages).toHaveLength(3);
      expect(result.current.unreadCount).toBe(1); // Now increments again
    });
  });
});
