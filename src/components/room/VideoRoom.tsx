'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
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
  const room = useRoom(roomId);
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
      leaveRoomRef.current();
      router.push('/');
    }
  }, [room.wasKicked, router]);

  const handleMouseEnter = useCallback(() => setShowToolbar(true), []);
  const handleMouseLeave = useCallback(() => setShowToolbar(false), []);

  const handleLeave = useCallback(() => {
    room.leaveRoom();
    router.push('/');
  }, [room, router]);

  const handleToggleScreenShare = useCallback(async () => {
    if (room.screenShare.isSharing) {
      room.screenShare.stopScreenShare();
      // Restore camera track
      const cameraTrack = room.localStream.stream?.getVideoTracks()[0] || null;
      room.replaceVideoTrack(cameraTrack);
    } else {
      const screenStream = await room.screenShare.startScreenShare();
      if (screenStream) {
        const screenTrack = screenStream.getVideoTracks()[0];
        room.replaceVideoTrack(screenTrack);
      }
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

  if (room.roomState.status === 'error') {
    return <RoomError error={room.roomState.error || 'Unknown error'} onRetry={room.joinRoom} />;
  }

  if (room.roomState.status === 'idle') {
    return (
      <PreCallActions roomId={roomId} isConnecting={!room.isConnected} onJoin={room.joinRoom} />
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
            peers={room.peers}
            speakerLevels={room.speakerLevels}
            videoEnabled={room.localStream.videoEnabled}
            audioEnabled={room.localStream.audioEnabled}
            screenShareStream={room.screenShare.stream}
            isScreenSharing={room.screenShare.isSharing}
            screenSharingPeerId={room.screenSharingPeerId}
            moderation={{
              onMute: room.moderation.mutePeer,
              onUnmute: room.moderation.unmutePeer,
              onDisableVideo: room.moderation.disableVideoPeer,
              onEnableVideo: room.moderation.enableVideoPeer,
              onKick: room.moderation.kickPeer,
            }}
          />
        </div>

        {/* Chat panel */}
        {room.chat.isOpen && (
          <ChatPanel
            messages={room.chat.messages}
            localPeerId={room.roomState.peerId}
            onSendMessage={room.chat.sendMessage}
            onClose={room.chat.closeChat}
          />
        )}
      </div>

      {/* Floating toolbar */}
      <Toolbar
        videoEnabled={room.localStream.videoEnabled}
        audioEnabled={room.localStream.audioEnabled}
        isScreenSharing={room.screenShare.isSharing}
        chatUnreadCount={room.chat.unreadCount}
        visible={showToolbar}
        onToggleVideo={room.localStream.toggleVideo}
        onToggleAudio={room.localStream.toggleAudio}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={room.chat.toggleChat}
        onShare={() => setShowShareDialog(true)}
        onLeave={handleLeave}
        onFullscreen={handleFullscreen}
      />

      {/* Share dialog */}
      <ShareDialog open={showShareDialog} onOpenChange={setShowShareDialog} roomUrl={roomUrl} />
    </div>
  );
}
