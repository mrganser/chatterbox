import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { useLocalStream } from './useLocalStream';
import { useScreenShare } from './useScreenShare';
import { usePeerConnections } from './usePeerConnections';
import { useActiveSpeaker } from './useActiveSpeaker';
import { useChat } from './useChat';
import { useModeration } from './useModeration';
import type { RoomState } from '@/types/room';

export function useRoom(roomId: string, userName?: string) {
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

  const { speakerLevels } = useActiveSpeaker(
    localStream.stream,
    peerConnections.peers,
    roomState.peerId
  );

  const chat = useChat({ socket });

  // Track if user was kicked
  const [wasKicked, setWasKicked] = useState(false);

  // Moderation handlers
  const handleMuted = useCallback(() => {
    // Mute audio if not already muted
    if (localStreamRef.current.audioEnabled) {
      localStreamRef.current.toggleAudio();
      if (socket) {
        socket.emit('media-state-changed', {
          videoEnabled: localStreamRef.current.videoEnabled,
          audioEnabled: false,
        });
      }
    }
  }, [socket]);

  const handleUnmuted = useCallback(() => {
    // Unmute audio if currently muted
    if (!localStreamRef.current.audioEnabled) {
      localStreamRef.current.toggleAudio();
      if (socket) {
        socket.emit('media-state-changed', {
          videoEnabled: localStreamRef.current.videoEnabled,
          audioEnabled: true,
        });
      }
    }
  }, [socket]);

  const handleVideoDisabled = useCallback(() => {
    // Disable video if not already disabled
    if (localStreamRef.current.videoEnabled) {
      localStreamRef.current.toggleVideo();
      if (socket) {
        socket.emit('media-state-changed', {
          videoEnabled: false,
          audioEnabled: localStreamRef.current.audioEnabled,
        });
      }
    }
  }, [socket]);

  const handleVideoEnabled = useCallback(() => {
    // Enable video if currently disabled
    if (!localStreamRef.current.videoEnabled) {
      localStreamRef.current.toggleVideo();
      if (socket) {
        socket.emit('media-state-changed', {
          videoEnabled: true,
          audioEnabled: localStreamRef.current.audioEnabled,
        });
      }
    }
  }, [socket]);

  const handleKicked = useCallback(() => {
    setWasKicked(true);
  }, []);

  const moderation = useModeration({
    socket,
    onMuted: handleMuted,
    onUnmuted: handleUnmuted,
    onVideoDisabled: handleVideoDisabled,
    onVideoEnabled: handleVideoEnabled,
    onKicked: handleKicked,
  });

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

    socket.emit('join-room', { roomId, name: userName || undefined });
  }, [socket, isConnected, roomId, localStream, userName]);

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

  // Wrap toggle methods to emit media state changes
  const toggleVideoWithSignal = useCallback(() => {
    localStream.toggleVideo();
    if (socket) {
      // toggleVideo changes the state, so we need to use the opposite of current state
      socket.emit('media-state-changed', {
        videoEnabled: !localStream.videoEnabled,
        audioEnabled: localStream.audioEnabled,
      });
    }
  }, [localStream, socket]);

  const toggleAudioWithSignal = useCallback(() => {
    localStream.toggleAudio();
    if (socket) {
      socket.emit('media-state-changed', {
        videoEnabled: localStream.videoEnabled,
        audioEnabled: !localStream.audioEnabled,
      });
    }
  }, [localStream, socket]);

  useEffect(() => {
    if (!socket) return;

    const onRoomJoined = ({
      roomId: joinedRoomId,
      peerId,
      peers,
    }: {
      roomId: string;
      peerId: string;
      peers: Array<{ id: string; name?: string }>;
    }) => {
      setRoomState({
        roomId: joinedRoomId,
        peerId,
        status: 'connected',
        error: null,
      });

      peers.forEach((peer) => {
        peerConnections.createOffer(peer.id, peer.name);
      });
    };

    const onPeerJoined = ({ peerId, name }: { peerId: string; name?: string }) => {
      // Store the peer name so it's available when they send us an offer
      peerConnections.setPeerName(peerId, name);
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

  // Wrapped localStream that includes signaling for media state
  const localStreamWithSignaling = {
    ...localStream,
    toggleVideo: toggleVideoWithSignal,
    toggleAudio: toggleAudioWithSignal,
  };

  return {
    roomState,
    isConnected,
    localStream: localStreamWithSignaling,
    screenShare: screenShareWithSignaling,
    screenSharingPeerId,
    peers: peerConnections.peers,
    speakerLevels,
    chat,
    joinRoom,
    leaveRoom,
    replaceVideoTrack: peerConnections.replaceVideoTrack,
    moderation,
    wasKicked,
  };
}
