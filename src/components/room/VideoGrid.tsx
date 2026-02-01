import { VideoTile } from './VideoTile';
import type { RemotePeer } from '@/types/webrtc';

interface ModerationHandlers {
  onMute: (peerId: string) => void;
  onUnmute: (peerId: string) => void;
  onDisableVideo: (peerId: string) => void;
  onEnableVideo: (peerId: string) => void;
  onKick: (peerId: string) => void;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localPeerId: string | null;
  localName?: string;
  peers: RemotePeer[];
  speakerLevels: Map<string, number>;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareStream?: MediaStream | null;
  isScreenSharing?: boolean;
  screenSharingPeerId?: string | null;
  moderation?: ModerationHandlers;
}

export function VideoGrid({
  localStream,
  localPeerId,
  localName,
  peers,
  speakerLevels,
  videoEnabled,
  audioEnabled,
  screenShareStream,
  isScreenSharing,
  screenSharingPeerId,
  moderation,
}: VideoGridProps) {
  const totalParticipants = peers.length + 1;

  // Dynamic grid layout based on participant count - optimized to fill space
  const getGridClass = () => {
    switch (totalParticipants) {
      case 1:
        return 'grid-cols-1 grid-rows-1';
      case 2:
        return 'grid-cols-2 grid-rows-1';
      case 3:
        return 'grid-cols-3 grid-rows-1';
      case 4:
        return 'grid-cols-2 grid-rows-2';
      case 5:
      case 6:
        return 'grid-cols-3 grid-rows-2';
      default:
        return 'grid-cols-3 grid-rows-3 xl:grid-cols-4';
    }
  };

  // Find remote peer who is sharing (if any)
  const remoteSharingPeer = screenSharingPeerId
    ? peers.find((p) => p.id === screenSharingPeerId)
    : null;

  // Presentation mode: screen share takes main area, videos in sidebar
  // Triggers for local screen share OR remote screen share
  const showPresentationMode = (isScreenSharing && screenShareStream) || remoteSharingPeer;

  if (showPresentationMode) {
    // Determine the screen share stream and label
    const presentationStream = isScreenSharing ? screenShareStream : remoteSharingPeer?.stream;
    const sharerName = remoteSharingPeer?.name || `Peer ${remoteSharingPeer?.id.slice(0, 6)}`;
    const presentationLabel = isScreenSharing
      ? 'Your screen'
      : `${sharerName}'s screen`;

    // For remote sharing, exclude the sharing peer from the thumbnails list
    const thumbnailPeers = remoteSharingPeer
      ? peers.filter((p) => p.id !== screenSharingPeerId)
      : peers;

    return (
      <div className="h-full w-full p-4 md:p-6 flex gap-4">
        {/* Main screen share view */}
        <div className="flex-1 min-w-0">
          <VideoTile
            stream={presentationStream || null}
            peerId="screen-share"
            label={presentationLabel}
            isScreenShare
            className="scale-in h-full"
          />
        </div>

        {/* Participant thumbnails sidebar */}
        <div className="w-48 lg:w-56 flex flex-col gap-3 overflow-y-auto">
          {/* Local video tile */}
          <VideoTile
            stream={localStream}
            peerId={localPeerId || 'local'}
            name={localName}
            isLocal
            speakerLevel={speakerLevels.get(localPeerId || '') || 0}
            videoEnabled={videoEnabled}
            audioEnabled={audioEnabled}
            className="scale-in"
            compact
          />

          {/* Remote peer tiles (excluding the one sharing) */}
          {thumbnailPeers.map((peer) => (
            <VideoTile
              key={peer.id}
              stream={peer.stream}
              peerId={peer.id}
              name={peer.name}
              speakerLevel={speakerLevels.get(peer.id) || 0}
              videoEnabled={peer.videoEnabled}
              audioEnabled={peer.audioEnabled}
              className="scale-in"
              compact
              moderation={moderation}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-2 md:p-4 flex items-center justify-center">
      <div className={`grid gap-2 md:gap-3 h-full w-full ${getGridClass()}`}>
        {/* Local video tile */}
        <VideoTile
          stream={localStream}
          peerId={localPeerId || 'local'}
          name={localName}
          isLocal
          speakerLevel={speakerLevels.get(localPeerId || '') || 0}
          videoEnabled={videoEnabled}
          audioEnabled={audioEnabled}
          fill
          className="scale-in"
        />

        {/* Remote peer tiles */}
        {peers.map((peer) => (
          <VideoTile
            key={peer.id}
            stream={peer.stream}
            peerId={peer.id}
            name={peer.name}
            speakerLevel={speakerLevels.get(peer.id) || 0}
            videoEnabled={peer.videoEnabled}
            audioEnabled={peer.audioEnabled}
            fill
            className="scale-in"
            moderation={moderation}
          />
        ))}
      </div>
    </div>
  );
}
