import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveSpeaker } from './useActiveSpeaker';
import type { RemotePeer } from '../types/webrtc';

describe('useActiveSpeaker', () => {
  let rafCallbacks: Array<FrameRequestCallback> = [];
  let rafId = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];
    rafId = 0;

    // Override requestAnimationFrame to not immediately invoke callback
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return ++rafId;
      })
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((_id: number) => {
        // Just track that it was called
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function createMockStream(): MediaStream {
    return new MediaStream();
  }

  function createMockPeer(id: string, stream: MediaStream | null = null): RemotePeer {
    return {
      id,
      stream,
      screenStream: null,
      connection: {} as RTCPeerConnection,
      videoEnabled: true,
      audioEnabled: true,
    };
  }

  // Helper to run one animation frame wrapped in act()
  function runAnimationFrame() {
    act(() => {
      const callbacks = [...rafCallbacks];
      rafCallbacks = [];
      callbacks.forEach((cb) => cb(performance.now()));
    });
  }

  describe('initial state', () => {
    it('starts with empty speaker levels', () => {
      const { result } = renderHook(() => useActiveSpeaker(null, [], null));

      expect(result.current.speakerLevels.size).toBe(0);
    });

    it('returns speakerLevels as a Map', () => {
      const { result } = renderHook(() => useActiveSpeaker(null, [], null));

      expect(result.current.speakerLevels).toBeInstanceOf(Map);
    });
  });

  describe('with local stream', () => {
    it('creates analyser for local stream', () => {
      const localStream = createMockStream();

      renderHook(() => useActiveSpeaker(localStream, [], 'local-peer-id'));

      // Animation frame should be requested
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('tracks local stream audio level after animation frame', () => {
      const localStream = createMockStream();

      const { result } = renderHook(() => useActiveSpeaker(localStream, [], 'local-peer-id'));

      // Run the animation frame loop once
      runAnimationFrame();

      expect(result.current.speakerLevels.has('local-peer-id')).toBe(true);
    });

    it('does not track without local peer ID', () => {
      const localStream = createMockStream();

      const { result } = renderHook(() => useActiveSpeaker(localStream, [], null));

      runAnimationFrame();

      expect(result.current.speakerLevels.size).toBe(0);
    });
  });

  describe('with peer streams', () => {
    it('tracks peer audio levels', () => {
      const peerStream = createMockStream();
      const peers = [createMockPeer('peer-1', peerStream)];

      const { result } = renderHook(() => useActiveSpeaker(null, peers, null));

      runAnimationFrame();

      expect(result.current.speakerLevels.has('peer-1')).toBe(true);
    });

    it('tracks multiple peer audio levels', () => {
      const peerStream1 = createMockStream();
      const peerStream2 = createMockStream();
      const peers = [createMockPeer('peer-1', peerStream1), createMockPeer('peer-2', peerStream2)];

      const { result } = renderHook(() => useActiveSpeaker(null, peers, null));

      runAnimationFrame();

      expect(result.current.speakerLevels.has('peer-1')).toBe(true);
      expect(result.current.speakerLevels.has('peer-2')).toBe(true);
    });

    it('does not track peers without stream', () => {
      const peers = [createMockPeer('peer-1', null)];

      const { result } = renderHook(() => useActiveSpeaker(null, peers, null));

      runAnimationFrame();

      expect(result.current.speakerLevels.has('peer-1')).toBe(false);
    });
  });

  describe('combined local and peer streams', () => {
    it('tracks both local and peer audio levels', () => {
      const localStream = createMockStream();
      const peerStream = createMockStream();
      const peers = [createMockPeer('peer-1', peerStream)];

      const { result } = renderHook(() => useActiveSpeaker(localStream, peers, 'local-peer-id'));

      runAnimationFrame();

      expect(result.current.speakerLevels.has('local-peer-id')).toBe(true);
      expect(result.current.speakerLevels.has('peer-1')).toBe(true);
    });
  });

  describe('peer changes', () => {
    it('adds tracking when peer with stream joins', () => {
      const localStream = createMockStream();

      const { result, rerender } = renderHook(
        ({ peers }) => useActiveSpeaker(localStream, peers, 'local-peer-id'),
        { initialProps: { peers: [] as RemotePeer[] } }
      );

      runAnimationFrame();
      expect(result.current.speakerLevels.has('peer-1')).toBe(false);

      // Add a new peer
      const newPeerStream = createMockStream();
      const newPeers = [createMockPeer('peer-1', newPeerStream)];

      rerender({ peers: newPeers });
      runAnimationFrame();

      expect(result.current.speakerLevels.has('peer-1')).toBe(true);
    });

    it('removes tracking when peer leaves', () => {
      const localStream = createMockStream();
      const peerStream = createMockStream();
      const initialPeers = [createMockPeer('peer-1', peerStream)];

      const { result, rerender } = renderHook(
        ({ peers }) => useActiveSpeaker(localStream, peers, 'local-peer-id'),
        { initialProps: { peers: initialPeers } }
      );

      runAnimationFrame();
      expect(result.current.speakerLevels.has('peer-1')).toBe(true);

      // Remove the peer
      rerender({ peers: [] });
      runAnimationFrame();

      expect(result.current.speakerLevels.has('peer-1')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('cancels animation frame on unmount', () => {
      const localStream = createMockStream();

      const { unmount } = renderHook(() => useActiveSpeaker(localStream, [], 'local-peer-id'));

      unmount();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('no streams', () => {
    it('handles null local stream and empty peers', () => {
      const { result } = renderHook(() => useActiveSpeaker(null, [], null));

      expect(result.current.speakerLevels.size).toBe(0);
    });

    it('handles local peer ID without stream', () => {
      const { result } = renderHook(() => useActiveSpeaker(null, [], 'local-peer-id'));

      expect(result.current.speakerLevels.size).toBe(0);
    });

    it('does not request animation frame without analysers', () => {
      renderHook(() => useActiveSpeaker(null, [], null));

      // Should not request animation frame with no streams
      expect(rafCallbacks.length).toBe(0);
    });
  });
});
