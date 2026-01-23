import { useState, useCallback, useRef, useEffect } from 'react';
import type { LocalStreamState } from '@/types/webrtc';

export function useLocalStream() {
  const [state, setState] = useState<LocalStreamState>({
    stream: null,
    videoEnabled: true,
    audioEnabled: true,
    isLoading: false,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      setState({
        stream,
        videoEnabled: true,
        audioEnabled: true,
        isLoading: false,
        error: null,
      });

      return stream;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to access media devices';
      setState((prev) => ({ ...prev, isLoading: false, error }));
      return null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setState({
        stream: null,
        videoEnabled: true,
        audioEnabled: true,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState((prev) => ({ ...prev, videoEnabled: videoTrack.enabled }));
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState((prev) => ({ ...prev, audioEnabled: audioTrack.enabled }));
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    ...state,
    startStream,
    stopStream,
    toggleVideo,
    toggleAudio,
  };
}
