import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScreenShare } from './useScreenShare';

describe('useScreenShare', () => {
  let mockVideoTrack: MediaStreamTrack & { onended: (() => void) | null };
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock track for each test
    mockVideoTrack = {
      kind: 'video',
      stop: vi.fn(),
      onended: null,
    } as unknown as MediaStreamTrack & { onended: (() => void) | null };

    mockStream = {
      id: 'screen-stream-123',
      getTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
    } as unknown as MediaStream;

    // Mock getDisplayMedia
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(mockStream);
  });

  describe('initial state', () => {
    it('starts with null stream', () => {
      const { result } = renderHook(() => useScreenShare());

      expect(result.current.stream).toBeNull();
    });

    it('starts not sharing', () => {
      const { result } = renderHook(() => useScreenShare());

      expect(result.current.isSharing).toBe(false);
    });

    it('starts with no error', () => {
      const { result } = renderHook(() => useScreenShare());

      expect(result.current.error).toBeNull();
    });
  });

  describe('startScreenShare', () => {
    it('calls getDisplayMedia with video and audio', async () => {
      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
        video: true,
        audio: true,
      });
    });

    it('returns the stream on success', async () => {
      const { result } = renderHook(() => useScreenShare());

      let returnedStream: MediaStream | null = null;
      await act(async () => {
        returnedStream = await result.current.startScreenShare();
      });

      expect(returnedStream).toBe(mockStream);
    });

    it('sets stream and isSharing on success', async () => {
      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(result.current.stream).toBe(mockStream);
      expect(result.current.isSharing).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('sets up onended handler on video track', async () => {
      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(mockVideoTrack.onended).not.toBeNull();
    });

    it('returns null when user cancels (NotAllowedError)', async () => {
      const notAllowedError = new Error('User cancelled');
      notAllowedError.name = 'NotAllowedError';
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(notAllowedError);

      const { result } = renderHook(() => useScreenShare());

      let returnedStream: MediaStream | null = mockStream;
      await act(async () => {
        returnedStream = await result.current.startScreenShare();
      });

      expect(returnedStream).toBeNull();
      // Should not set error for user cancellation
      expect(result.current.error).toBeNull();
      expect(result.current.isSharing).toBe(false);
    });

    it('sets error state on other failures', async () => {
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(
        new Error('Screen capture not supported')
      );

      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(result.current.error).toBe('Screen capture not supported');
      expect(result.current.stream).toBeNull();
      expect(result.current.isSharing).toBe(false);
    });

    it('returns null on failure', async () => {
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(new Error('Some error'));

      const { result } = renderHook(() => useScreenShare());

      let returnedStream: MediaStream | null = mockStream;
      await act(async () => {
        returnedStream = await result.current.startScreenShare();
      });

      expect(returnedStream).toBeNull();
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(result.current.error).toBe('Failed to start screen share');
    });
  });

  describe('stopScreenShare', () => {
    it('stops all tracks', async () => {
      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      act(() => {
        result.current.stopScreenShare();
      });

      expect(mockVideoTrack.stop).toHaveBeenCalled();
    });

    it('sets stream to null and isSharing to false', async () => {
      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(result.current.stream).not.toBeNull();
      expect(result.current.isSharing).toBe(true);

      act(() => {
        result.current.stopScreenShare();
      });

      expect(result.current.stream).toBeNull();
      expect(result.current.isSharing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('does nothing if not sharing', () => {
      const { result } = renderHook(() => useScreenShare());

      // Should not throw
      act(() => {
        result.current.stopScreenShare();
      });

      expect(result.current.stream).toBeNull();
      expect(result.current.isSharing).toBe(false);
    });
  });

  describe('track ended handler', () => {
    it('stops sharing when track ends (user clicks browser stop button)', async () => {
      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(result.current.isSharing).toBe(true);

      // Simulate user clicking "Stop sharing" in browser UI
      act(() => {
        mockVideoTrack.onended?.();
      });

      expect(result.current.isSharing).toBe(false);
      expect(result.current.stream).toBeNull();
    });
  });

  describe('cleanup on unmount', () => {
    it('stops stream on unmount', async () => {
      const { result, unmount } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      unmount();

      expect(mockVideoTrack.stop).toHaveBeenCalled();
    });
  });

  describe('returned API', () => {
    it('returns all expected properties and functions', () => {
      const { result } = renderHook(() => useScreenShare());

      expect(result.current).toHaveProperty('stream');
      expect(result.current).toHaveProperty('isSharing');
      expect(result.current).toHaveProperty('error');
      expect(typeof result.current.startScreenShare).toBe('function');
      expect(typeof result.current.stopScreenShare).toBe('function');
    });
  });
});
