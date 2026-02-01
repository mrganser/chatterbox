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

  const startStream = useCallback(async (options?: { video?: boolean; audio?: boolean }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const initialVideo = options?.video ?? true;
    const initialAudio = options?.audio ?? true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Apply initial preferences by disabling tracks if needed
      if (!initialVideo) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
        }
      }
      if (!initialAudio) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
        }
      }

      streamRef.current = stream;
      setState({
        stream,
        videoEnabled: initialVideo,
        audioEnabled: initialAudio,
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
