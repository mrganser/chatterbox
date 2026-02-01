'use client';

import { useState, useCallback, useEffect, useRef, useMemo, Activity } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useChat } from '@/hooks/useChat';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { VideoGrid } from './VideoGrid';
import { Toolbar } from './Toolbar';
import { ShareDialog } from './ShareDialog';
import { ChatPanel } from './ChatPanel';
import { PreCallActions } from './PreCallActions';
import { RoomError } from './RoomError';
import { LoadingState } from './LoadingState';

interface VideoRoomProps {
  roomId: string;
}

export function VideoRoom({ roomId }: VideoRoomProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [startWithVideo, setStartWithVideo] = useState(true);
  const [startWithAudio, setStartWithAudio] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const room = useRoom(roomId, userName);
  const chat = useChat();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);

  // Show confirmation dialog when user tries to leave while in a call
  const isInCall = room.roomState.status === 'connected';
  useNavigationGuard(isInCall && !room.wasKicked);

  // Refs to avoid stale closures in kick handler
  const leaveRoomRef = useRef(room.leaveRoom);
  leaveRoomRef.current = room.leaveRoom;

  // Handle being kicked - redirect to home
  useEffect(() => {
    if (room.wasKicked) {
      setIsLeaving(true);
      leaveRoomRef.current();
      router.push('/');
    }
  }, [room.wasKicked, router]);

  const handleMouseEnter = useCallback(() => setShowToolbar(true), []);
  const handleMouseLeave = useCallback(() => setShowToolbar(false), []);

  const handleLeave = useCallback(() => {
    setIsLeaving(true);
    room.leaveRoom();
    router.push('/');
  }, [room, router]);

  const handleToggleScreenShare = useCallback(async () => {
    if (room.screenShare.isSharing) {
      await room.screenShare.stopScreenShare();
    } else {
      await room.screenShare.startScreenShare();
    }
  }, [room]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const roomUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Memoize moderation handlers to prevent re-renders of VideoTile children
  const moderation = useMemo(
    () => ({
      onMute: room.moderation.mutePeer,
      onDisableVideo: room.moderation.disableVideoPeer,
      onKick: room.moderation.kickPeer,
    }),
    [room.moderation.mutePeer, room.moderation.disableVideoPeer, room.moderation.kickPeer]
  );

  if (isLeaving) {
    return <LoadingState message="Leaving room..." />;
  }

  if (room.roomState.status === 'error') {
    return <RoomError error={room.roomState.error || 'Unknown error'} onRetry={room.joinRoom} />;
  }

  if (room.roomState.status === 'idle') {
    return (
      <PreCallActions
        roomId={roomId}
        isConnecting={!room.isConnected}
        name={userName}
        onNameChange={setUserName}
        startWithVideo={startWithVideo}
        startWithAudio={startWithAudio}
        onToggleStartWithVideo={() => setStartWithVideo((v) => !v)}
        onToggleStartWithAudio={() => setStartWithAudio((a) => !a)}
        onJoin={() => room.joinRoom({ video: startWithVideo, audio: startWithAudio })}
      />
    );
  }

  if (room.roomState.status === 'joining') {
    return <LoadingState message="Joining room..." />;
  }

  return (
    <div
      className="relative flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 mesh-gradient opacity-50 pointer-events-none" />
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />

      {/* Main content area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Video grid area */}
        <div className="flex-1 overflow-hidden">
          <VideoGrid
            localStream={room.localStream.stream}
            localPeerId={room.roomState.peerId}
            localName={userName}
            peers={room.peers}
            speakerLevels={room.speakerLevels}
            videoEnabled={room.localStream.videoEnabled}
            audioEnabled={room.localStream.audioEnabled}
            screenShareStream={room.screenShare.stream}
            isScreenSharing={room.screenShare.isSharing}
            screenSharingPeerId={room.screenSharingPeerId}
            moderation={moderation}
          />
        </div>

        {/* Chat panel - using Activity to preserve state when hidden */}
        <Activity mode={chat.isOpen ? 'visible' : 'hidden'}>
          <ChatPanel
            messages={chat.messages}
            localPeerId={room.roomState.peerId}
            localName={userName}
            onSendMessage={chat.sendMessage}
            onClose={chat.closeChat}
          />
        </Activity>
      </div>

      {/* Floating toolbar */}
      <Toolbar
        videoEnabled={room.localStream.videoEnabled}
        audioEnabled={room.localStream.audioEnabled}
        isScreenSharing={room.screenShare.isSharing}
        chatUnreadCount={chat.unreadCount}
        visible={showToolbar}
        onToggleVideo={room.localStream.toggleVideo}
        onToggleAudio={room.localStream.toggleAudio}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={chat.toggleChat}
        onShare={() => setShowShareDialog(true)}
        onLeave={handleLeave}
        onFullscreen={handleFullscreen}
      />

      {/* Share dialog */}
      <ShareDialog open={showShareDialog} onOpenChange={setShowShareDialog} roomUrl={roomUrl} />
    </div>
  );
}
