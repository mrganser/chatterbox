import { useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';
import { useToast } from '@/contexts/ToastContext';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseModerationOptions {
  socket: TypedSocket | null;
  onMuted: () => void;
  onUnmuted: () => void;
  onVideoDisabled: () => void;
  onVideoEnabled: () => void;
  onKicked: () => void;
}

export function useModeration({
  socket,
  onMuted,
  onUnmuted,
  onVideoDisabled,
  onVideoEnabled,
  onKicked,
}: UseModerationOptions) {
  const { showToast } = useToast();

  // Use refs to avoid stale closure issues
  const onMutedRef = useRef(onMuted);
  onMutedRef.current = onMuted;
  const onUnmutedRef = useRef(onUnmuted);
  onUnmutedRef.current = onUnmuted;
  const onVideoDisabledRef = useRef(onVideoDisabled);
  onVideoDisabledRef.current = onVideoDisabled;
  const onVideoEnabledRef = useRef(onVideoEnabled);
  onVideoEnabledRef.current = onVideoEnabled;
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;

  const mutePeer = useCallback(
    (targetPeerId: string) => {
      if (socket) {
        socket.emit('moderation-mute', { targetPeerId });
      }
    },
    [socket]
  );

  const unmutePeer = useCallback(
    (targetPeerId: string) => {
      if (socket) {
        socket.emit('moderation-unmute', { targetPeerId });
      }
    },
    [socket]
  );

  const disableVideoPeer = useCallback(
    (targetPeerId: string) => {
      if (socket) {
        socket.emit('moderation-disable-video', { targetPeerId });
      }
    },
    [socket]
  );

  const enableVideoPeer = useCallback(
    (targetPeerId: string) => {
      if (socket) {
        socket.emit('moderation-enable-video', { targetPeerId });
      }
    },
    [socket]
  );

  const kickPeer = useCallback(
    (targetPeerId: string) => {
      if (socket) {
        socket.emit('moderation-kick', { targetPeerId });
      }
    },
    [socket]
  );

  useEffect(() => {
    if (!socket) return;

    const handleMuted = () => {
      showToast('You have been muted', 'warning');
      onMutedRef.current();
    };

    const handleUnmuted = () => {
      showToast('You have been unmuted', 'default');
      onUnmutedRef.current();
    };

    const handleVideoDisabled = () => {
      showToast('Your camera has been disabled', 'warning');
      onVideoDisabledRef.current();
    };

    const handleVideoEnabled = () => {
      showToast('Your camera has been enabled', 'default');
      onVideoEnabledRef.current();
    };

    const handleKicked = () => {
      showToast('You have been removed from the call', 'destructive');
      // Small delay to let the toast be visible before redirect
      setTimeout(() => {
        onKickedRef.current();
      }, 500);
    };

    socket.on('moderation-mute', handleMuted);
    socket.on('moderation-unmute', handleUnmuted);
    socket.on('moderation-disable-video', handleVideoDisabled);
    socket.on('moderation-enable-video', handleVideoEnabled);
    socket.on('moderation-kick', handleKicked);

    return () => {
      socket.off('moderation-mute', handleMuted);
      socket.off('moderation-unmute', handleUnmuted);
      socket.off('moderation-disable-video', handleVideoDisabled);
      socket.off('moderation-enable-video', handleVideoEnabled);
      socket.off('moderation-kick', handleKicked);
    };
  }, [socket, showToast]);

  return {
    mutePeer,
    unmutePeer,
    disableVideoPeer,
    enableVideoPeer,
    kickPeer,
  };
}
