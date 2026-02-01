import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStream } from './useLocalStream';

describe('useLocalStream', () => {
  let mockVideoTrack: MediaStreamTrack;
  let mockAudioTrack: MediaStreamTrack;
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock tracks for each test
    mockVideoTrack = {
      kind: 'video',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    mockAudioTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    mockStream = {
      getTracks: vi.fn().mockReturnValue([mockVideoTrack, mockAudioTrack]),
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
    } as unknown as MediaStream;

    // Mock getUserMedia to return our mock stream
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream);
  });

  describe('initial state', () => {
    it('starts with null stream', () => {
      const { result } = renderHook(() => useLocalStream());

      expect(result.current.stream).toBeNull();
    });

    it('starts with video enabled', () => {
      const { result } = renderHook(() => useLocalStream());

      expect(result.current.videoEnabled).toBe(true);
    });

    it('starts with audio enabled', () => {
      const { result } = renderHook(() => useLocalStream());

      expect(result.current.audioEnabled).toBe(true);
    });

    it('starts not loading', () => {
      const { result } = renderHook(() => useLocalStream());

      expect(result.current.isLoading).toBe(false);
    });

    it('starts with no error', () => {
      const { result } = renderHook(() => useLocalStream());

      expect(result.current.error).toBeNull();
    });
  });

  describe('startStream', () => {
    it('sets isLoading while starting', async () => {
      // Make getUserMedia hang so we can check loading state
      let resolveGetUserMedia: (stream: MediaStream) => void;
      vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGetUserMedia = resolve;
          })
      );

      const { result } = renderHook(() => useLocalStream());

      act(() => {
        result.current.startStream();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveGetUserMedia(mockStream);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('calls getUserMedia with video and audio', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true,
      });
    });

    it('returns the stream on success', async () => {
      const { result } = renderHook(() => useLocalStream());

      let returnedStream: MediaStream | null = null;
      await act(async () => {
        returnedStream = await result.current.startStream();
      });

      expect(returnedStream).toBe(mockStream);
      expect(result.current.stream).toBe(mockStream);
    });

    it('starts with video and audio enabled by default', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.videoEnabled).toBe(true);
      expect(result.current.audioEnabled).toBe(true);
      expect(mockVideoTrack.enabled).toBe(true);
      expect(mockAudioTrack.enabled).toBe(true);
    });

    it('respects video: false option', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream({ video: false });
      });

      expect(result.current.videoEnabled).toBe(false);
      expect(mockVideoTrack.enabled).toBe(false);
      expect(result.current.audioEnabled).toBe(true);
    });

    it('respects audio: false option', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream({ audio: false });
      });

      expect(result.current.audioEnabled).toBe(false);
      expect(mockAudioTrack.enabled).toBe(false);
      expect(result.current.videoEnabled).toBe(true);
    });

    it('respects both video: false and audio: false options', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream({ video: false, audio: false });
      });

      expect(result.current.videoEnabled).toBe(false);
      expect(result.current.audioEnabled).toBe(false);
      expect(mockVideoTrack.enabled).toBe(false);
      expect(mockAudioTrack.enabled).toBe(false);
    });

    it('clears previous error on new start', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useLocalStream());

      // First call fails
      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.error).toBe('First error');

      // Second call succeeds
      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.error).toBeNull();
    });

    it('sets error state on getUserMedia failure', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.error).toBe('Permission denied');
      expect(result.current.stream).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('returns null on failure', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => useLocalStream());

      let returnedStream: MediaStream | null = mockStream;
      await act(async () => {
        returnedStream = await result.current.startStream();
      });

      expect(returnedStream).toBeNull();
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.error).toBe('Failed to access media devices');
    });
  });

  describe('stopStream', () => {
    it('stops all tracks', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      act(() => {
        result.current.stopStream();
      });

      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(mockAudioTrack.stop).toHaveBeenCalled();
    });

    it('sets stream to null', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.stream).not.toBeNull();

      act(() => {
        result.current.stopStream();
      });

      expect(result.current.stream).toBeNull();
    });

    it('resets state to defaults', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream({ video: false, audio: false });
      });

      act(() => {
        result.current.stopStream();
      });

      expect(result.current.videoEnabled).toBe(true);
      expect(result.current.audioEnabled).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('does nothing if no stream exists', () => {
      const { result } = renderHook(() => useLocalStream());

      // Should not throw
      act(() => {
        result.current.stopStream();
      });

      expect(result.current.stream).toBeNull();
    });
  });

  describe('toggleVideo', () => {
    it('disables video when enabled', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.videoEnabled).toBe(true);

      act(() => {
        result.current.toggleVideo();
      });

      expect(result.current.videoEnabled).toBe(false);
      expect(mockVideoTrack.enabled).toBe(false);
    });

    it('enables video when disabled', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream({ video: false });
      });

      expect(result.current.videoEnabled).toBe(false);

      act(() => {
        result.current.toggleVideo();
      });

      expect(result.current.videoEnabled).toBe(true);
      expect(mockVideoTrack.enabled).toBe(true);
    });

    it('does nothing if no stream exists', () => {
      const { result } = renderHook(() => useLocalStream());

      // Should not throw
      act(() => {
        result.current.toggleVideo();
      });

      expect(result.current.videoEnabled).toBe(true);
    });
  });

  describe('toggleAudio', () => {
    it('disables audio when enabled', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      expect(result.current.audioEnabled).toBe(true);

      act(() => {
        result.current.toggleAudio();
      });

      expect(result.current.audioEnabled).toBe(false);
      expect(mockAudioTrack.enabled).toBe(false);
    });

    it('enables audio when disabled', async () => {
      const { result } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream({ audio: false });
      });

      expect(result.current.audioEnabled).toBe(false);

      act(() => {
        result.current.toggleAudio();
      });

      expect(result.current.audioEnabled).toBe(true);
      expect(mockAudioTrack.enabled).toBe(true);
    });

    it('does nothing if no stream exists', () => {
      const { result } = renderHook(() => useLocalStream());

      // Should not throw
      act(() => {
        result.current.toggleAudio();
      });

      expect(result.current.audioEnabled).toBe(true);
    });
  });

  describe('cleanup on unmount', () => {
    it('stops stream on unmount', async () => {
      const { result, unmount } = renderHook(() => useLocalStream());

      await act(async () => {
        await result.current.startStream();
      });

      unmount();

      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(mockAudioTrack.stop).toHaveBeenCalled();
    });
  });

  describe('returned API', () => {
    it('returns all expected properties and functions', () => {
      const { result } = renderHook(() => useLocalStream());

      expect(result.current).toHaveProperty('stream');
      expect(result.current).toHaveProperty('videoEnabled');
      expect(result.current).toHaveProperty('audioEnabled');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(typeof result.current.startStream).toBe('function');
      expect(typeof result.current.stopStream).toBe('function');
      expect(typeof result.current.toggleVideo).toBe('function');
      expect(typeof result.current.toggleAudio).toBe('function');
    });
  });
});
