import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoom } from './useRoom';

// Mock socket
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

let mockSocket: ReturnType<typeof createMockSocket> | null = null;
let mockIsConnected = true;

// Mock useSocketContext
vi.mock('@/contexts/SocketContext', () => ({
  useSocketContext: () => ({
    socket: mockSocket,
    isConnected: mockIsConnected,
  }),
}));

// Mock local stream state
let mockLocalStream = {
  stream: null as MediaStream | null,
  videoEnabled: true,
  audioEnabled: true,
  error: null as string | null,
  startStream: vi.fn(),
  stopStream: vi.fn(),
  toggleVideo: vi.fn(),
  toggleAudio: vi.fn(),
};

vi.mock('./useLocalStream', () => ({
  useLocalStream: () => mockLocalStream,
}));

// Mock screen share state
let mockScreenShare = {
  screenStream: null as MediaStream | null,
  isSharing: false,
  startScreenShare: vi.fn(),
  stopScreenShare: vi.fn(),
};

vi.mock('./useScreenShare', () => ({
  useScreenShare: () => mockScreenShare,
}));

// Mock peer connections
let mockPeerConnections = {
  peers: [] as Array<{ id: string; name?: string }>,
  createOffer: vi.fn(),
  removePeer: vi.fn(),
  closeAllConnections: vi.fn(),
  addScreenTrack: vi.fn(),
  removeScreenTrack: vi.fn(),
  setScreenStreamId: vi.fn(),
  clearScreenStream: vi.fn(),
  setPeerName: vi.fn(),
};

vi.mock('./usePeerConnections', () => ({
  usePeerConnections: () => mockPeerConnections,
}));

// Mock active speaker
vi.mock('./useActiveSpeaker', () => ({
  useActiveSpeaker: () => ({
    speakerLevels: new Map<string, number>(),
  }),
}));

// Mock moderation - capture the callbacks
let moderationCallbacks: {
  onMuted?: () => void;
  onUnmuted?: () => void;
  onVideoDisabled?: () => void;
  onVideoEnabled?: () => void;
  onKicked?: () => void;
} = {};

const mockModeration = {
  mutePeer: vi.fn(),
  unmutePeer: vi.fn(),
  disableVideo: vi.fn(),
  enableVideo: vi.fn(),
  kickPeer: vi.fn(),
};

vi.mock('./useModeration', () => ({
  useModeration: (options: typeof moderationCallbacks & { socket: unknown }) => {
    moderationCallbacks = options;
    return mockModeration;
  },
}));

describe('useRoom', () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
    mockIsConnected = true;
    vi.clearAllMocks();

    // Reset mock states
    mockLocalStream = {
      stream: null,
      videoEnabled: true,
      audioEnabled: true,
      error: null,
      startStream: vi.fn(),
      stopStream: vi.fn(),
      toggleVideo: vi.fn(),
      toggleAudio: vi.fn(),
    };

    mockScreenShare = {
      screenStream: null,
      isSharing: false,
      startScreenShare: vi.fn(),
      stopScreenShare: vi.fn(),
    };

    mockPeerConnections = {
      peers: [],
      createOffer: vi.fn(),
      removePeer: vi.fn(),
      closeAllConnections: vi.fn(),
      addScreenTrack: vi.fn(),
      removeScreenTrack: vi.fn(),
      setScreenStreamId: vi.fn(),
      clearScreenStream: vi.fn(),
      setPeerName: vi.fn(),
    };

    moderationCallbacks = {};
  });

  describe('initial state', () => {
    it('starts with idle room state', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      expect(result.current.roomState).toEqual({
        roomId: null,
        peerId: null,
        status: 'idle',
        error: null,
      });
    });

    it('returns isConnected from socket context', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      expect(result.current.isConnected).toBe(true);
    });

    it('returns empty peers array initially', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      expect(result.current.peers).toEqual([]);
    });

    it('returns wasKicked as false initially', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      expect(result.current.wasKicked).toBe(false);
    });

    it('registers socket event listeners', () => {
      renderHook(() => useRoom('test-room'));

      expect(mockSocket!.on).toHaveBeenCalledWith('room-joined', expect.any(Function));
      expect(mockSocket!.on).toHaveBeenCalledWith('peer-joined', expect.any(Function));
      expect(mockSocket!.on).toHaveBeenCalledWith('peer-left', expect.any(Function));
      expect(mockSocket!.on).toHaveBeenCalledWith('screen-share-started', expect.any(Function));
      expect(mockSocket!.on).toHaveBeenCalledWith('screen-share-stopped', expect.any(Function));
      expect(mockSocket!.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('joinRoom', () => {
    it('sets status to joining and emits join-room event', async () => {
      const mockStream = new MediaStream();
      mockLocalStream.startStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useRoom('test-room', 'TestUser'));

      await act(async () => {
        await result.current.joinRoom();
      });

      expect(mockLocalStream.startStream).toHaveBeenCalledWith({ video: true, audio: true });
      expect(mockSocket!.emit).toHaveBeenCalledWith('join-room', {
        roomId: 'test-room',
        name: 'TestUser',
        videoEnabled: true,
        audioEnabled: true,
      });
    });

    it('respects video/audio options when joining', async () => {
      const mockStream = new MediaStream();
      mockLocalStream.startStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useRoom('test-room'));

      await act(async () => {
        await result.current.joinRoom({ video: false, audio: true });
      });

      expect(mockLocalStream.startStream).toHaveBeenCalledWith({ video: false, audio: true });
      expect(mockSocket!.emit).toHaveBeenCalledWith('join-room', {
        roomId: 'test-room',
        name: undefined,
        videoEnabled: false,
        audioEnabled: true,
      });
    });

    it('sets error state when not connected', async () => {
      mockIsConnected = false;

      const { result } = renderHook(() => useRoom('test-room'));

      await act(async () => {
        await result.current.joinRoom();
      });

      expect(result.current.roomState.status).toBe('error');
      expect(result.current.roomState.error).toBe('Not connected to server');
    });

    it('sets error state when stream fails', async () => {
      mockLocalStream.startStream.mockResolvedValue(null);
      mockLocalStream.error = 'Camera access denied';

      const { result } = renderHook(() => useRoom('test-room'));

      await act(async () => {
        await result.current.joinRoom();
      });

      expect(result.current.roomState.status).toBe('error');
      expect(result.current.roomState.error).toBe('Camera access denied');
    });
  });

  describe('leaveRoom', () => {
    it('emits leave-room and cleans up', async () => {
      const mockStream = new MediaStream();
      mockLocalStream.startStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useRoom('test-room'));

      // Join first
      await act(async () => {
        await result.current.joinRoom();
      });

      act(() => {
        result.current.leaveRoom();
      });

      expect(mockSocket!.emit).toHaveBeenCalledWith('leave-room');
      expect(mockLocalStream.stopStream).toHaveBeenCalled();
      expect(mockScreenShare.stopScreenShare).toHaveBeenCalled();
      expect(mockPeerConnections.closeAllConnections).toHaveBeenCalled();
      expect(result.current.roomState.status).toBe('idle');
    });
  });

  describe('room-joined event', () => {
    it('updates room state and creates offers to existing peers', async () => {
      const { result } = renderHook(() => useRoom('test-room'));

      act(() => {
        mockSocket!._trigger('room-joined', {
          roomId: 'test-room',
          peerId: 'my-peer-id',
          peers: [
            { id: 'peer-1', name: 'Alice', videoEnabled: true, audioEnabled: true },
            { id: 'peer-2', name: 'Bob', videoEnabled: false, audioEnabled: true },
          ],
        });
      });

      expect(result.current.roomState).toEqual({
        roomId: 'test-room',
        peerId: 'my-peer-id',
        status: 'connected',
        error: null,
      });

      expect(mockPeerConnections.createOffer).toHaveBeenCalledTimes(2);
      expect(mockPeerConnections.createOffer).toHaveBeenCalledWith('peer-1', 'Alice', {
        videoEnabled: true,
        audioEnabled: true,
      });
      expect(mockPeerConnections.createOffer).toHaveBeenCalledWith('peer-2', 'Bob', {
        videoEnabled: false,
        audioEnabled: true,
      });
    });
  });

  describe('peer-joined event', () => {
    it('stores peer info via setPeerName', () => {
      renderHook(() => useRoom('test-room'));

      act(() => {
        mockSocket!._trigger('peer-joined', {
          peerId: 'new-peer',
          name: 'Charlie',
          videoEnabled: true,
          audioEnabled: false,
        });
      });

      expect(mockPeerConnections.setPeerName).toHaveBeenCalledWith('new-peer', 'Charlie', {
        videoEnabled: true,
        audioEnabled: false,
      });
    });
  });

  describe('peer-left event', () => {
    it('clears screen sharing state if sharing peer left', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      // Set up screen sharing from a peer
      act(() => {
        mockSocket!._trigger('screen-share-started', {
          peerId: 'sharing-peer',
          streamId: 'stream-123',
        });
      });

      expect(result.current.screenSharingPeerId).toBe('sharing-peer');

      // Peer leaves
      act(() => {
        mockSocket!._trigger('peer-left', { peerId: 'sharing-peer' });
      });

      expect(result.current.screenSharingPeerId).toBeNull();
    });

    it('does not clear screen sharing state if different peer left', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      // Set up screen sharing
      act(() => {
        mockSocket!._trigger('screen-share-started', {
          peerId: 'sharing-peer',
          streamId: 'stream-123',
        });
      });

      // Different peer leaves
      act(() => {
        mockSocket!._trigger('peer-left', { peerId: 'other-peer' });
      });

      expect(result.current.screenSharingPeerId).toBe('sharing-peer');
    });
  });

  describe('screen sharing events', () => {
    it('handles screen-share-started event', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      act(() => {
        mockSocket!._trigger('screen-share-started', {
          peerId: 'peer-1',
          streamId: 'screen-stream-id',
        });
      });

      expect(mockPeerConnections.setScreenStreamId).toHaveBeenCalledWith(
        'peer-1',
        'screen-stream-id'
      );
      expect(result.current.screenSharingPeerId).toBe('peer-1');
    });

    it('handles screen-share-stopped event', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      // Start sharing first
      act(() => {
        mockSocket!._trigger('screen-share-started', {
          peerId: 'peer-1',
          streamId: 'screen-stream-id',
        });
      });

      // Stop sharing
      act(() => {
        mockSocket!._trigger('screen-share-stopped', { peerId: 'peer-1' });
      });

      expect(mockPeerConnections.clearScreenStream).toHaveBeenCalledWith('peer-1');
      expect(result.current.screenSharingPeerId).toBeNull();
    });
  });

  describe('error event', () => {
    it('updates room state with error', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      act(() => {
        mockSocket!._trigger('error', { message: 'Room is full' });
      });

      expect(result.current.roomState.status).toBe('error');
      expect(result.current.roomState.error).toBe('Room is full');
    });
  });

  describe('toggleVideoWithSignal', () => {
    it('toggles video and emits media-state-changed', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      act(() => {
        result.current.localStream.toggleVideo();
      });

      expect(mockLocalStream.toggleVideo).toHaveBeenCalled();
      expect(mockSocket!.emit).toHaveBeenCalledWith('media-state-changed', {
        videoEnabled: false, // Opposite of current state (true)
        audioEnabled: true,
      });
    });
  });

  describe('toggleAudioWithSignal', () => {
    it('toggles audio and emits media-state-changed', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      act(() => {
        result.current.localStream.toggleAudio();
      });

      expect(mockLocalStream.toggleAudio).toHaveBeenCalled();
      expect(mockSocket!.emit).toHaveBeenCalledWith('media-state-changed', {
        videoEnabled: true,
        audioEnabled: false, // Opposite of current state (true)
      });
    });
  });

  describe('screen share with signaling', () => {
    it('startScreenShare adds track and emits signal', async () => {
      const mockScreenStream = new MediaStream();
      Object.defineProperty(mockScreenStream, 'id', { value: 'screen-123' });
      mockScreenShare.startScreenShare.mockResolvedValue(mockScreenStream);

      const { result } = renderHook(() => useRoom('test-room'));

      await act(async () => {
        await result.current.screenShare.startScreenShare();
      });

      expect(mockScreenShare.startScreenShare).toHaveBeenCalled();
      expect(mockPeerConnections.addScreenTrack).toHaveBeenCalledWith(mockScreenStream);
      expect(mockSocket!.emit).toHaveBeenCalledWith('screen-share-started', {
        streamId: 'screen-123',
      });
    });

    it('stopScreenShare removes track and emits signal', async () => {
      const { result } = renderHook(() => useRoom('test-room'));

      await act(async () => {
        await result.current.screenShare.stopScreenShare();
      });

      expect(mockPeerConnections.removeScreenTrack).toHaveBeenCalled();
      expect(mockScreenShare.stopScreenShare).toHaveBeenCalled();
      expect(mockSocket!.emit).toHaveBeenCalledWith('screen-share-stopped');
    });
  });

  describe('moderation callbacks', () => {
    it('handleMuted mutes audio and emits state change', () => {
      mockLocalStream.audioEnabled = true;

      renderHook(() => useRoom('test-room'));

      act(() => {
        moderationCallbacks.onMuted?.();
      });

      expect(mockLocalStream.toggleAudio).toHaveBeenCalled();
      expect(mockSocket!.emit).toHaveBeenCalledWith('media-state-changed', {
        videoEnabled: true,
        audioEnabled: false,
      });
    });

    it('handleMuted does nothing if already muted', () => {
      mockLocalStream.audioEnabled = false;

      renderHook(() => useRoom('test-room'));

      act(() => {
        moderationCallbacks.onMuted?.();
      });

      expect(mockLocalStream.toggleAudio).not.toHaveBeenCalled();
    });

    it('handleUnmuted unmutes audio and emits state change', () => {
      mockLocalStream.audioEnabled = false;

      renderHook(() => useRoom('test-room'));

      act(() => {
        moderationCallbacks.onUnmuted?.();
      });

      expect(mockLocalStream.toggleAudio).toHaveBeenCalled();
      expect(mockSocket!.emit).toHaveBeenCalledWith('media-state-changed', {
        videoEnabled: true,
        audioEnabled: true,
      });
    });

    it('handleVideoDisabled disables video and emits state change', () => {
      mockLocalStream.videoEnabled = true;

      renderHook(() => useRoom('test-room'));

      act(() => {
        moderationCallbacks.onVideoDisabled?.();
      });

      expect(mockLocalStream.toggleVideo).toHaveBeenCalled();
      expect(mockSocket!.emit).toHaveBeenCalledWith('media-state-changed', {
        videoEnabled: false,
        audioEnabled: true,
      });
    });

    it('handleVideoEnabled enables video and emits state change', () => {
      mockLocalStream.videoEnabled = false;

      renderHook(() => useRoom('test-room'));

      act(() => {
        moderationCallbacks.onVideoEnabled?.();
      });

      expect(mockLocalStream.toggleVideo).toHaveBeenCalled();
      expect(mockSocket!.emit).toHaveBeenCalledWith('media-state-changed', {
        videoEnabled: true,
        audioEnabled: true,
      });
    });

    it('handleKicked sets wasKicked to true', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      expect(result.current.wasKicked).toBe(false);

      act(() => {
        moderationCallbacks.onKicked?.();
      });

      expect(result.current.wasKicked).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('cleans up socket listeners on unmount', () => {
      const { unmount } = renderHook(() => useRoom('test-room'));

      unmount();

      expect(mockSocket!.off).toHaveBeenCalledWith('room-joined', expect.any(Function));
      expect(mockSocket!.off).toHaveBeenCalledWith('peer-joined', expect.any(Function));
      expect(mockSocket!.off).toHaveBeenCalledWith('peer-left', expect.any(Function));
      expect(mockSocket!.off).toHaveBeenCalledWith('screen-share-started', expect.any(Function));
      expect(mockSocket!.off).toHaveBeenCalledWith('screen-share-stopped', expect.any(Function));
      expect(mockSocket!.off).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('calls leaveRoom on unmount', () => {
      const { unmount } = renderHook(() => useRoom('test-room'));

      unmount();

      // leaveRoom should be called on unmount
      expect(mockLocalStream.stopStream).toHaveBeenCalled();
      expect(mockScreenShare.stopScreenShare).toHaveBeenCalled();
      expect(mockPeerConnections.closeAllConnections).toHaveBeenCalled();
    });
  });

  describe('returned API', () => {
    it('returns all expected properties and functions', () => {
      const { result } = renderHook(() => useRoom('test-room'));

      expect(result.current).toHaveProperty('roomState');
      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('localStream');
      expect(result.current).toHaveProperty('screenShare');
      expect(result.current).toHaveProperty('screenSharingPeerId');
      expect(result.current).toHaveProperty('peers');
      expect(result.current).toHaveProperty('speakerLevels');
      expect(result.current).toHaveProperty('joinRoom');
      expect(result.current).toHaveProperty('leaveRoom');
      expect(result.current).toHaveProperty('moderation');
      expect(result.current).toHaveProperty('wasKicked');

      expect(typeof result.current.joinRoom).toBe('function');
      expect(typeof result.current.leaveRoom).toBe('function');
      expect(typeof result.current.localStream.toggleVideo).toBe('function');
      expect(typeof result.current.localStream.toggleAudio).toBe('function');
      expect(typeof result.current.screenShare.startScreenShare).toBe('function');
      expect(typeof result.current.screenShare.stopScreenShare).toBe('function');
    });
  });
});
