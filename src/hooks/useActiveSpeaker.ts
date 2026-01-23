import { useState, useEffect, useRef, useCallback } from 'react';
import type { RemotePeer } from '@/types/webrtc';

interface SpeakerLevel {
  peerId: string;
  level: number;
}

export function useActiveSpeaker(
  localStream: MediaStream | null,
  peers: RemotePeer[],
  localPeerId: string | null
) {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [speakerLevels, setSpeakerLevels] = useState<Map<string, number>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());

  const createAnalyser = useCallback((stream: MediaStream, peerId: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    analysersRef.current.set(peerId, analyser);
    return analyser;
  }, []);

  useEffect(() => {
    if (localStream && localPeerId) {
      createAnalyser(localStream, localPeerId);
    }

    peers.forEach((peer) => {
      if (peer.stream && !analysersRef.current.has(peer.id)) {
        createAnalyser(peer.stream, peer.id);
      }
    });

    const peerIds = new Set(peers.map((p) => p.id));
    if (localPeerId) peerIds.add(localPeerId);

    analysersRef.current.forEach((_, id) => {
      if (!peerIds.has(id)) {
        analysersRef.current.delete(id);
      }
    });
  }, [localStream, peers, localPeerId, createAnalyser]);

  useEffect(() => {
    let animationFrameId: number;

    const checkLevels = () => {
      const levels: SpeakerLevel[] = [];

      analysersRef.current.forEach((analyser, peerId) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        levels.push({ peerId, level: average });
      });

      const newLevels = new Map<string, number>();
      levels.forEach(({ peerId, level }) => {
        newLevels.set(peerId, level);
      });
      setSpeakerLevels(newLevels);

      const activeSpeaker = levels.filter((l) => l.level > 20).sort((a, b) => b.level - a.level)[0];

      if (activeSpeaker) {
        setActiveSpeakerId(activeSpeaker.peerId);
      }

      animationFrameId = requestAnimationFrame(checkLevels);
    };

    if (analysersRef.current.size > 0) {
      checkLevels();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    activeSpeakerId,
    speakerLevels,
  };
}
