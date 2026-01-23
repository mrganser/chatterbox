import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScreenShareState } from '@/types/webrtc';

export function useScreenShare() {
  const [state, setState] = useState<ScreenShareState>({
    stream: null,
    isSharing: false,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  const stopScreenShareInternal = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setState({
        stream: null,
        isSharing: false,
        error: null,
      });
    }
  }, []);

  const stopScreenShareRef = useRef(stopScreenShareInternal);
  stopScreenShareRef.current = stopScreenShareInternal;

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShareRef.current();
      };

      streamRef.current = stream;
      setState({
        stream,
        isSharing: true,
        error: null,
      });

      return stream;
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        return null;
      }
      const error = err instanceof Error ? err.message : 'Failed to start screen share';
      setState((prev) => ({ ...prev, error }));
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScreenShareInternal();
    };
  }, [stopScreenShareInternal]);

  return {
    ...state,
    startScreenShare,
    stopScreenShare: stopScreenShareInternal,
  };
}
