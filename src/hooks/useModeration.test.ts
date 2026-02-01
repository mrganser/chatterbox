import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModeration } from './useModeration';

// Mock useToast
const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

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
    _trigger: (event: string, ...args: unknown[]) => {
      if (listeners[event]) {
        listeners[event].forEach((cb) => cb(...args));
      }
    },
  };
}

describe('useModeration', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockCallbacks: {
    onMuted: ReturnType<typeof vi.fn>;
    onUnmuted: ReturnType<typeof vi.fn>;
    onVideoDisabled: ReturnType<typeof vi.fn>;
    onVideoEnabled: ReturnType<typeof vi.fn>;
    onKicked: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSocket = createMockSocket();
    mockCallbacks = {
      onMuted: vi.fn(),
      onUnmuted: vi.fn(),
      onVideoDisabled: vi.fn(),
      onVideoEnabled: vi.fn(),
      onKicked: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('socket listener registration', () => {
    it('registers all moderation event listeners', () => {
      renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      expect(mockSocket.on).toHaveBeenCalledWith('moderation-mute', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('moderation-unmute', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('moderation-disable-video', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('moderation-enable-video', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('moderation-kick', expect.any(Function));
    });

    it('cleans up listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('moderation-mute', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('moderation-unmute', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('moderation-disable-video', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('moderation-enable-video', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('moderation-kick', expect.any(Function));
    });

    it('does not register listeners without socket', () => {
      renderHook(() =>
        useModeration({
          socket: null,
          ...mockCallbacks,
        })
      );

      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });

  describe('emitting moderation actions', () => {
    it('mutePeer emits moderation-mute event', () => {
      const { result } = renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.mutePeer('target-peer-id');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('moderation-mute', {
        targetPeerId: 'target-peer-id',
      });
    });

    it('unmutePeer emits moderation-unmute event', () => {
      const { result } = renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.unmutePeer('target-peer-id');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('moderation-unmute', {
        targetPeerId: 'target-peer-id',
      });
    });

    it('disableVideoPeer emits moderation-disable-video event', () => {
      const { result } = renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.disableVideoPeer('target-peer-id');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('moderation-disable-video', {
        targetPeerId: 'target-peer-id',
      });
    });

    it('enableVideoPeer emits moderation-enable-video event', () => {
      const { result } = renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.enableVideoPeer('target-peer-id');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('moderation-enable-video', {
        targetPeerId: 'target-peer-id',
      });
    });

    it('kickPeer emits moderation-kick event', () => {
      const { result } = renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.kickPeer('target-peer-id');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('moderation-kick', {
        targetPeerId: 'target-peer-id',
      });
    });

    it('does not emit without socket', () => {
      const { result } = renderHook(() =>
        useModeration({
          socket: null,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.mutePeer('target-peer-id');
        result.current.unmutePeer('target-peer-id');
        result.current.disableVideoPeer('target-peer-id');
        result.current.enableVideoPeer('target-peer-id');
        result.current.kickPeer('target-peer-id');
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('receiving moderation events', () => {
    it('handles moderation-mute event', () => {
      renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        mockSocket._trigger('moderation-mute');
      });

      expect(mockShowToast).toHaveBeenCalledWith('You have been muted', 'warning');
      expect(mockCallbacks.onMuted).toHaveBeenCalled();
    });

    it('handles moderation-unmute event', () => {
      renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        mockSocket._trigger('moderation-unmute');
      });

      expect(mockShowToast).toHaveBeenCalledWith('You have been unmuted', 'default');
      expect(mockCallbacks.onUnmuted).toHaveBeenCalled();
    });

    it('handles moderation-disable-video event', () => {
      renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        mockSocket._trigger('moderation-disable-video');
      });

      expect(mockShowToast).toHaveBeenCalledWith('Your camera has been disabled', 'warning');
      expect(mockCallbacks.onVideoDisabled).toHaveBeenCalled();
    });

    it('handles moderation-enable-video event', () => {
      renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        mockSocket._trigger('moderation-enable-video');
      });

      expect(mockShowToast).toHaveBeenCalledWith('Your camera has been enabled', 'default');
      expect(mockCallbacks.onVideoEnabled).toHaveBeenCalled();
    });

    it('handles moderation-kick event with delay', () => {
      renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      act(() => {
        mockSocket._trigger('moderation-kick');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'You have been removed from the call',
        'destructive'
      );
      // Callback should not be called immediately
      expect(mockCallbacks.onKicked).not.toHaveBeenCalled();

      // Fast-forward timer
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockCallbacks.onKicked).toHaveBeenCalled();
    });
  });

  describe('returned API', () => {
    it('returns all expected functions', () => {
      const { result } = renderHook(() =>
        useModeration({
          socket: mockSocket as any,
          ...mockCallbacks,
        })
      );

      expect(typeof result.current.mutePeer).toBe('function');
      expect(typeof result.current.unmutePeer).toBe('function');
      expect(typeof result.current.disableVideoPeer).toBe('function');
      expect(typeof result.current.enableVideoPeer).toBe('function');
      expect(typeof result.current.kickPeer).toBe('function');
    });
  });
});
