import { useState, useCallback, useRef, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';
import type { RemotePeer } from '@/types/webrtc';
import { DEFAULT_ICE_SERVERS } from '@/types/webrtc';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UsePeerConnectionsOptions {
  socket: TypedSocket | null;
  localStream: MediaStream | null;
}

export function usePeerConnections({ socket, localStream }: UsePeerConnectionsOptions) {
  const [peers, setPeers] = useState<Map<string, RemotePeer>>(new Map());
  const peersRef = useRef<Map<string, RemotePeer>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);

  localStreamRef.current = localStream;

  // When localStream becomes available, add tracks to peer connections that need them
  useEffect(() => {
    if (!localStream || !socket) return;

    peersRef.current.forEach((peer, peerId) => {
      const senders = peer.connection.getSenders().filter((s) => s.track !== null);
      if (senders.length === 0 && peer.connection.signalingState === 'stable') {
        localStream.getTracks().forEach((track) => {
          peer.connection.addTrack(track, localStream);
        });

        peer.connection
          .createOffer()
          .then((offer) => peer.connection.setLocalDescription(offer))
          .then(() => {
            if (peer.connection.localDescription) {
              socket.emit('offer', {
                to: peerId,
                offer: peer.connection.localDescription,
              });
            }
          })
          .catch(() => {});
      }
    });
  }, [localStream, socket]);

  const createPeerConnection = useCallback(
    (peerId: string, addTracks: boolean = true): RTCPeerConnection => {
      const existingPeer = peersRef.current.get(peerId);
      if (existingPeer) {
        return existingPeer.connection;
      }

      const pc = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS,
        iceCandidatePoolSize: 10,
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const peer = peersRef.current.get(peerId);
        if (!peer) return;

        const stream = event.streams[0] || new MediaStream([event.track]);
        const updatedPeer = { ...peer, stream };
        peersRef.current.set(peerId, updatedPeer);
        setPeers(new Map(peersRef.current));
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          pc.createOffer({ iceRestart: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              if (socket && pc.localDescription) {
                socket.emit('offer', {
                  to: peerId,
                  offer: pc.localDescription,
                });
              }
            })
            .catch(() => {});
        }
      };

      const stream = localStreamRef.current;
      if (stream && addTracks) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      const newPeer: RemotePeer = {
        id: peerId,
        stream: null,
        connection: pc,
      };

      peersRef.current.set(peerId, newPeer);
      setPeers(new Map(peersRef.current));

      return pc;
    },
    [socket]
  );

  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      pendingCandidatesRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
    }
  }, []);

  const processPendingCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current.get(peerId);
    if (pending && pending.length > 0) {
      pendingCandidatesRef.current.delete(peerId);
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Ignore stale candidates
        }
      }
    }
  }, []);

  const createOffer = useCallback(
    async (peerId: string) => {
      if (!localStreamRef.current) {
        createPeerConnection(peerId);
        return;
      }

      const pc = createPeerConnection(peerId);

      if (pc.signalingState !== 'stable') {
        return;
      }

      try {
        const offer = await pc.createOffer();

        if (pc.signalingState !== 'stable') {
          return;
        }

        await pc.setLocalDescription(offer);

        if (socket && pc.localDescription) {
          socket.emit('offer', {
            to: peerId,
            offer: pc.localDescription,
          });
        }
      } catch {
        // Offer creation failed
      }
    },
    [socket, createPeerConnection]
  );

  const handleOffer = useCallback(
    async (peerId: string, offer: RTCSessionDescriptionInit) => {
      try {
        const pc = createPeerConnection(peerId, false);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const stream = localStreamRef.current;
        if (stream) {
          const sendersWithTracks = pc.getSenders().filter((s) => s.track !== null);
          if (sendersWithTracks.length === 0) {
            stream.getTracks().forEach((track) => {
              pc.addTrack(track, stream);
            });
          }
        }

        await processPendingCandidates(peerId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket && pc.localDescription) {
          socket.emit('answer', {
            to: peerId,
            answer: pc.localDescription,
          });
        }
      } catch {
        // Offer handling failed
      }
    },
    [socket, createPeerConnection, processPendingCandidates]
  );

  const handleAnswer = useCallback(
    async (peerId: string, answer: RTCSessionDescriptionInit) => {
      const peer = peersRef.current.get(peerId);
      if (peer && peer.connection.signalingState === 'have-local-offer') {
        try {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
          await processPendingCandidates(peerId, peer.connection);
        } catch {
          // Answer handling failed
        }
      }
    },
    [processPendingCandidates]
  );

  const handleIceCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      if (!peer.connection.remoteDescription) {
        const pending = pendingCandidatesRef.current.get(peerId) || [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(peerId, pending);
        return;
      }
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale candidates
      }
    }
  }, []);

  const closeAllConnections = useCallback(() => {
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();
    setPeers(new Map());
  }, []);

  const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack | null) => {
    peersRef.current.forEach((peer) => {
      const sender = peer.connection.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      handleOffer(from, offer);
    };

    const onAnswer = ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      handleAnswer(from, answer);
    };

    const onIceCandidate = ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      handleIceCandidate(from, candidate);
    };

    const onPeerLeft = ({ peerId }: { peerId: string }) => {
      removePeer(peerId);
    };

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('peer-left', onPeerLeft);

    return () => {
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('peer-left', onPeerLeft);
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, removePeer]);

  return {
    peers: Array.from(peers.values()),
    createOffer,
    removePeer,
    closeAllConnections,
    replaceVideoTrack,
  };
}
