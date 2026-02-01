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
  const pendingNamesRef = useRef<Map<string, string | undefined>>(new Map());
  // Track which stream IDs are screen shares (peerId -> streamId)
  const screenStreamIdsRef = useRef<Map<string, string>>(new Map());
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
    (peerId: string, addTracks: boolean = true, peerName?: string): RTCPeerConnection => {
      const existingPeer = peersRef.current.get(peerId);
      if (existingPeer) {
        // Update name if provided and peer exists
        if (peerName && !existingPeer.name) {
          const updatedPeer = { ...existingPeer, name: peerName };
          peersRef.current.set(peerId, updatedPeer);
          setPeers(new Map(peersRef.current));
        }
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
        const screenStreamId = screenStreamIdsRef.current.get(peerId);

        // Check if this stream is the screen share (either known or if it's a second video stream)
        const isScreenStream = screenStreamId && stream.id === screenStreamId;
        const isSecondVideoStream = peer.stream && peer.stream.id !== stream.id && event.track.kind === 'video';

        if (isScreenStream || isSecondVideoStream) {
          // This is a screen share stream
          const updatedPeer = { ...peer, screenStream: stream };
          peersRef.current.set(peerId, updatedPeer);
        } else if (!peer.stream || peer.stream.id === stream.id) {
          // This is the camera stream (first stream or same stream with new track)
          const updatedPeer = { ...peer, stream };
          peersRef.current.set(peerId, updatedPeer);
        }
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

      // Use provided name or check pending names
      const resolvedName = peerName ?? pendingNamesRef.current.get(peerId);
      pendingNamesRef.current.delete(peerId);

      const newPeer: RemotePeer = {
        id: peerId,
        name: resolvedName,
        stream: null,
        screenStream: null,
        connection: pc,
        videoEnabled: true,
        audioEnabled: true,
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
    async (peerId: string, peerName?: string) => {
      if (!localStreamRef.current) {
        createPeerConnection(peerId, true, peerName);
        return;
      }

      const pc = createPeerConnection(peerId, true, peerName);

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

  // Track screen senders so we can remove them later
  const screenSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());

  // Add screen share track to all peer connections
  const addScreenTrack = useCallback(
    async (screenStream: MediaStream) => {
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack || !socket) return;

      const peerEntries = Array.from(peersRef.current.entries());
      for (let i = 0; i < peerEntries.length; i++) {
        const [peerId, peer] = peerEntries[i];
        try {
          const sender = peer.connection.addTrack(screenTrack, screenStream);
          screenSendersRef.current.set(peerId, sender);

          // Need to renegotiate
          if (peer.connection.signalingState === 'stable') {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            socket.emit('offer', {
              to: peerId,
              offer: peer.connection.localDescription!,
            });
          }
        } catch {
          // Failed to add track
        }
      }
    },
    [socket]
  );

  // Remove screen share track from all peer connections
  const removeScreenTrack = useCallback(async () => {
    if (!socket) return;

    const senderEntries = Array.from(screenSendersRef.current.entries());
    for (let i = 0; i < senderEntries.length; i++) {
      const [peerId, sender] = senderEntries[i];
      const peer = peersRef.current.get(peerId);
      if (peer) {
        try {
          peer.connection.removeTrack(sender);

          // Need to renegotiate
          if (peer.connection.signalingState === 'stable') {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            socket.emit('offer', {
              to: peerId,
              offer: peer.connection.localDescription!,
            });
          }
        } catch {
          // Failed to remove track
        }
      }
    }
    screenSendersRef.current.clear();
  }, [socket]);

  // Set the expected screen stream ID for a peer (called when receiving screen-share-started)
  const setScreenStreamId = useCallback((peerId: string, streamId: string) => {
    screenStreamIdsRef.current.set(peerId, streamId);
  }, []);

  // Clear screen stream for a peer (called when receiving screen-share-stopped)
  const clearScreenStream = useCallback((peerId: string) => {
    screenStreamIdsRef.current.delete(peerId);
    const peer = peersRef.current.get(peerId);
    if (peer && peer.screenStream) {
      const updatedPeer = { ...peer, screenStream: null };
      peersRef.current.set(peerId, updatedPeer);
      setPeers(new Map(peersRef.current));
    }
  }, []);

  // Store peer name (used when peer-joined fires before offer is received)
  const setPeerName = useCallback((peerId: string, name?: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      // Peer already exists, update the name
      if (name && !peer.name) {
        const updatedPeer = { ...peer, name };
        peersRef.current.set(peerId, updatedPeer);
        setPeers(new Map(peersRef.current));
      }
    } else {
      // Store name for when peer connection is created
      pendingNamesRef.current.set(peerId, name);
    }
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

    const onMediaStateChanged = ({
      peerId,
      videoEnabled,
      audioEnabled,
    }: {
      peerId: string;
      videoEnabled: boolean;
      audioEnabled: boolean;
    }) => {
      const peer = peersRef.current.get(peerId);
      if (peer) {
        const updatedPeer = { ...peer, videoEnabled, audioEnabled };
        peersRef.current.set(peerId, updatedPeer);
        setPeers(new Map(peersRef.current));
      }
    };

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('peer-left', onPeerLeft);
    socket.on('media-state-changed', onMediaStateChanged);

    return () => {
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('peer-left', onPeerLeft);
      socket.off('media-state-changed', onMediaStateChanged);
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, removePeer]);

  return {
    peers: Array.from(peers.values()),
    createOffer,
    removePeer,
    closeAllConnections,
    addScreenTrack,
    removeScreenTrack,
    setScreenStreamId,
    clearScreenStream,
    setPeerName,
  };
}
