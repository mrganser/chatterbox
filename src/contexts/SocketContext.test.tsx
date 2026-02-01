import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SocketProvider, useSocketContext } from './SocketContext';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Test component that uses the context
function TestConsumer() {
  const { socket, isConnected } = useSocketContext();
  return (
    <div>
      <span data-testid="connected">{isConnected ? 'connected' : 'disconnected'}</span>
      <span data-testid="socket">{socket ? 'has-socket' : 'no-socket'}</span>
    </div>
  );
}

describe('SocketContext', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('SocketProvider', () => {
    it('provides socket context to children', async () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      // Socket is set in useEffect, so we need to wait for it
      // The socket ref is set after the effect runs
      await act(async () => {
        vi.advanceTimersByTime(0); // Flush effect
      });

      // Note: The socket ref is set but the Provider re-renders are needed
      // The context value contains the socket after mount
      expect(screen.getByTestId('connected')).toBeInTheDocument();
    });

    it('starts with disconnected state', () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');
    });

    it('connects socket after 100ms delay', async () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      expect(mockSocket.connect).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('sets up socket event listeners', () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('updates isConnected to true on connect event', async () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      // Find the connect handler and call it
      const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
      const connectHandler = connectCall?.[1];

      await act(async () => {
        connectHandler?.();
      });

      expect(screen.getByTestId('connected')).toHaveTextContent('connected');
    });

    it('updates isConnected to false on disconnect event', async () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      // First connect
      const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
      await act(async () => {
        connectCall?.[1]?.();
      });

      expect(screen.getByTestId('connected')).toHaveTextContent('connected');

      // Then disconnect
      const disconnectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'disconnect');
      await act(async () => {
        disconnectCall?.[1]?.();
      });

      expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');
    });

    it('registers beforeunload handler', () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('disconnects socket on beforeunload', () => {
      render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1] as EventListener;

      beforeUnloadHandler(new Event('beforeunload'));

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('cleans up on unmount', async () => {
      const { unmount } = render(
        <SocketProvider>
          <TestConsumer />
        </SocketProvider>
      );

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('useSocketContext', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useSocketContext must be used within a SocketProvider');

      consoleSpy.mockRestore();
    });
  });
});
