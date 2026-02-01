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
    if (localStream && localPeerId && !analysersRef.current.has(localPeerId)) {
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

  // Track analyser count to restart the loop when new analysers are added
  const [analyserCount, setAnalyserCount] = useState(0);

  useEffect(() => {
    setAnalyserCount(analysersRef.current.size);
  }, [localStream, peers, localPeerId]);

  useEffect(() => {
    if (analyserCount === 0) return;

    let animationFrameId: number;

    const checkLevels = () => {
      const levels: SpeakerLevel[] = [];

      analysersRef.current.forEach((analyser, peerId) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        levels.push({ peerId, level: average });
      });

      // Only update state if levels have meaningfully changed
      setSpeakerLevels((prevLevels) => {
        let hasChanged = levels.length !== prevLevels.size;

        if (!hasChanged) {
          for (const { peerId, level } of levels) {
            const prevLevel = prevLevels.get(peerId);
            // Consider changed if difference is > 5 (reduces noise)
            if (prevLevel === undefined || Math.abs(level - prevLevel) > 5) {
              hasChanged = true;
              break;
            }
          }
        }

        if (!hasChanged) {
          return prevLevels;
        }

        const newLevels = new Map<string, number>();
        levels.forEach(({ peerId, level }) => {
          newLevels.set(peerId, level);
        });
        return newLevels;
      });

      animationFrameId = requestAnimationFrame(checkLevels);
    };

    checkLevels();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [analyserCount]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    speakerLevels,
  };
}
