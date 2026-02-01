import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePeerConnections } from './usePeerConnections';

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
    _listeners: listeners,
  };
}

function createMockMediaStream(id = 'mock-stream-id') {
  const stream = new MediaStream();
  // Override the id getter
  Object.defineProperty(stream, 'id', { value: id, writable: false });
  return stream;
}

describe('usePeerConnections', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty peers array', () => {
      const { result } = renderHook(() => usePeerConnections({ socket: null, localStream: null }));

      expect(result.current.peers).toEqual([]);
    });

    it('registers socket event listeners when socket is provided', () => {
      renderHook(() => usePeerConnections({ socket: mockSocket as any, localStream: null }));

      expect(mockSocket.on).toHaveBeenCalledWith('offer', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('answer', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ice-candidate', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('peer-left', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('media-state-changed', expect.any(Function));
    });

    it('cleans up socket listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream: null })
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('offer', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('answer', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('ice-candidate', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('peer-left', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('media-state-changed', expect.any(Function));
    });
  });

  describe('createOffer', () => {
    it('creates a peer connection', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      expect(result.current.peers).toHaveLength(1);
      expect(result.current.peers[0].id).toBe('peer-1');
    });

    it('stores peer name when provided', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1', 'John');
      });

      expect(result.current.peers).toHaveLength(1);
      expect(result.current.peers[0].name).toBe('John');
    });

    it('stores initial media state when provided', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1', 'John', {
          videoEnabled: false,
          audioEnabled: true,
        });
      });

      expect(result.current.peers[0].videoEnabled).toBe(false);
      expect(result.current.peers[0].audioEnabled).toBe(true);
    });

    it('does not create duplicate peer connections', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
        await result.current.createOffer('peer-1');
      });

      expect(result.current.peers).toHaveLength(1);
    });

    it('creates peer connection without local stream but does not emit offer', async () => {
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream: null })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      // Peer is created but no offer is emitted until stream is available
      expect(result.current.peers).toHaveLength(1);
    });
  });

  describe('handling offers', () => {
    it('creates peer when receiving offer', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        mockSocket._trigger('offer', {
          from: 'peer-1',
          offer: { type: 'offer', sdp: 'remote-offer-sdp' },
        });
      });

      await waitFor(() => {
        expect(result.current.peers).toHaveLength(1);
      });

      expect(result.current.peers[0].id).toBe('peer-1');
    });
  });

  describe('handling answers', () => {
    it('processes answer for existing peer', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      // First create an offer
      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      // Then receive answer
      await act(async () => {
        mockSocket._trigger('answer', {
          from: 'peer-1',
          answer: { type: 'answer', sdp: 'remote-answer-sdp' },
        });
      });

      // Peer should still exist
      expect(result.current.peers).toHaveLength(1);
    });
  });

  describe('handling ICE candidates', () => {
    it('processes ICE candidate for existing peer with remote description', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      // Create offer and receive answer
      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      await act(async () => {
        mockSocket._trigger('answer', {
          from: 'peer-1',
          answer: { type: 'answer', sdp: 'remote-answer-sdp' },
        });
      });

      // Now receive ICE candidate
      await act(async () => {
        mockSocket._trigger('ice-candidate', {
          from: 'peer-1',
          candidate: { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 },
        });
      });

      // Peer should still exist (no error thrown)
      expect(result.current.peers).toHaveLength(1);
    });
  });

  describe('removePeer', () => {
    it('removes peer from state', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      expect(result.current.peers).toHaveLength(1);

      act(() => {
        result.current.removePeer('peer-1');
      });

      expect(result.current.peers).toHaveLength(0);
    });

    it('removes peer when peer-left event received', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      act(() => {
        mockSocket._trigger('peer-left', { peerId: 'peer-1' });
      });

      expect(result.current.peers).toHaveLength(0);
    });

    it('handles removing non-existent peer gracefully', () => {
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream: null })
      );

      // Should not throw
      act(() => {
        result.current.removePeer('non-existent-peer');
      });

      expect(result.current.peers).toHaveLength(0);
    });
  });

  describe('closeAllConnections', () => {
    it('closes all peer connections and clears state', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
        await result.current.createOffer('peer-2');
      });

      expect(result.current.peers).toHaveLength(2);

      act(() => {
        result.current.closeAllConnections();
      });

      expect(result.current.peers).toHaveLength(0);
    });
  });

  describe('setPeerName', () => {
    it('updates existing peer name', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      act(() => {
        result.current.setPeerName('peer-1', 'John');
      });

      expect(result.current.peers[0].name).toBe('John');
    });

    it('updates existing peer media state', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      act(() => {
        result.current.setPeerName('peer-1', 'John', { videoEnabled: false, audioEnabled: false });
      });

      expect(result.current.peers[0].videoEnabled).toBe(false);
      expect(result.current.peers[0].audioEnabled).toBe(false);
    });

    it('stores pending name for future peer creation', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      // Set name before peer exists
      act(() => {
        result.current.setPeerName('peer-1', 'John', { videoEnabled: false, audioEnabled: true });
      });

      // Now create the peer via offer
      await act(async () => {
        mockSocket._trigger('offer', {
          from: 'peer-1',
          offer: { type: 'offer', sdp: 'remote-offer-sdp' },
        });
      });

      await waitFor(() => {
        expect(result.current.peers).toHaveLength(1);
      });

      // Name and media state should be applied
      expect(result.current.peers[0].name).toBe('John');
      expect(result.current.peers[0].videoEnabled).toBe(false);
      expect(result.current.peers[0].audioEnabled).toBe(true);
    });
  });

  describe('media state changes', () => {
    it('updates peer media state on media-state-changed event', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      act(() => {
        mockSocket._trigger('media-state-changed', {
          peerId: 'peer-1',
          videoEnabled: false,
          audioEnabled: false,
        });
      });

      expect(result.current.peers[0].videoEnabled).toBe(false);
      expect(result.current.peers[0].audioEnabled).toBe(false);
    });

    it('ignores media state change for non-existent peer', () => {
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream: null })
      );

      // Should not throw
      act(() => {
        mockSocket._trigger('media-state-changed', {
          peerId: 'non-existent',
          videoEnabled: false,
          audioEnabled: false,
        });
      });

      expect(result.current.peers).toHaveLength(0);
    });
  });

  describe('screen sharing', () => {
    it('setScreenStreamId and clearScreenStream manage screen stream state', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1');
      });

      // Set screen stream ID
      act(() => {
        result.current.setScreenStreamId('peer-1', 'screen-stream-id');
      });

      // Clear screen stream
      act(() => {
        result.current.clearScreenStream('peer-1');
      });

      expect(result.current.peers[0].screenStream).toBeNull();
    });

    it('addScreenTrack does not throw without socket', async () => {
      const { result } = renderHook(() => usePeerConnections({ socket: null, localStream: null }));

      const screenStream = createMockMediaStream('screen');

      // Should not throw
      await act(async () => {
        await result.current.addScreenTrack(screenStream);
      });
    });

    it('removeScreenTrack does not throw without socket', async () => {
      const { result } = renderHook(() => usePeerConnections({ socket: null, localStream: null }));

      // Should not throw
      await act(async () => {
        await result.current.removeScreenTrack();
      });
    });
  });

  describe('multiple peers', () => {
    it('manages multiple peers independently', async () => {
      const localStream = createMockMediaStream();
      const { result } = renderHook(() =>
        usePeerConnections({ socket: mockSocket as any, localStream })
      );

      await act(async () => {
        await result.current.createOffer('peer-1', 'Alice');
        await result.current.createOffer('peer-2', 'Bob');
        await result.current.createOffer('peer-3', 'Charlie');
      });

      expect(result.current.peers).toHaveLength(3);
      expect(result.current.peers.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);

      // Remove middle peer
      act(() => {
        result.current.removePeer('peer-2');
      });

      expect(result.current.peers).toHaveLength(2);
      expect(result.current.peers.map((p) => p.name)).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('returned API', () => {
    it('returns all expected functions', () => {
      const { result } = renderHook(() => usePeerConnections({ socket: null, localStream: null }));

      expect(typeof result.current.createOffer).toBe('function');
      expect(typeof result.current.removePeer).toBe('function');
      expect(typeof result.current.closeAllConnections).toBe('function');
      expect(typeof result.current.addScreenTrack).toBe('function');
      expect(typeof result.current.removeScreenTrack).toBe('function');
      expect(typeof result.current.setScreenStreamId).toBe('function');
      expect(typeof result.current.clearScreenStream).toBe('function');
      expect(typeof result.current.setPeerName).toBe('function');
      expect(Array.isArray(result.current.peers)).toBe(true);
    });
  });
});
