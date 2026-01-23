import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { useLocalStream } from './useLocalStream';
import { useScreenShare } from './useScreenShare';
import { usePeerConnections } from './usePeerConnections';
import { useActiveSpeaker } from './useActiveSpeaker';
import { useChat } from './useChat';
import type { RoomState } from '@/types/room';

export function useRoom(roomId: string) {
  const { socket, isConnected } = useSocket();
  const localStream = useLocalStream();
  const screenShare = useScreenShare();
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: null,
    peerId: null,
    status: 'idle',
    error: null,
  });
  const [screenSharingPeerId, setScreenSharingPeerId] = useState<string | null>(null);

  // Refs to access current state in event handlers
  const screenShareRef = useRef(screenShare);
  screenShareRef.current = screenShare;
  const localStreamRef = useRef(localStream);
  localStreamRef.current = localStream;

  const peerConnections = usePeerConnections({
    socket,
    localStream: localStream.stream,
  });

  const replaceVideoTrackRef = useRef(peerConnections.replaceVideoTrack);
  replaceVideoTrackRef.current = peerConnections.replaceVideoTrack;

  const { activeSpeakerId, speakerLevels } = useActiveSpeaker(
    localStream.stream,
    peerConnections.peers,
    roomState.peerId
  );

  const chat = useChat({ socket });

  const joinRoom = useCallback(async () => {
    if (!socket || !isConnected) {
      setRoomState((prev) => ({ ...prev, status: 'error', error: 'Not connected to server' }));
      return;
    }

    setRoomState((prev) => ({ ...prev, status: 'joining' }));

    const stream = await localStream.startStream();
    if (!stream) {
      setRoomState((prev) => ({
        ...prev,
        status: 'error',
        error: localStream.error || 'Failed to access camera/microphone',
      }));
      return;
    }

    socket.emit('join-room', { roomId });
  }, [socket, isConnected, roomId, localStream]);

  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('leave-room');
    }
    localStream.stopStream();
    screenShare.stopScreenShare();
    peerConnections.closeAllConnections();
    setRoomState({
      roomId: null,
      peerId: null,
      status: 'idle',
      error: null,
    });
  }, [socket, localStream, screenShare, peerConnections]);

  // Notify others when starting screen share
  const startScreenShareWithSignal = useCallback(async () => {
    const stream = await screenShare.startScreenShare();
    if (stream && socket) {
      socket.emit('screen-share-started');
      // Clear any remote sharing state since we're now the presenter
      setScreenSharingPeerId(null);
    }
    return stream;
  }, [screenShare, socket]);

  // Notify others when stopping screen share
  const stopScreenShareWithSignal = useCallback(() => {
    screenShare.stopScreenShare();
    if (socket) {
      socket.emit('screen-share-stopped');
    }
  }, [screenShare, socket]);

  useEffect(() => {
    if (!socket) return;

    const onRoomJoined = ({
      roomId: joinedRoomId,
      peerId,
      peers,
    }: {
      roomId: string;
      peerId: string;
      peers: string[];
    }) => {
      setRoomState({
        roomId: joinedRoomId,
        peerId,
        status: 'connected',
        error: null,
      });

      peers.forEach((existingPeerId) => {
        peerConnections.createOffer(existingPeerId);
      });
    };

    const onPeerJoined = () => {
      // New peer will send us an offer - we just wait and respond
    };

    const onPeerLeft = ({ peerId }: { peerId: string }) => {
      // Clear screen sharing state if the sharing peer left
      setScreenSharingPeerId((current) => (current === peerId ? null : current));
    };

    const onScreenShareStarted = ({ peerId }: { peerId: string }) => {
      // If we were sharing, stop our share and restore camera (new share takes over)
      if (screenShareRef.current.isSharing) {
        screenShareRef.current.stopScreenShare();
        // Restore camera track to peer connections
        const cameraTrack = localStreamRef.current.stream?.getVideoTracks()[0] || null;
        replaceVideoTrackRef.current(cameraTrack);
      }
      setScreenSharingPeerId(peerId);
    };

    const onScreenShareStopped = ({ peerId }: { peerId: string }) => {
      setScreenSharingPeerId((current) => (current === peerId ? null : current));
    };

    const onError = ({ message }: { message: string }) => {
      setRoomState((prev) => ({ ...prev, status: 'error', error: message }));
    };

    socket.on('room-joined', onRoomJoined);
    socket.on('peer-joined', onPeerJoined);
    socket.on('peer-left', onPeerLeft);
    socket.on('screen-share-started', onScreenShareStarted);
    socket.on('screen-share-stopped', onScreenShareStopped);
    socket.on('error', onError);

    return () => {
      socket.off('room-joined', onRoomJoined);
      socket.off('peer-joined', onPeerJoined);
      socket.off('peer-left', onPeerLeft);
      socket.off('screen-share-started', onScreenShareStarted);
      socket.off('screen-share-stopped', onScreenShareStopped);
      socket.off('error', onError);
    };
  }, [socket, peerConnections]);

  // Cleanup on unmount only
  const leaveRoomRef = useRef(leaveRoom);
  leaveRoomRef.current = leaveRoom;

  useEffect(() => {
    return () => {
      leaveRoomRef.current();
    };
  }, []);

  // Wrapped screenShare that includes signaling
  const screenShareWithSignaling = {
    ...screenShare,
    startScreenShare: startScreenShareWithSignal,
    stopScreenShare: stopScreenShareWithSignal,
  };

  return {
    roomState,
    isConnected,
    localStream,
    screenShare: screenShareWithSignaling,
    screenSharingPeerId,
    peers: peerConnections.peers,
    activeSpeakerId,
    speakerLevels,
    chat,
    joinRoom,
    leaveRoom,
    replaceVideoTrack: peerConnections.replaceVideoTrack,
  };
}
